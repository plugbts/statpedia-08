import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubscriptionBannerProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  title = "Locked content",
  description = "Upgrade your plan to unlock this feature.",
  ctaLabel = "See Plans",
}) => {
  const navigate = useNavigate();
  return (
    <Alert className="bg-muted/30 border-border/60 flex items-center justify-between gap-2">
      <AlertDescription className="text-sm">
        <span className="font-medium text-foreground">{title}</span>
        <span className="ml-2 text-muted-foreground">{description}</span>
      </AlertDescription>
      <Button size="sm" onClick={() => navigate("/subscription")}>
        <Crown className="w-4 h-4 mr-2" />
        {ctaLabel}
      </Button>
    </Alert>
  );
};

export default SubscriptionBanner;
