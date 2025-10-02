import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, ExternalLink, CheckCircle2 } from "lucide-react";

const DISCORD_CLIENT_ID = "1422412327155794076";
const DISCORD_REDIRECT_URI = "https://rfdrifnsfobqlzorcesn.supabase.co/functions/v1/discord-oauth";
const DISCORD_SERVER_INVITE = "https://discord.gg/760929736137506857";

export function DiscordLinkCard() {
  const [loading, setLoading] = useState(true);
  const [discordLink, setDiscordLink] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkDiscordLink();
    
    // Check for OAuth success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('discord') === 'success') {
      toast({
        title: "Discord Linked!",
        description: "Your Discord account has been successfully linked.",
      });
      window.history.replaceState({}, '', window.location.pathname);
      checkDiscordLink();
    }
  }, []);

  const checkDiscordLink = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("discord_links")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setDiscordLink(data);
    } catch (error) {
      console.error("Error checking Discord link:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to link Discord",
          variant: "destructive",
        });
        return;
      }

      const scope = "identify guilds.members.read";
      const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${user.id}`;
      
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating Discord auth:", error);
      toast({
        title: "Error",
        description: "Failed to start Discord authentication",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle>Discord Bonus</CardTitle>
          </div>
          {discordLink && (
            <Badge variant="secondary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Linked
            </Badge>
          )}
        </div>
        <CardDescription>
          Join our Discord server and get 30 days free subscription!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!discordLink ? (
          <>
            <div className="space-y-2">
              <h4 className="font-medium">How to claim:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Join our Discord server</li>
                <li>Link your Discord account</li>
                <li>Get 30 days free subscription automatically</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(DISCORD_SERVER_INVITE, '_blank')}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Server
              </Button>
              <Button
                onClick={handleDiscordAuth}
                className="flex-1"
              >
                Link Discord
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Discord Account:</span>
              <span className="font-medium">{discordLink.discord_username}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Server Status:</span>
              <Badge variant={discordLink.server_joined ? "default" : "secondary"}>
                {discordLink.server_joined ? "Joined" : "Not Joined"}
              </Badge>
            </div>
            {discordLink.server_joined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reward Status:</span>
                <Badge variant={discordLink.subscription_extended ? "default" : "outline"}>
                  {discordLink.subscription_extended ? "Granted" : "Pending"}
                </Badge>
              </div>
            )}
            {!discordLink.server_joined && (
              <Button
                variant="outline"
                onClick={() => window.open(DISCORD_SERVER_INVITE, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Server to Claim Reward
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
