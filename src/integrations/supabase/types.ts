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
      audit_log: {
        Row: {
          action: string
          business_id: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_type: string
          business_id: string
          config: Json
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          trigger_type: string
        }
        Insert: {
          action_type: string
          business_id: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_type: string
        }
        Update: {
          action_type?: string
          business_id?: string
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          industry: Database["public"]["Enums"]["business_industry"]
          logo_url: string | null
          name: string
          owner_id: string
          size: string | null
          tax_id: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          name: string
          owner_id?: string
          size?: string | null
          tax_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          name?: string
          owner_id?: string
          size?: string | null
          tax_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tax_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_posts: {
        Row: {
          business_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          platforms: string[]
          scheduled_for: string | null
          status: string
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          platforms?: string[]
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          platforms?: string[]
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category: string | null
          cost: number
          created_at: string
          id: string
          low_stock_threshold: number
          name: string
          price: number
          sku: string | null
          stock: number
        }
        Insert: {
          business_id: string
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name: string
          price?: number
          sku?: string | null
          stock?: number
        }
        Update: {
          business_id?: string
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          business_id: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          purchase_date: string
          status: Database["public"]["Enums"]["purchase_status"]
          stock_applied: boolean
          supplier_id: string | null
          supplier_name: string | null
          total: number
          transaction_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stock_applied?: boolean
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number
          transaction_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stock_applied?: boolean
          supplier_id?: string | null
          supplier_name?: string | null
          total?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          customer_name: string
          id: string
          items: Json
          notes: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax: number
          total: number
          valid_until: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          id?: string
          items?: Json
          notes?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          total?: number
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          id?: string
          items?: Json
          notes?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string
          channel: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          items: Json
          notes: string | null
          quote_id: string | null
          sale_date: string
          status: Database["public"]["Enums"]["sale_status"]
          stock_applied: boolean
          total: number
          transaction_id: string | null
        }
        Insert: {
          business_id: string
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          notes?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          stock_applied?: boolean
          total?: number
          transaction_id?: string | null
        }
        Update: {
          business_id?: string
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          notes?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          stock_applied?: boolean
          total?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          tx_date: string
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          amount: number
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tx_date?: string
          type: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tx_date?: string
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_industry:
        | "retail"
        | "food"
        | "services"
        | "manufacturing"
        | "health"
        | "construction"
        | "other"
      member_role: "owner" | "admin" | "staff" | "viewer"
      purchase_status: "pending" | "received" | "paid" | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      sale_status: "draft" | "pending" | "paid" | "cancelled"
      tx_type: "income" | "expense"
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
      business_industry: [
        "retail",
        "food",
        "services",
        "manufacturing",
        "health",
        "construction",
        "other",
      ],
      member_role: ["owner", "admin", "staff", "viewer"],
      purchase_status: ["pending", "received", "paid", "cancelled"],
      quote_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      sale_status: ["draft", "pending", "paid", "cancelled"],
      tx_type: ["income", "expense"],
    },
  },
} as const
