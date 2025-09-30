export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bet_tracking: {
        Row: {
          amount: number
          bet_type: string
          id: string
          legs_hit: number | null
          legs_total: number | null
          odds: string | null
          payout: number | null
          placed_at: string
          settled_at: string | null
          sportsbook: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bet_type: string
          id?: string
          legs_hit?: number | null
          legs_total?: number | null
          odds?: string | null
          payout?: number | null
          placed_at?: string
          settled_at?: string | null
          sportsbook?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bet_type?: string
          id?: string
          legs_hit?: number | null
          legs_total?: number | null
          odds?: string | null
          payout?: number | null
          placed_at?: string
          settled_at?: string | null
          sportsbook?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          downvotes: number | null
          id: string
          post_id: string | null
          prediction_id: string | null
          prop_id: string | null
          updated_at: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          post_id?: string | null
          prediction_id?: string | null
          prop_id?: string | null
          updated_at?: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          post_id?: string | null
          prediction_id?: string | null
          prop_id?: string | null
          updated_at?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_access_audit: {
        Row: {
          access_granted: boolean
          access_type: string
          accessed_at: string
          accessed_by: string
          accessed_profile: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          access_granted: boolean
          access_type: string
          accessed_at?: string
          accessed_by: string
          accessed_profile: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          accessed_profile?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bankroll: number | null
          bio: string | null
          created_at: string
          display_name: string | null
          has_used_trial: boolean | null
          id: string
          is_muted: boolean | null
          karma: number | null
          push_notifications_enabled: boolean | null
          roi_visible: boolean | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_tier: string | null
          total_bets: number | null
          total_predictions: number | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
          won_bets: number | null
          won_predictions: number | null
        }
        Insert: {
          avatar_url?: string | null
          bankroll?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          has_used_trial?: boolean | null
          id?: string
          is_muted?: boolean | null
          karma?: number | null
          push_notifications_enabled?: boolean | null
          roi_visible?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          total_bets?: number | null
          total_predictions?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
          won_bets?: number | null
          won_predictions?: number | null
        }
        Update: {
          avatar_url?: string | null
          bankroll?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          has_used_trial?: boolean | null
          id?: string
          is_muted?: boolean | null
          karma?: number | null
          push_notifications_enabled?: boolean | null
          roi_visible?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_tier?: string | null
          total_bets?: number | null
          total_predictions?: number | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
          won_bets?: number | null
          won_predictions?: number | null
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          id: string
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          trial_days: number | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          trial_days?: number | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          trial_days?: number | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          target_user: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string
          downvotes: number | null
          id: string
          updated_at: string
          upvotes: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          downvotes?: number | null
          id?: string
          updated_at?: string
          upvotes?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          downvotes?: number | null
          id?: string
          updated_at?: string
          upvotes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          created_at: string
          game_date: string
          id: string
          is_correct: boolean | null
          prediction: string
          prop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_date: string
          id?: string
          is_correct?: boolean | null
          prediction: string
          prop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_date?: string
          id?: string
          is_correct?: boolean | null
          prediction?: string
          prop_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      friend_profiles_secure: {
        Row: {
          avatar_url: string | null
          bankroll: number | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          has_used_trial: boolean | null
          id: string | null
          karma: number | null
          roi_visible: boolean | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_tier: string | null
          total_bets: number | null
          total_predictions: number | null
          updated_at: string | null
          user_id: string | null
          won_bets: number | null
          won_predictions: number | null
        }
        Insert: {
          avatar_url?: string | null
          bankroll?: never
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          has_used_trial?: never
          id?: string | null
          karma?: number | null
          roi_visible?: boolean | null
          subscription_end_date?: never
          subscription_start_date?: never
          subscription_tier?: never
          total_bets?: never
          total_predictions?: never
          updated_at?: string | null
          user_id?: string | null
          won_bets?: never
          won_predictions?: never
        }
        Update: {
          avatar_url?: string | null
          bankroll?: never
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          has_used_trial?: never
          id?: string | null
          karma?: number | null
          roi_visible?: boolean | null
          subscription_end_date?: never
          subscription_start_date?: never
          subscription_tier?: never
          total_bets?: never
          total_predictions?: never
          updated_at?: string | null
          user_id?: string | null
          won_bets?: never
          won_predictions?: never
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
