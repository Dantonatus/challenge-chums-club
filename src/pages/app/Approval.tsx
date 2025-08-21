import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Clock, Shield } from "lucide-react";

interface PendingUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
}

const ApprovalPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check if current user is admin
  useEffect(() => {
    const checkAuth = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      setUserId(id || null);

      if (id) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", id)
          .single();
        setUserRole(roleData?.role || null);
      }
    };
    checkAuth();
  }, []);

  // Fetch pending users
  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      // First get pending user roles
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "pending");

      if (error) throw error;
      if (!userRoles || userRoles.length === 0) return [];

      // Get user profiles
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      // Try to get emails (this requires admin access, might fail)
      const userPromises = userRoles.map(async (userRole) => {
        let email = "Unknown";
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(userRole.user_id);
          email = userData.user?.email || "Unknown";
        } catch {
          // Fallback: try to get from metadata
          email = "Unknown";
        }

        const profile = profiles?.find(p => p.id === userRole.user_id);
        
        return {
          id: userRole.user_id,
          email,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          created_at: userRole.created_at,
          role: "pending"
        };
      });

      const users = await Promise.all(userPromises);
      return users as PendingUser[];
    },
    enabled: userRole === "admin",
  });

  const handleApproveUser = async (targetUserId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('approve-user', {
        body: {
          userId: targetUserId,
          userEmail: userEmail
        }
      });

      if (error) throw error;

      toast({
        title: "User Approved",
        description: `${userEmail} has been approved and can now access the platform.`,
        variant: "default"
      });

      // Refresh the pending users list
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve user. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Only show to admin users
  if (userRole !== "admin") {
    return (
      <section>
        <Helmet>
          <title>Access Denied | Character Challenge</title>
          <meta name="description" content="Access denied - admin privileges required." />
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold text-muted-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
        </div>
      </section>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  return (
    <section>
      <Helmet>
        <title>User Approval | Character Challenge</title>
        <meta name="description" content="Approve pending user registrations." />
        <link rel="canonical" href="/app/approval" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          User Approval
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve pending user registrations
        </p>
      </header>

      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2">Loading pending users...</span>
              </div>
            </CardContent>
          </Card>
        ) : !pendingUsers || pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No Pending Approvals</p>
                <p className="text-sm">All users have been approved.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingUsers.map((user) => {
              const initials = (user.display_name || user.email || "U")
                .split(/\s+/)
                .map(s => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} alt="Avatar" />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            {user.display_name || "No name provided"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            {user.email}
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleApproveUser(user.id, user.email)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Approve User
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Registration Date:</strong> {formatDate(user.created_at)}</p>
                      <p><strong>User ID:</strong> {user.id}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ApprovalPage;