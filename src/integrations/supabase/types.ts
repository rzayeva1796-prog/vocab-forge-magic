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
      episodes: {
        Row: {
          created_at: string
          display_order: number | null
          episode_number: number
          id: string
          name: string
          package_id: string | null
          season_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          episode_number: number
          id?: string
          name: string
          package_id?: string | null
          season_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          episode_number?: number
          id?: string
          name?: string
          package_id?: string | null
          season_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "word_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
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
      global_settings: {
        Row: {
          created_at: string
          daily_period_start: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_period_start?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_period_start?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_bots: {
        Row: {
          avatar_url: string | null
          bot_number: number | null
          created_at: string
          current_league: string
          daily_xp_rate: number
          id: string
          is_male: boolean
          name: string
          original_league: string | null
          period_xp: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bot_number?: number | null
          created_at?: string
          current_league?: string
          daily_xp_rate?: number
          id?: string
          is_male?: boolean
          name: string
          original_league?: string | null
          period_xp?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bot_number?: number | null
          created_at?: string
          current_league?: string
          daily_xp_rate?: number
          id?: string
          is_male?: boolean
          name?: string
          original_league?: string | null
          period_xp?: number
          updated_at?: string
        }
        Relationships: []
      }
      learned_words: {
        Row: {
          added_at: string
          audio_url: string | null
          english: string
          frequency_group: string
          id: string
          image_url: string | null
          is_flipped: boolean | null
          package_id: string | null
          package_name: string | null
          star_rating: number | null
          sub_package_id: string | null
          turkish: string
        }
        Insert: {
          added_at?: string
          audio_url?: string | null
          english: string
          frequency_group: string
          id?: string
          image_url?: string | null
          is_flipped?: boolean | null
          package_id?: string | null
          package_name?: string | null
          star_rating?: number | null
          sub_package_id?: string | null
          turkish: string
        }
        Update: {
          added_at?: string
          audio_url?: string | null
          english?: string
          frequency_group?: string
          id?: string
          image_url?: string | null
          is_flipped?: boolean | null
          package_id?: string | null
          package_name?: string | null
          star_rating?: number | null
          sub_package_id?: string | null
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
          {
            foreignKeyName: "learned_words_sub_package_id_fkey"
            columns: ["sub_package_id"]
            isOneToOne: false
            referencedRelation: "sub_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      listen_history: {
        Row: {
          completed: boolean | null
          id: string
          listened_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          listened_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          listened_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listen_history_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      music_albums: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          music_id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          music_id: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          music_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_albums_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "music"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tracks: {
        Row: {
          album_id: string
          audio_url: string | null
          created_at: string
          display_order: number | null
          id: string
          name: string
          package_id: string | null
          track_number: number
        }
        Insert: {
          album_id: string
          audio_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          package_id?: string | null
          track_number: number
        }
        Update: {
          album_id?: string
          audio_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          package_id?: string | null
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "music_tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "music_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_tracks_package_id_fkey"
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
          daily_period_start: string | null
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
          daily_period_start?: string | null
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
          daily_period_start?: string | null
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
      seasons: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          movie_id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          movie_id: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          movie_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          background_url: string | null
          content_background_url: string | null
          created_at: string
          display_order: number | null
          id: string
          name: string
        }
        Insert: {
          background_url?: string | null
          content_background_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Update: {
          background_url?: string | null
          content_background_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sub_packages: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
          package_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          package_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "word_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      subsections: {
        Row: {
          additional_package_ids: string[] | null
          background_url: string | null
          created_at: string
          display_order: number | null
          icon_url: string | null
          id: string
          package_id: string | null
          section_id: string
          selected_sub_package_id: string | null
        }
        Insert: {
          additional_package_ids?: string[] | null
          background_url?: string | null
          created_at?: string
          display_order?: number | null
          icon_url?: string | null
          id?: string
          package_id?: string | null
          section_id: string
          selected_sub_package_id?: string | null
        }
        Update: {
          additional_package_ids?: string[] | null
          background_url?: string | null
          created_at?: string
          display_order?: number | null
          icon_url?: string | null
          id?: string
          package_id?: string | null
          section_id?: string
          selected_sub_package_id?: string | null
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
          {
            foreignKeyName: "subsections_selected_sub_package_id_fkey"
            columns: ["selected_sub_package_id"]
            isOneToOne: false
            referencedRelation: "sub_packages"
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
      user_subsection_activations: {
        Row: {
          activated_at: string
          id: string
          subsection_id: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          id?: string
          subsection_id: string
          user_id: string
        }
        Update: {
          activated_at?: string
          id?: string
          subsection_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subsection_activations_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "subsections"
            referencedColumns: ["id"]
          },
        ]
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
      watch_history: {
        Row: {
          completed: boolean | null
          episode_id: string
          id: string
          progress_seconds: number | null
          user_id: string
          watched_at: string
        }
        Insert: {
          completed?: boolean | null
          episode_id: string
          id?: string
          progress_seconds?: number | null
          user_id: string
          watched_at?: string
        }
        Update: {
          completed?: boolean | null
          episode_id?: string
          id?: string
          progress_seconds?: number | null
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
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
