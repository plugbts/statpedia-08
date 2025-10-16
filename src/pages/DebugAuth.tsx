import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/use-access";

const FeatureRow: React.FC<{ label: string; access: ReturnType<typeof useAccess> }> = ({
  label,
  access,
}) => {
  const decision = access.can(label as any);
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      {decision.allowed ? (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Allowed</Badge>
      ) : (
        <Badge
          variant="secondary"
          className="bg-destructive/10 text-destructive border-destructive/30"
        >
          {decision.reason || "Denied"}
        </Badge>
      )}
    </div>
  );
};

export const DebugAuth: React.FC = () => {
  const { user, userSubscription, logout } = useAuth();
  const access = useAccess();

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Auth Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Email</div>
            <div className="font-mono">{user?.email || "-"}</div>
            <div className="text-muted-foreground">Role</div>
            <div>
              <Badge>{access.role}</Badge>
            </div>
            <div className="text-muted-foreground">Subscription</div>
            <div>
              <Badge variant="secondary">{access.subscription}</Badge>
            </div>
            <div className="text-muted-foreground">Authenticated</div>
            <div>{access.isAuthenticated ? "Yes" : "No"}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Badge variant="secondary">Owner</Badge>
            <div>{access.isOwner ? "Yes" : "No"}</div>
            <Badge variant="secondary">Admin</Badge>
            <div>{access.isAdmin ? "Yes" : "No"}</div>
            <Badge variant="secondary">Mod</Badge>
            <div>{access.isMod ? "Yes" : "No"}</div>
            <Badge variant="secondary">Has Pro</Badge>
            <div>{access.hasPro ? "Yes" : "No"}</div>
            <Badge variant="secondary">Has Premium</Badge>
            <div>{access.hasPremium ? "Yes" : "No"}</div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Feature Access</h3>
            <div className="space-y-1">
              {[
                "strikeout-center",
                "most-likely",
                "parlay-gen",
                "analytics",
                "backtest",
                "admin",
                "sync-test",
              ].map((f) => (
                <FeatureRow key={f} label={f} access={access} />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugAuth;
