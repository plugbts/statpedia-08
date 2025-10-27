// Bet Slip Sharing Service
// Handles sharing bet slips to social feed and tailing functionality

export interface BetSlipPick {
  id: string;
  playerName: string;
  propType: string;
  line: number;
  odds: string;
  sport: string;
  team: string;
  opponent: string;
  prediction: "over" | "under";
  confidence: number;
  evPercentage: number;
  aiRating: number;
}

export interface SharedBetSlip {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  description?: string;
  picks: BetSlipPick[];
  totalOdds: number;
  potentialPayout: number;
  stake: number;
  createdAt: string;
  gameDate: string;
  sport: string;
  isPublic: boolean;
  tailCount: number;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  isTailed?: boolean;
}

export interface BetSlipTail {
  id: string;
  betSlipId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  tailedAt: string;
  stake: number;
  isActive: boolean;
}

export interface BetSlipNotification {
  id: string;
  userId: string;
  type: "bet_shared" | "bet_tailed" | "bet_liked" | "bet_commented";
  betSlipId: string;
  actorUserId: string;
  actorUserName: string;
  actorUserAvatar?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

class BetSlipSharingService {
  private supabase: any;

  constructor() {
    // Import Supabase client dynamically to avoid SSR issues
    import("@/integrations/supabase/client").then(({ supabase }) => {
      this.supabase = supabase;
    });
  }

  // Share a bet slip to social feed
  async shareBetSlip(
    userId: string,
    title: string,
    description: string,
    picks: BetSlipPick[],
    stake: number,
    isPublic: boolean = true,
  ): Promise<SharedBetSlip> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      // Calculate total odds and potential payout
      const totalOdds = this.calculateTotalOdds(picks);
      const potentialPayout = stake * totalOdds;

      // Get user profile info
      const { data: userProfile } = await this.supabase
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", userId)
        .single();

      const betSlipData = {
        user_id: userId,
        user_name: userProfile?.display_name || "Unknown User",
        user_avatar: userProfile?.avatar_url,
        title,
        description,
        picks: JSON.stringify(picks),
        total_odds: totalOdds,
        potential_payout: potentialPayout,
        stake,
        game_date: picks[0]?.gameDate || new Date().toISOString(),
        sport: picks[0]?.sport || "nba",
        is_public: isPublic,
        tail_count: 0,
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from("shared_bet_slips")
        .insert(betSlipData)
        .select()
        .single();

      if (error) throw error;

      // Create notification for followers
      await this.notifyFollowers(userId, "bet_shared", data.id, title);

      return this.formatSharedBetSlip(data);
    } catch (error) {
      console.error("Failed to share bet slip:", error);
      throw error;
    }
  }

  // Tail a bet slip (copy picks to user's my picks)
  async tailBetSlip(betSlipId: string, userId: string, stake: number): Promise<BetSlipTail> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      // Get the shared bet slip
      const { data: betSlip, error: betSlipError } = await this.supabase
        .from("shared_bet_slips")
        .select("*")
        .eq("id", betSlipId)
        .single();

      if (betSlipError) throw betSlipError;

      // Parse picks
      const picks: BetSlipPick[] = JSON.parse(betSlip.picks);

      // Add picks to user's my picks (this would integrate with existing my picks system)
      await this.addPicksToMyPicks(userId, picks);

      // Create tail record
      const { data: userProfile } = await this.supabase
        .from("user_profiles")
        .select("display_name, avatar_url")
        .eq("user_id", userId)
        .single();

      const tailData = {
        bet_slip_id: betSlipId,
        user_id: userId,
        user_name: userProfile?.display_name || "Unknown User",
        user_avatar: userProfile?.avatar_url,
        stake,
        is_active: true,
        tailed_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from("bet_slip_tails")
        .insert(tailData)
        .select()
        .single();

      if (error) throw error;

      // Update tail count
      await this.updateTailCount(betSlipId);

      // Notify bet slip owner
      await this.notifyBetSlipOwner(betSlip.user_id, userId, betSlipId, "bet_tailed");

      return this.formatBetSlipTail(data);
    } catch (error) {
      console.error("Failed to tail bet slip:", error);
      throw error;
    }
  }

  // Like a bet slip
  async likeBetSlip(betSlipId: string, userId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      // Check if already liked
      const { data: existingLike } = await this.supabase
        .from("bet_slip_likes")
        .select("id")
        .eq("bet_slip_id", betSlipId)
        .eq("user_id", userId)
        .single();

      if (existingLike) {
        // Unlike
        await this.supabase
          .from("bet_slip_likes")
          .delete()
          .eq("bet_slip_id", betSlipId)
          .eq("user_id", userId);

        await this.updateLikeCount(betSlipId, -1);
      } else {
        // Like
        await this.supabase.from("bet_slip_likes").insert({
          bet_slip_id: betSlipId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

        await this.updateLikeCount(betSlipId, 1);

        // Notify bet slip owner
        const { data: betSlip } = await this.supabase
          .from("shared_bet_slips")
          .select("user_id")
          .eq("id", betSlipId)
          .single();

        if (betSlip && betSlip.user_id !== userId) {
          await this.notifyBetSlipOwner(betSlip.user_id, userId, betSlipId, "bet_liked");
        }
      }
    } catch (error) {
      console.error("Failed to like bet slip:", error);
      throw error;
    }
  }

  // Get shared bet slips for social feed
  async getSharedBetSlips(userId?: string, limit: number = 20): Promise<SharedBetSlip[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      const query = this.supabase
        .from("shared_bet_slips")
        .select(
          `
          *,
          bet_slip_likes!inner(user_id),
          bet_slip_tails!inner(user_id)
        `,
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      return data.map((betSlip: any) => this.formatSharedBetSlip(betSlip, userId));
    } catch (error) {
      console.error("Failed to get shared bet slips:", error);
      return [];
    }
  }

  // Get user's shared bet slips
  async getUserSharedBetSlips(userId: string): Promise<SharedBetSlip[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await this.supabase
        .from("shared_bet_slips")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((betSlip: any) => this.formatSharedBetSlip(betSlip));
    } catch (error) {
      console.error("Failed to get user shared bet slips:", error);
      return [];
    }
  }

  // Get bet slip tails
  async getBetSlipTails(betSlipId: string): Promise<BetSlipTail[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await this.supabase
        .from("bet_slip_tails")
        .select("*")
        .eq("bet_slip_id", betSlipId)
        .eq("is_active", true)
        .order("tailed_at", { ascending: false });

      if (error) throw error;

      return data.map((tail: any) => this.formatBetSlipTail(tail));
    } catch (error) {
      console.error("Failed to get bet slip tails:", error);
      return [];
    }
  }

  // Get notifications
  async getNotifications(userId: string): Promise<BetSlipNotification[]> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await this.supabase
        .from("bet_slip_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map((notification: any) => this.formatNotification(notification));
    } catch (error) {
      console.error("Failed to get notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      if (!this.supabase) {
        throw new Error("Supabase client not initialized");
      }

      await this.supabase
        .from("bet_slip_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  // Private helper methods
  private calculateTotalOdds(picks: BetSlipPick[]): number {
    return picks.reduce((total, pick) => {
      const decimalOdds = this.convertToDecimalOdds(pick.odds);
      return total * decimalOdds;
    }, 1);
  }

  private convertToDecimalOdds(americanOdds: string): number {
    const odds = parseInt(americanOdds);
    if (odds > 0) {
      return odds / 100 + 1;
    } else {
      return 100 / Math.abs(odds) + 1;
    }
  }

  private async addPicksToMyPicks(userId: string, picks: BetSlipPick[]): Promise<void> {
    // This would integrate with the existing my picks system
    // For now, we'll store them in a separate table
    const myPicksData = picks.map((pick) => ({
      user_id: userId,
      prop_id: pick.id,
      player_name: pick.playerName,
      prop_type: pick.propType,
      line: pick.line,
      odds: pick.odds,
      sport: pick.sport,
      team: pick.team,
      opponent: pick.opponent,
      prediction: pick.prediction,
      confidence: pick.confidence,
      ev_percentage: pick.evPercentage,
      ai_rating: pick.aiRating,
      added_at: new Date().toISOString(),
    }));

    await this.supabase.from("user_tailed_picks").insert(myPicksData);
  }

  private async updateTailCount(betSlipId: string): Promise<void> {
    const { count } = await this.supabase
      .from("bet_slip_tails")
      .select("*", { count: "exact", head: true })
      .eq("bet_slip_id", betSlipId)
      .eq("is_active", true);

    await this.supabase.from("shared_bet_slips").update({ tail_count: count }).eq("id", betSlipId);
  }

  private async updateLikeCount(betSlipId: string, increment: number): Promise<void> {
    const { data: betSlip } = await this.supabase
      .from("shared_bet_slips")
      .select("like_count")
      .eq("id", betSlipId)
      .single();

    await this.supabase
      .from("shared_bet_slips")
      .update({ like_count: (betSlip.like_count || 0) + increment })
      .eq("id", betSlipId);
  }

  private async notifyFollowers(
    userId: string,
    type: string,
    betSlipId: string,
    title: string,
  ): Promise<void> {
    // Get user's followers
    const { data: followers } = await this.supabase
      .from("friends")
      .select("user_id")
      .eq("friend_id", userId)
      .eq("status", "accepted");

    if (!followers?.length) return;

    // Create notifications for followers
    const notifications = followers.map((follower) => ({
      user_id: follower.user_id,
      type,
      bet_slip_id: betSlipId,
      actor_user_id: userId,
      message: `shared a new bet slip: "${title}"`,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    await this.supabase.from("bet_slip_notifications").insert(notifications);
  }

  private async notifyBetSlipOwner(
    ownerId: string,
    actorId: string,
    betSlipId: string,
    type: string,
  ): Promise<void> {
    const { data: actorProfile } = await this.supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", actorId)
      .single();

    const messages = {
      bet_tailed: `${actorProfile?.display_name || "Someone"} tailed your bet slip`,
      bet_liked: `${actorProfile?.display_name || "Someone"} liked your bet slip`,
    };

    await this.supabase.from("bet_slip_notifications").insert({
      user_id: ownerId,
      type,
      bet_slip_id: betSlipId,
      actor_user_id: actorId,
      actor_user_name: actorProfile?.display_name,
      message: messages[type as keyof typeof messages],
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  private formatSharedBetSlip(data: any, currentUserId?: string): SharedBetSlip {
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      title: data.title,
      description: data.description,
      picks: JSON.parse(data.picks),
      totalOdds: data.total_odds,
      potentialPayout: data.potential_payout,
      stake: data.stake,
      createdAt: data.created_at,
      gameDate: data.game_date,
      sport: data.sport,
      isPublic: data.is_public,
      tailCount: data.tail_count || 0,
      likeCount: data.like_count || 0,
      commentCount: data.comment_count || 0,
      isLiked: data.bet_slip_likes?.some((like: any) => like.user_id === currentUserId),
      isTailed: data.bet_slip_tails?.some((tail: any) => tail.user_id === currentUserId),
    };
  }

  private formatBetSlipTail(data: any): BetSlipTail {
    return {
      id: data.id,
      betSlipId: data.bet_slip_id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      tailedAt: data.tailed_at,
      stake: data.stake,
      isActive: data.is_active,
    };
  }

  private formatNotification(data: any): BetSlipNotification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      betSlipId: data.bet_slip_id,
      actorUserId: data.actor_user_id,
      actorUserName: data.actor_user_name,
      actorUserAvatar: data.actor_user_avatar,
      message: data.message,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  }
}

export const betSlipSharingService = new BetSlipSharingService();
