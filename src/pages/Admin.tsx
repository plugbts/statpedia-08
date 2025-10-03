import { useEffect, useState, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, Ban, Gift, Activity, Mail, AlertTriangle, MessageSquare, Target, DollarSign, Lock, ArrowLeft, Terminal, TrendingUp, Cloud, Server } from "lucide-react";
import { useUser } from "@/contexts/user-context";

// Lazy load admin components for better performance
const UserManagement = lazy(() => import("@/components/admin/user-management").then(module => ({ default: module.UserManagement })));
const DiscordManagement = lazy(() => import("@/components/admin/discord-management").then(module => ({ default: module.DiscordManagement })));
const PromoCodesAdmin = lazy(() => import("@/components/admin/promo-codes-admin").then(module => ({ default: module.PromoCodesAdmin })));
const EmailCampaignsAdmin = lazy(() => import("@/components/admin/email-campaigns-admin").then(module => ({ default: module.EmailCampaignsAdmin })));
const TrialAbuseAdmin = lazy(() => import("@/components/admin/trial-abuse-admin").then(module => ({ default: module.TrialAbuseAdmin })));
const AuditLogs = lazy(() => import("@/components/admin/audit-logs").then(module => ({ default: module.AuditLogs })));
const SocialAdmin = lazy(() => import("@/components/admin/social-admin").then(module => ({ default: module.SocialAdmin })));
const PredictionsAdmin = lazy(() => import("@/components/admin/predictions-admin").then(module => ({ default: module.PredictionsAdmin })));
const AdManager = lazy(() => import("@/components/ads/ad-manager").then(module => ({ default: module.AdManager })));
const SecurityDashboard = lazy(() => import("@/components/admin/security-dashboard").then(module => ({ default: module.SecurityDashboard })));
const DevConsole = lazy(() => import("@/components/admin/dev-console").then(module => ({ default: module.DevConsole })));
const CrossReferenceAnalysis = lazy(() => import("@/components/admin/cross-reference-analysis").then(module => ({ default: module.CrossReferenceAnalysis })));
const ServerAPIDashboard = lazy(() => import("@/components/admin/server-api-dashboard").then(module => ({ default: module.ServerAPIDashboard })));
const DualAIDebugger = lazy(() => import("@/components/admin/dual-ai-debugger").then(module => ({ default: module.DualAIDebugger })));
const APIUsageChecker = lazy(() => import("@/components/debug/api-usage-checker").then(module => ({ default: module.APIUsageChecker })));
const CloudflareR2UsagePanel = lazy(() => import("@/components/admin/cloudflare-r2-usage-panel").then(module => ({ default: module.CloudflareR2UsagePanel })));
const SportsGameOddsAPIUsagePanel = lazy(() => import("@/components/admin/sportsgameodds-api-usage-panel").then(module => ({ default: module.SportsGameOddsAPIUsagePanel })));

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
                <TabsTrigger value="sportsgameodds-api" className="flex items-center gap-1 px-2 py-1 text-xs">
                  <Server className="h-3 w-3" />
                  <span className="hidden sm:inline">SportsGameOdds API</span>
                </TabsTrigger>
              )}
            </div>
          </TabsList>

          <TabsContent value="users" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <UserManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="discord" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <DiscordManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="promos" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <PromoCodesAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="emails" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <EmailCampaignsAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="abuse" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <TrialAbuseAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <AuditLogs />
            </Suspense>
          </TabsContent>

          <TabsContent value="social" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <SocialAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <PredictionsAdmin />
            </Suspense>
          </TabsContent>

          <TabsContent value="cross-reference" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <CrossReferenceAnalysis />
            </Suspense>
          </TabsContent>

          <TabsContent value="ads" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <AdManager isAdmin={true} />
            </Suspense>
          </TabsContent>

          <TabsContent value="security" className="space-y-2 mt-2">
            <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
              <SecurityDashboard />
            </Suspense>
          </TabsContent>

          {userRole === 'owner' && (
            <TabsContent value="dev-console" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <DevConsole />
              </Suspense>
            </TabsContent>
          )}


          {userRole === 'owner' && (
            <TabsContent value="api-usage" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <APIUsageChecker />
              </Suspense>
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="server-api" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <ServerAPIDashboard />
              </Suspense>
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="dual-ai" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <DualAIDebugger />
              </Suspense>
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="r2-usage" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <CloudflareR2UsagePanel />
              </Suspense>
            </TabsContent>
          )}

          {userRole === 'owner' && (
            <TabsContent value="sportsgameodds-api" className="space-y-2 mt-2">
              <Suspense fallback={<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />}>
                <SportsGameOddsAPIUsagePanel />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
