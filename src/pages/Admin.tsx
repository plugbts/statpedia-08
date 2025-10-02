import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, Ban, Gift, Activity, Mail, AlertTriangle, MessageSquare, Target, DollarSign, Lock, ArrowLeft, Terminal, TrendingUp, Cloud, Server } from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { DiscordManagement } from "@/components/admin/discord-management";
import { PromoCodesAdmin } from "@/components/admin/promo-codes-admin";
import { EmailCampaignsAdmin } from "@/components/admin/email-campaigns-admin";
import { TrialAbuseAdmin } from "@/components/admin/trial-abuse-admin";
import { AuditLogs } from "@/components/admin/audit-logs";
import { SocialAdmin } from "@/components/admin/social-admin";
import { PredictionsAdmin } from "@/components/admin/predictions-admin";
import { AdManager } from "@/components/ads/ad-manager";
import { SecurityDashboard } from "@/components/admin/security-dashboard";
import { SyncStatus } from "@/components/sync/sync-status";
import { DevConsole } from "@/components/admin/dev-console";
import { CrossReferenceAnalysis } from "@/components/admin/cross-reference-analysis";
import { ServerAPIDashboard } from "@/components/admin/server-api-dashboard";
import { DualAIDebugger } from "@/components/admin/dual-ai-debugger";
import { APIUsageChecker } from "@/components/debug/api-usage-checker";
import { CloudflareR2UsagePanel } from "@/components/admin/cloudflare-r2-usage-panel";
import { SportsGameOddsAPIUsagePanel } from "@/components/admin/sportsgameodds-api-usage-panel";
import { useUser } from "@/contexts/user-context";

export default function Admin() {
  const navigate = useNavigate();
  const { userRole, isLoading: userLoading, logSecurityEvent } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminRole();
  }, [userRole, userLoading]);

  const checkAdminRole = async () => {
    if (userLoading) return;
    
    if (!userRole || (userRole !== 'admin' && userRole !== 'owner')) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const handleGoBack = () => {
    logSecurityEvent('ADMIN_PANEL_EXIT', {
      adminRole: userRole,
      action: 'navigate_back_to_main'
    });
    navigate("/");
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
    <div className="min-h-screen bg-background p-3">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage users, Discord integrations, and system settings</p>
            </div>
          </div>
          <Button 
            onClick={handleGoBack} 
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full h-auto p-1 bg-muted/50">
            <div className="flex flex-wrap gap-1 w-full">
              <TabsTrigger value="users" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Users className="h-3 w-3" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="discord" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Activity className="h-3 w-3" />
                <span className="hidden sm:inline">Discord</span>
              </TabsTrigger>
              <TabsTrigger value="promos" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Gift className="h-3 w-3" />
                <span className="hidden sm:inline">Promos</span>
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Mail className="h-3 w-3" />
                <span className="hidden sm:inline">Emails</span>
              </TabsTrigger>
              <TabsTrigger value="abuse" className="flex items-center gap-1 px-2 py-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Abuse</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Ban className="h-3 w-3" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-1 px-2 py-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">Social</span>
              </TabsTrigger>
              <TabsTrigger value="predictions" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Target className="h-3 w-3" />
                <span className="hidden sm:inline">Predictions</span>
              </TabsTrigger>
              <TabsTrigger value="cross-reference" className="flex items-center gap-1 px-2 py-1 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span className="hidden sm:inline">Cross-Ref</span>
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex items-center gap-1 px-2 py-1 text-xs">
                <DollarSign className="h-3 w-3" />
                <span className="hidden sm:inline">Ads</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Lock className="h-3 w-3" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              {userRole === 'owner' && (
                <TabsTrigger value="dev-console" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Terminal className="h-3 w-3" />
                  <span className="hidden sm:inline">Dev</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="sync" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Activity className="h-3 w-3" />
                  <span className="hidden sm:inline">Sync</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="api-usage" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  <span className="hidden sm:inline">API Usage</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="server-api" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Activity className="h-3 w-3" />
                  <span className="hidden sm:inline">Server API</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="dual-ai" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  <span className="hidden sm:inline">Dual AI</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="r2-usage" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Cloud className="h-3 w-3" />
                  <span className="hidden sm:inline">R2 Usage</span>
                </TabsTrigger>
              )}
              {userRole === 'owner' && (
                <TabsTrigger value="api-usage" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Server className="h-3 w-3" />
                  <span className="hidden sm:inline">API Usage</span>
                </TabsTrigger>
              )}
            </div>
          </TabsList>

          <TabsContent value="users" className="space-y-2 mt-2">
            <UserManagement />
          </TabsContent>

          <TabsContent value="discord" className="space-y-2 mt-2">
            <DiscordManagement />
          </TabsContent>

          <TabsContent value="promos" className="space-y-2 mt-2">
            <PromoCodesAdmin />
          </TabsContent>

          <TabsContent value="emails" className="space-y-2 mt-2">
            <EmailCampaignsAdmin />
          </TabsContent>

          <TabsContent value="abuse" className="space-y-2 mt-2">
            <TrialAbuseAdmin />
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 mt-2">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="social" className="space-y-2 mt-2">
            <SocialAdmin />
          </TabsContent>

          <TabsContent value="predictions" className="space-y-2 mt-2">
            <PredictionsAdmin />
          </TabsContent>

          <TabsContent value="cross-reference" className="space-y-2 mt-2">
            <CrossReferenceAnalysis />
          </TabsContent>

          <TabsContent value="ads" className="space-y-2 mt-2">
            <AdManager isAdmin={true} />
          </TabsContent>

          <TabsContent value="security" className="space-y-2 mt-2">
            <SecurityDashboard />
          </TabsContent>

          {userRole === 'owner' && (
            <TabsContent value="dev-console" className="space-y-2 mt-2">
              <DevConsole />
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="sync" className="space-y-2 mt-2">
              <SyncStatus showDetails={true} />
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="api-usage" className="space-y-2 mt-2">
              <APIUsageChecker />
            </TabsContent>
          )}

            {userRole === 'owner' && (
              <TabsContent value="server-api" className="space-y-2 mt-2">
                <ServerAPIDashboard />
              </TabsContent>
            )}

            {userRole === 'owner' && (
              <TabsContent value="dual-ai" className="space-y-2 mt-2">
                <DualAIDebugger />
              </TabsContent>
            )}

            {userRole === 'owner' && (
              <TabsContent value="r2-usage" className="space-y-2 mt-2">
                <CloudflareR2UsagePanel />
              </TabsContent>
            )}

            {userRole === 'owner' && (
              <TabsContent value="api-usage" className="space-y-2 mt-2">
                <SportsGameOddsAPIUsagePanel />
              </TabsContent>
            )}
        </Tabs>
      </div>
    </div>
  );
}
