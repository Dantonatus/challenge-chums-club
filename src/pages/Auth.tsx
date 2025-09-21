import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, CheckCircle, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  // Handle auth state changes and check existing session
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle PASSWORD_RECOVERY - do nothing, let PasswordReset page handle it
        if (event === 'PASSWORD_RECOVERY') {
          return;
        }
        
        // Handle SIGNED_IN - check user role and navigate
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Fetch user role
            const { data: userRole, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (error) {
              throw error;
            }

            if (userRole?.role === 'admin' || userRole?.role === 'user') {
              navigate('/app/summary');
            } else if (userRole?.role === 'pending') {
              setMessage("Your account is pending approval. Please wait for an administrator to approve your request.");
              setMessageType("info");
              // Sign out pending users
              await supabase.auth.signOut();
            } else {
              setMessage("Account not found or access denied. Please contact support.");
              setMessageType("error");
            }
          } catch (error: any) {
            console.error('Error checking user role:', error);
            setMessage("Failed to verify account status. Please try again or contact support.");
            setMessageType("error");
            toast({
              title: "Authentication Error",
              description: "Failed to verify your account status.",
              variant: "destructive"
            });
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setMessage("");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const cleanupAuthState = () => {
    // Remove all auth-related keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        try {
          await supabase.rpc('log_security_event', {
            event_type: 'login_failed',
            user_id_param: null,
            metadata_param: {
              email,
              error: error.message,
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.warn('Failed to log security event:', logError);
        }
        throw error;
      }

      if (data.user) {
        // Check user approval status
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (userRole?.role === 'admin' || userRole?.role === 'user') {
          // Log successful login
          try {
            await supabase.rpc('log_security_event', {
              event_type: 'login_success',
              user_id_param: data.user.id,
              metadata_param: {
                email,
                role: userRole.role,
                timestamp: new Date().toISOString()
              }
            });
          } catch (logError) {
            console.warn('Failed to log security event:', logError);
          }

          toast({
            title: "Successfully signed in!",
            description: "Welcome back to the platform.",
          });
          window.location.href = '/app/summary';
        } else if (userRole?.role === 'pending') {
          setMessage("Your account is pending approval. You will receive an email once approved by the administrator.");
          setMessageType("info");
          await supabase.auth.signOut();
        } else {
          setMessage("Account status unclear. Please contact the administrator.");
          setMessageType("error");
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      setMessage(error.message || "An error occurred during sign in");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Clean up existing state
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://habitbattle.lovable.app/auth',
          data: {
            display_name: displayName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Send admin notification
        try {
          const { error: notificationError } = await supabase.functions.invoke('send-admin-notification', {
            body: {
              userId: data.user.id,
              userEmail: email,
              userName: displayName
            }
          });

          if (notificationError) {
            console.error("Error sending admin notification:", notificationError);
          }
        } catch (notificationError) {
          console.error("Failed to send admin notification:", notificationError);
        }

        setMessage("Account created successfully! Your registration has been sent to the administrator for approval. You will receive an email once approved.");
        setMessageType("success");
        
        // Clear form
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setDisplayName("");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      setMessage(error.message || "An error occurred during sign up");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };


  const getMessageIcon = () => {
    switch (messageType) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Helmet>
        <title>Secure Access - Challenge Management System</title>
        <meta name="description" content="Secure login to the Challenge Management System. Admin approval required for new accounts." />
      </Helmet>
      
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Secure Access</h1>
          <p className="text-muted-foreground">
            Protected Challenge Management System
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={messageType === "error" ? "border-destructive" : messageType === "success" ? "border-green-500" : "border-blue-500"}>
            {getMessageIcon()}
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Auth Forms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Authentication Required</CardTitle>
            <CardDescription className="text-center">
              Only approved members can access this platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="space-x-2">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </TabsTrigger>
                <TabsTrigger value="signup" className="space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                   <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Signing In...
                       </>
                     ) : (
                       <>
                         <LogIn className="mr-2 h-4 w-4" />
                         Sign In
                       </>
                     )}
                   </Button>
                   
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Display Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <Alert className="border-yellow-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Admin Approval Required:</strong> Your account will be reviewed by the administrator before you can access the platform.
                    </AlertDescription>
                  </Alert>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Request Access
                      </>
                    )}
                   </Button>
                   
                   <div className="text-center">
                     <Button 
                       variant="ghost" 
                       className="text-primary hover:text-primary/80 underline" 
                       onClick={async () => {
                         setLoading(true);
                         setMessage("");
                         try {
                           await supabase.auth.resetPasswordForEmail(email, {
                             redirectTo: "https://habitbattle.lovable.app/auth/reset",
                           });
                           setMessage("Reset-E-Mail wurde gesendet! Bitte überprüfen Sie Ihr Postfach.");
                           setMessageType("success");
                         } catch (error: any) {
                           setMessage("Fehler beim Senden der Reset-E-Mail. Bitte versuchen Sie es erneut.");
                           setMessageType("error");
                         } finally {
                           setLoading(false);
                         }
                       }}
                       disabled={loading || !email}
                     >
                       Passwort vergessen?
                     </Button>
                   </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Security Notice</p>
                <p className="text-xs text-muted-foreground">
                  This platform requires administrator approval for new accounts. 
                  All activities are monitored for security purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;