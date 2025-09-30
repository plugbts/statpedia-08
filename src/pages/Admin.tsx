import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Ban, Gift, Activity, Mail, AlertTriangle, MessageSquare } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { DiscordManagement } from "@/components/admin/discord-management";
import { PromoCodesAdmin } from "@/components/admin/promo-codes-admin";
import { EmailCampaignsAdmin } from "@/components/admin/email-campaigns-admin";
import { TrialAbuseAdmin } from "@/components/admin/trial-abuse-admin";
import { AuditLogs } from "@/components/admin/audit-logs";
import { SocialAdmin } from "@/components/admin/social-admin";

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => r.role === "admin" || r.role === "owner");
      
      if (!hasAdminRole) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users, Discord integrations, and system settings</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="discord">
              <Activity className="h-4 w-4 mr-2" />
              Discord
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Gift className="h-4 w-4 mr-2" />
              Promo Codes
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="h-4 w-4 mr-2" />
              Email Campaigns
            </TabsTrigger>
            <TabsTrigger value="abuse">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Trial Abuse
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Ban className="h-4 w-4 mr-2" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="social">
              <MessageSquare className="h-4 w-4 mr-2" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="discord" className="space-y-4">
            <DiscordManagement />
          </TabsContent>

          <TabsContent value="promos" className="space-y-4">
            <PromoCodesAdmin />
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <EmailCampaignsAdmin />
          </TabsContent>

          <TabsContent value="abuse" className="space-y-4">
            <TrialAbuseAdmin />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <SocialAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
