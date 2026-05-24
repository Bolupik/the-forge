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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      card_templates: {
        Row: {
          created_at: string
          description: string
          element: string
          id: string
          image_url: string
          metadata_url: string
          minted: number
          name: string
          rarity: Database["public"]["Enums"]["card_rarity"]
          stats: Json
          supply: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          element: string
          id?: string
          image_url: string
          metadata_url?: string
          minted?: number
          name: string
          rarity: Database["public"]["Enums"]["card_rarity"]
          stats: Json
          supply: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          element?: string
          id?: string
          image_url?: string
          metadata_url?: string
          minted?: number
          name?: string
          rarity?: Database["public"]["Enums"]["card_rarity"]
          stats?: Json
          supply?: number
          updated_at?: string
        }
        Relationships: []
      }
      collection_config: {
        Row: {
          cards_per_pack: number
          id: number
          total_supply: number
          updated_at: string
        }
        Insert: {
          cards_per_pack?: number
          id?: number
          total_supply?: number
          updated_at?: string
        }
        Update: {
          cards_per_pack?: number
          id?: number
          total_supply?: number
          updated_at?: string
        }
        Relationships: []
      }
      mint_packs: {
        Row: {
          created_at: string
          id: string
          opened_at: string | null
          opened_by: string | null
          pack_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          pack_number: number
        }
        Update: {
          created_at?: string
          id?: string
          opened_at?: string | null
          opened_by?: string | null
          pack_number?: number
        }
        Relationships: []
      }
      nft_cards: {
        Row: {
          chain_status: string
          created_at: string
          description: string
          element: string
          id: string
          image_url: string
          metadata_url: string
          name: string
          on_chain_token_id: number | null
          owner_id: string
          pack_id: string | null
          rarity: Database["public"]["Enums"]["card_rarity"]
          serial: number
          stats: Json
          template_id: string
          tx_id: string | null
        }
        Insert: {
          chain_status?: string
          created_at?: string
          description?: string
          element: string
          id?: string
          image_url: string
          metadata_url?: string
          name: string
          on_chain_token_id?: number | null
          owner_id: string
          pack_id?: string | null
          rarity: Database["public"]["Enums"]["card_rarity"]
          serial: number
          stats: Json
          template_id: string
          tx_id?: string | null
        }
        Update: {
          chain_status?: string
          created_at?: string
          description?: string
          element?: string
          id?: string
          image_url?: string
          metadata_url?: string
          name?: string
          on_chain_token_id?: number | null
          owner_id?: string
          pack_id?: string | null
          rarity?: Database["public"]["Enums"]["card_rarity"]
          serial?: number
          stats?: Json
          template_id?: string
          tx_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nft_cards_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "mint_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nft_cards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bns_name: string | null
          created_at: string
          display_name: string | null
          id: string
          stacks_address: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bns_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          stacks_address?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bns_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          stacks_address?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          asking_price: string
          card_id: string
          created_at: string
          id: string
          seller_id: string
          status: Database["public"]["Enums"]["trade_status"]
          updated_at: string
        }
        Insert: {
          asking_price: string
          card_id: string
          created_at?: string
          id?: string
          seller_id: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Update: {
          asking_price?: string
          card_id?: string
          created_at?: string
          id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nft_cards"
            referencedColumns: ["id"]
          },
        ]
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
      whitelist: {
        Row: {
          created_at: string
          id: string
          twitter_handle: string | null
          twitter_verified: boolean
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          twitter_handle?: string | null
          twitter_verified?: boolean
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          twitter_handle?: string | null
          twitter_verified?: boolean
          user_id?: string | null
          wallet_address?: string
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
    }
    Enums: {
      app_role: "admin" | "user"
      card_rarity: "common" | "rare" | "epic" | "legendary"
      trade_status: "hold" | "active" | "pending" | "completed" | "cancelled"
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
      app_role: ["admin", "user"],
      card_rarity: ["common", "rare", "epic", "legendary"],
      trade_status: ["hold", "active", "pending", "completed", "cancelled"],
    },
  },
} as const
