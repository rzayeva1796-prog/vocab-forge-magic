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
      flashcard_progress: {
        Row: {
          created_at: string | null
          current_position: number | null
          current_round_words: Json | null
          id: string
          last_word_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_position?: number | null
          current_round_words?: Json | null
          id?: string
          last_word_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_position?: number | null
          current_round_words?: Json | null
          id?: string
          last_word_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_progress: {
        Row: {
          created_at: string
          current_position: number
          games_played: number
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_position?: number
          games_played?: number
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_position?: number
          games_played?: number
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      learned_words: {
        Row: {
          added_at: string
          english: string
          frequency_group: string
          id: string
          is_flipped: boolean | null
          package_id: string | null
          package_name: string | null
          star_rating: number | null
          turkish: string
        }
        Insert: {
          added_at?: string
          english: string
          frequency_group: string
          id?: string
          is_flipped?: boolean | null
          package_id?: string | null
          package_name?: string | null
          star_rating?: number | null
          turkish: string
        }
        Update: {
          added_at?: string
          english?: string
          frequency_group?: string
          id?: string
          is_flipped?: boolean | null
          package_id?: string | null
          package_name?: string | null
          star_rating?: number | null
          turkish?: string
        }
        Relationships: [
          {
            foreignKeyName: "learned_words_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "word_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          id: string
          last_notified_at: string | null
          notification_sound: string | null
          push_enabled: boolean | null
          push_subscription: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          notification_sound?: string | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_notified_at?: string | null
          notification_sound?: string | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          sender_name: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          sender_name?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_name?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          eslestirme_xp: number
          id: string
          kart_xp: number
          kitap_xp: number
          last_activity_at: string | null
          last_login_date: string | null
          login_streak: number | null
          tetris_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          eslestirme_xp?: number
          id?: string
          kart_xp?: number
          kitap_xp?: number
          last_activity_at?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          tetris_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          eslestirme_xp?: number
          id?: string
          kart_xp?: number
          kitap_xp?: number
          last_activity_at?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          tetris_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      subsections: {
        Row: {
          created_at: string
          display_order: number | null
          icon_url: string | null
          id: string
          package_id: string | null
          section_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon_url?: string | null
          id?: string
          package_id?: string | null
          section_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon_url?: string | null
          id?: string
          package_id?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subsections_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "word_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leagues: {
        Row: {
          created_at: string
          current_league: Database["public"]["Enums"]["league_type"]
          id: string
          period_start_date: string
          period_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_league?: Database["public"]["Enums"]["league_type"]
          id?: string
          period_start_date?: string
          period_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_league?: Database["public"]["Enums"]["league_type"]
          id?: string
          period_start_date?: string
          period_xp?: number
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_word_progress: {
        Row: {
          created_at: string
          id: string
          star_rating: number
          updated_at: string
          user_id: string
          word_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          star_rating?: number
          updated_at?: string
          user_id: string
          word_id: string
        }
        Update: {
          created_at?: string
          id?: string
          star_rating?: number
          updated_at?: string
          user_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_word_progress_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "learned_words"
            referencedColumns: ["id"]
          },
        ]
      }
      word_packages: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          created_at: string
          english: string
          frequency_group: string
          id: string
          turkish: string
        }
        Insert: {
          created_at?: string
          english: string
          frequency_group: string
          id?: string
          turkish: string
        }
        Update: {
          created_at?: string
          english?: string
          frequency_group?: string
          id?: string
          turkish?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      league_type:
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "emerald"
        | "diamond"
        | "sapphire"
        | "ruby"
        | "obsidian"
        | "titan"
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
      league_type: [
        "bronze",
        "silver",
        "gold",
        "platinum",
        "emerald",
        "diamond",
        "sapphire",
        "ruby",
        "obsidian",
        "titan",
      ],
    },
  },
} as const
