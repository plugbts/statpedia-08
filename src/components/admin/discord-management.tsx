import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, CheckCircle2, XCircle } from "lucide-react";

interface DiscordLink {
  id: string;
  user_id: string;
  discord_id: string;
  discord_username: string;
  server_joined: boolean;
  subscription_extended: boolean;
  linked_at: string;
  profiles: {
    display_name: string;
    subscription_tier: string;
  };
}

export function DiscordManagement() {
  const [links, setLinks] = useState<DiscordLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscordLinks();
  }, []);

  const fetchDiscordLinks = async () => {
    try {
      const { data: linksData, error } = await supabase
        .from("discord_links")
        .select("*")
        .order("linked_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      if (linksData && linksData.length > 0) {
        const userIds = linksData.map(link => link.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, subscription_tier")
          .in("user_id", userIds);

        // Merge the data
        const mergedData = linksData.map(link => ({
          ...link,
          profiles: profilesData?.find(p => p.user_id === link.user_id) || {
            display_name: "Unknown",
            subscription_tier: "free"
          }
        }));

        setLinks(mergedData);
      } else {
        setLinks([]);
      }
    } catch (error) {
      console.error("Error fetching Discord links:", error);
      toast({
        title: "Error",
        description: "Failed to load Discord links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const extendSubscription = async (userId: string, discordLinkId: string) => {
    try {
      // Get current subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_end_date")
        .eq("user_id", userId)
        .single();

      const currentEnd = profile?.subscription_end_date 
        ? new Date(profile.subscription_end_date)
        : new Date();

      // Add 30 days
      const newEndDate = new Date(currentEnd);
      newEndDate.setDate(newEndDate.getDate() + 30);

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ subscription_end_date: newEndDate.toISOString() })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Mark extension as granted
      const { error: linkError } = await supabase
        .from("discord_links")
        .update({ 
          subscription_extended: true,
          extension_granted_at: new Date().toISOString()
        })
        .eq("id", discordLinkId);

      if (linkError) throw linkError;

      // Record extension
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("subscription_extensions")
        .insert({
          user_id: userId,
          extension_type: "discord",
          days_extended: 30,
          reason: "Discord server join reward",
          granted_by: user?.id,
        });

      toast({
        title: "Success",
        description: "30-day subscription extension granted",
      });

      fetchDiscordLinks();
    } catch (error) {
      console.error("Error extending subscription:", error);
      toast({
        title: "Error",
        description: "Failed to extend subscription",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Integrations</CardTitle>
        <CardDescription>
          Manage user Discord links and subscription extensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {links.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No Discord links found
            </p>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{link.profiles.display_name}</p>
                    <Badge variant="outline">{link.profiles.subscription_tier}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Discord: {link.discord_username} ({link.discord_id})
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {link.server_joined ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      {link.server_joined ? "In server" : "Not in server"}
                    </span>
                    <span>Linked: {new Date(link.linked_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {link.server_joined && !link.subscription_extended && (
                  <Button
                    size="sm"
                    onClick={() => extendSubscription(link.user_id, link.id)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Grant 30 Days
                  </Button>
                )}

                {link.subscription_extended && (
                  <Badge variant="secondary">Extension Granted</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
