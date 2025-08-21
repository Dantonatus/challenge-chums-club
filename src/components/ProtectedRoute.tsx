import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2, Shield, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer user role checking to prevent deadlocks
          setTimeout(async () => {
            try {
              const { data: roleData, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              
              if (!error && roleData) {
                setUserRole(roleData.role);
                setIsApproved(roleData.role === 'admin' || roleData.role === 'user');
              } else {
                console.error("Error fetching user role:", error);
                setUserRole(null);
                setIsApproved(false);
              }
            } catch (err) {
              console.error("Error in role check:", err);
              setUserRole(null);
              setIsApproved(false);
            }
          }, 0);
        } else {
          setUserRole(null);
          setIsApproved(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer user role checking
        setTimeout(async () => {
          try {
            const { data: roleData, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            if (!error && roleData) {
              setUserRole(roleData.role);
              setIsApproved(roleData.role === 'admin' || roleData.role === 'user');
            } else {
              console.error("Error fetching user role:", error);
              setUserRole(null);
              setIsApproved(false);
            }
          } catch (err) {
            console.error("Error in role check:", err);
            setUserRole(null);
            setIsApproved(false);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      // Clean up auth state
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out error",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendApprovalEmail = async () => {
    if (!user) return;
    
    setResendingEmail(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-notification', {
        body: {
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email sent successfully",
        description: "The approval request has been sent to the administrator.",
      });
    } catch (error) {
      console.error("Error resending approval email:", error);
      toast({
        title: "Failed to send email",
        description: "There was an error sending the approval request. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Verifying Access</h3>
                <p className="text-sm text-muted-foreground">
                  Checking your authentication status...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (!user || !session) {
    return <Navigate to="/auth" replace />;
  }

  // Pending approval
  if (userRole === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
               <div className="text-center space-y-2">
                 <h3 className="text-lg font-semibold">Approval Pending</h3>
                 <p className="text-sm text-muted-foreground">
                   Your account is waiting for administrator approval. 
                   You will receive an email notification once approved.
                 </p>
                 <div className="bg-muted p-3 rounded-lg mt-4">
                   <p className="text-xs text-muted-foreground">
                     <strong>Account:</strong> {user.email}
                   </p>
                 </div>
               </div>
               <div className="w-full space-y-2">
                 <Button 
                   onClick={handleResendApprovalEmail} 
                   disabled={resendingEmail}
                   className="w-full"
                 >
                   {resendingEmail ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Sending...
                     </>
                   ) : (
                     <>
                       <Mail className="mr-2 h-4 w-4" />
                       Resend Approval Email
                     </>
                   )}
                 </Button>
                 <Button onClick={handleSignOut} variant="outline" className="w-full">
                   Sign Out
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not approved (unknown status)
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Access Denied</h3>
                <p className="text-sm text-muted-foreground">
                  Your account status is unclear. Please contact the administrator 
                  for assistance.
                </p>
                <div className="bg-muted p-3 rounded-lg mt-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Account:</strong> {user.email}<br />
                    <strong>Status:</strong> {userRole || 'Unknown'}
                  </p>
                </div>
              </div>
              <Button onClick={handleSignOut} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved user - show protected content
  return <>{children}</>;
};

export default ProtectedRoute;