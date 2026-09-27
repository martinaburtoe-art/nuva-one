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
      accounting_accounts: {
        Row: {
          account_type: string
          active: boolean
          business_id: string
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          system_key: string | null
          tax_category: string | null
        }
        Insert: {
          account_type: string
          active?: boolean
          business_id: string
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          system_key?: string | null
          tax_category?: string | null
        }
        Update: {
          account_type?: string
          active?: boolean
          business_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          system_key?: string | null
          tax_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_financial_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounting_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_financial_trial_balance"
            referencedColumns: ["account_id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          id?: string
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      accounting_lines: {
        Row: {
          account_id: string
          business_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_id: string
          tax_code: string | null
        }
        Insert: {
          account_id: string
          business_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id: string
          tax_code?: string | null
        }
        Update: {
          account_id?: string
          business_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_id?: string
          tax_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounting_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_account_fk"
            columns: ["business_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_journal_fk"
            columns: ["business_id", "journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "accounting_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_closures: {
        Row: {
          business_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
        }
        Insert: {
          business_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
        }
        Update: {
          business_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_period_closures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      agentes_historial: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          role: string | null
          session_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          business_id: string
          channel: Database["public"]["Enums"]["ai_channel"]
          created_at: string
          external_ref: string | null
          id: string
          last_message_at: string
          status: string
          summary: string | null
          summary_up_to: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          channel: Database["public"]["Enums"]["ai_channel"]
          created_at?: string
          external_ref?: string | null
          id?: string
          last_message_at?: string
          status?: string
          summary?: string | null
          summary_up_to?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          channel?: Database["public"]["Enums"]["ai_channel"]
          created_at?: string
          external_ref?: string | null
          id?: string
          last_message_at?: string
          status?: string
          summary?: string | null
          summary_up_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: Database["public"]["Enums"]["ai_role"]
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: Database["public"]["Enums"]["ai_role"]
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: Database["public"]["Enums"]["ai_role"]
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_registry: {
        Row: {
          capability: string
          cost_units: number
          created_at: string
          daily_limit: number | null
          description: string
          enabled: boolean
          id: string
          label: string
          model: string | null
          monthly_limit: number | null
          plans: string[]
          provider: string
          updated_at: string
        }
        Insert: {
          capability: string
          cost_units?: number
          created_at?: string
          daily_limit?: number | null
          description?: string
          enabled?: boolean
          id: string
          label: string
          model?: string | null
          monthly_limit?: number | null
          plans?: string[]
          provider: string
          updated_at?: string
        }
        Update: {
          capability?: string
          cost_units?: number
          created_at?: string
          daily_limit?: number | null
          description?: string
          enabled?: boolean
          id?: string
          label?: string
          model?: string | null
          monthly_limit?: number | null
          plans?: string[]
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_tool_usage_daily: {
        Row: {
          business_id: string
          generation_count: number
          tool_id: string
          units_used: number
          usage_date: string
        }
        Insert: {
          business_id: string
          generation_count?: number
          tool_id: string
          units_used?: number
          usage_date?: string
        }
        Update: {
          business_id?: string
          generation_count?: number
          tool_id?: string
          units_used?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_daily_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ai_tool_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tool_usage_monthly: {
        Row: {
          business_id: string
          generation_count: number
          tool_id: string
          units_used: number
          usage_month: string
        }
        Insert: {
          business_id: string
          generation_count?: number
          tool_id: string
          units_used?: number
          usage_month: string
        }
        Update: {
          business_id?: string
          generation_count?: number
          tool_id?: string
          units_used?: number
          usage_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_tool_usage_monthly_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "ai_tool_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_daily: {
        Row: {
          business_id: string
          message_count: number
          usage_date: string
        }
        Insert: {
          business_id: string
          message_count?: number
          usage_date?: string
        }
        Update: {
          business_id?: string
          message_count?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      ai_usage_events: {
        Row: {
          attempts: number
          business_id: string | null
          created_at: string
          estimated_cost_usd: number
          fallback_used: boolean
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          fallback_used?: boolean
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          attempts?: number
          business_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          fallback_used?: boolean
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      ai_usage_monthly: {
        Row: {
          business_id: string
          message_count: number
          usage_month: string
        }
        Insert: {
          business_id: string
          message_count?: number
          usage_month: string
        }
        Update: {
          business_id?: string
          message_count?: number
          usage_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "ai_usage_monthly_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
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
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      bank_reconciliation_sessions: {
        Row: {
          account_name: string
          adjustments: number
          bank_charges: number
          book_closing_balance: number
          business_id: string
          created_at: string
          difference: number | null
          id: string
          notes: string | null
          opening_balance: number
          outstanding_deposits: number
          outstanding_payments: number
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          statement_closing_balance: number
          statement_document_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_name: string
          adjustments?: number
          bank_charges?: number
          book_closing_balance?: number
          business_id: string
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number
          outstanding_deposits?: number
          outstanding_payments?: number
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_closing_balance?: number
          statement_document_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          adjustments?: number
          bank_charges?: number
          book_closing_balance?: number
          business_id?: string
          created_at?: string
          difference?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number
          outstanding_deposits?: number
          outstanding_payments?: number
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          statement_closing_balance?: number
          statement_document_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "bank_reconciliation_sessions_statement_document_id_fkey"
            columns: ["statement_document_id"]
            isOneToOne: false
            referencedRelation: "tax_supporting_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_documents: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          emission_mode: string
          environment: string
          error_message: string | null
          folio: number | null
          id: string
          idempotency_key: string | null
          iva_amount: number | null
          net_amount: number | null
          pdf_base64: string | null
          provider: string | null
          raw_response: Json | null
          receptor_name: string | null
          receptor_rut: string | null
          sale_id: string | null
          status: string
          tipo_dte: number
          total: number
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          emission_mode?: string
          environment?: string
          error_message?: string | null
          folio?: number | null
          id?: string
          idempotency_key?: string | null
          iva_amount?: number | null
          net_amount?: number | null
          pdf_base64?: string | null
          provider?: string | null
          raw_response?: Json | null
          receptor_name?: string | null
          receptor_rut?: string | null
          sale_id?: string | null
          status?: string
          tipo_dte: number
          total?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          emission_mode?: string
          environment?: string
          error_message?: string | null
          folio?: number | null
          id?: string
          idempotency_key?: string | null
          iva_amount?: number | null
          net_amount?: number | null
          pdf_base64?: string | null
          provider?: string | null
          raw_response?: Json | null
          receptor_name?: string | null
          receptor_rut?: string | null
          sale_id?: string | null
          status?: string
          tipo_dte?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_documents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_emit_queue: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          document_id: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          payload: Json
          sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          document_id?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          payload: Json
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          payload?: Json
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_emit_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_emit_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "billing_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_emit_queue_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_integrations: {
        Row: {
          acteco: string | null
          api_key: string | null
          api_url: string | null
          business_id: string
          cdg_sii_sucur: string | null
          comuna: string | null
          config: Json
          connected_at: string | null
          created_at: string
          direccion: string | null
          environment: string
          giro: string | null
          id: string
          provider: string
          razon_social: string | null
          rut: string | null
          secret_key: string | null
          status: string
          type: string
        }
        Insert: {
          acteco?: string | null
          api_key?: string | null
          api_url?: string | null
          business_id: string
          cdg_sii_sucur?: string | null
          comuna?: string | null
          config?: Json
          connected_at?: string | null
          created_at?: string
          direccion?: string | null
          environment?: string
          giro?: string | null
          id?: string
          provider?: string
          razon_social?: string | null
          rut?: string | null
          secret_key?: string | null
          status?: string
          type?: string
        }
        Update: {
          acteco?: string | null
          api_key?: string | null
          api_url?: string | null
          business_id?: string
          cdg_sii_sucur?: string | null
          comuna?: string | null
          config?: Json
          connected_at?: string | null
          created_at?: string
          direccion?: string | null
          environment?: string
          giro?: string | null
          id?: string
          provider?: string
          razon_social?: string | null
          rut?: string | null
          secret_key?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "billing_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_invites: {
        Row: {
          business_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          permissions: Json
          position: string | null
          role: Database["public"]["Enums"]["member_role"]
          status: string
          token: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Json
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Json
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          permissions: Json
          position: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          permissions?: Json
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          permissions?: Json
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          billing_failed_attempts: number
          billing_provider: string
          comuna: string | null
          created_at: string
          flow_card_status: string
          flow_customer_id: string | null
          giro: string | null
          id: string
          industry: Database["public"]["Enums"]["business_industry"]
          logo_url: string | null
          mercadopago_customer_id: string | null
          mercadopago_preapproval_id: string | null
          name: string
          next_charge_date: string | null
          owner_grant_expires_at: string | null
          owner_grant_note: string | null
          owner_granted_access: boolean
          owner_id: string
          plan: string
          public_contact_email: string | null
          public_contact_phone: string | null
          public_description: string | null
          public_enabled: boolean
          public_photos: string[]
          public_slug: string | null
          public_social_links: Json
          size: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_failed_attempts?: number
          billing_provider?: string
          comuna?: string | null
          created_at?: string
          flow_card_status?: string
          flow_customer_id?: string | null
          giro?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          mercadopago_customer_id?: string | null
          mercadopago_preapproval_id?: string | null
          name: string
          next_charge_date?: string | null
          owner_grant_expires_at?: string | null
          owner_grant_note?: string | null
          owner_granted_access?: boolean
          owner_id?: string
          plan?: string
          public_contact_email?: string | null
          public_contact_phone?: string | null
          public_description?: string | null
          public_enabled?: boolean
          public_photos?: string[]
          public_slug?: string | null
          public_social_links?: Json
          size?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_failed_attempts?: number
          billing_provider?: string
          comuna?: string | null
          created_at?: string
          flow_card_status?: string
          flow_customer_id?: string | null
          giro?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          mercadopago_customer_id?: string | null
          mercadopago_preapproval_id?: string | null
          name?: string
          next_charge_date?: string | null
          owner_grant_expires_at?: string | null
          owner_grant_note?: string | null
          owner_granted_access?: boolean
          owner_id?: string
          plan?: string
          public_contact_email?: string | null
          public_contact_phone?: string | null
          public_description?: string | null
          public_enabled?: boolean
          public_photos?: string[]
          public_slug?: string | null
          public_social_links?: Json
          size?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow_forecasts: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          description: string | null
          flow_date: string
          flow_type: string
          id: string
          probability: number
          scenario: string
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string
          description?: string | null
          flow_date: string
          flow_type: string
          id?: string
          probability?: number
          scenario?: string
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          description?: string | null
          flow_date?: string
          flow_type?: string
          id?: string
          probability?: number
          scenario?: string
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_flow_forecasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      cash_register_movements: {
        Row: {
          amount: number
          business_id: string
          cash_register_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          reason: string
        }
        Insert: {
          amount: number
          business_id: string
          cash_register_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          reason: string
        }
        Update: {
          amount?: number
          business_id?: string
          cash_register_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_register_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_register_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          business_id: string
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
        }
        Insert: {
          business_id: string
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Update: {
          business_id?: string
          closed_at?: string | null
          closed_by?: string | null
          counted_cash?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "cash_registers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      costs: {
        Row: {
          allocation: string
          amount_net: number
          behavior: string
          business_id: string
          cash_ledger_id: string | null
          category: string
          cost_center: string | null
          cost_type: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          document_number: string | null
          document_type: string
          due_date: string | null
          id: string
          incurred_at: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          product_id: string | null
          recurring: boolean
          recurring_end_date: string | null
          recurring_frequency: string | null
          supplier_id: string | null
          tax_treatment: string
          total_amount: number
          transaction_id: string | null
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          allocation?: string
          amount_net?: number
          behavior?: string
          business_id: string
          cash_ledger_id?: string | null
          category?: string
          cost_center?: string | null
          cost_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          document_number?: string | null
          document_type?: string
          due_date?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string | null
          recurring?: boolean
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          supplier_id?: string | null
          tax_treatment?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          allocation?: string
          amount_net?: number
          behavior?: string
          business_id?: string
          cash_ledger_id?: string | null
          category?: string
          cost_center?: string | null
          cost_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          document_number?: string | null
          document_type?: string
          due_date?: string | null
          id?: string
          incurred_at?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string | null
          recurring?: boolean
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          supplier_id?: string | null
          tax_treatment?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "costs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "costs_cash_ledger_id_fkey"
            columns: ["cash_ledger_id"]
            isOneToOne: false
            referencedRelation: "financial_cash_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activities: {
        Row: {
          business_id: string
          completed: boolean
          completed_at: string | null
          content: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          product_id: string | null
          type: string
        }
        Insert: {
          business_id: string
          completed?: boolean
          completed_at?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          product_id?: string | null
          type?: string
        }
        Update: {
          business_id?: string
          completed?: boolean
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          product_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_activities_business_customer_fkey"
            columns: ["business_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customer_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customer_activities_business_product_fkey"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "customer_activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          last_contacted_at: string | null
          name: string
          notes: string | null
          phone: string | null
          pipeline_stage: string
          shipping_city: string | null
          shipping_comuna: string | null
          shipping_contact_name: string | null
          shipping_postal_code: string | null
          shipping_region: string | null
          status: string
          tags: string[]
          tax_id: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          shipping_city?: string | null
          shipping_comuna?: string | null
          shipping_contact_name?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          status?: string
          tags?: string[]
          tax_id?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          shipping_city?: string | null
          shipping_comuna?: string | null
          shipping_contact_name?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          status?: string
          tags?: string[]
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          business_id: string | null
          created_at: string
          fcm_token: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          fcm_token: string
          id?: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          fcm_token?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "device_tokens_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          account_id: string | null
          adjustment_type: string
          amount: number
          approved_by: string | null
          business_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          period_end: string
          period_start: string
          status: string
          supporting_document_id: string | null
          tax_treatment: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          adjustment_type: string
          amount: number
          approved_by?: string | null
          business_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          supporting_document_id?: string | null
          tax_treatment?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          adjustment_type?: string
          amount?: number
          approved_by?: string | null
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          supporting_document_id?: string | null
          tax_treatment?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "financial_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "v_financial_trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_adjustments_supporting_document_id_fkey"
            columns: ["supporting_document_id"]
            isOneToOne: false
            referencedRelation: "tax_supporting_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cash_ledger: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          description: string | null
          direction: string
          entry_date: string
          id: string
          payment_method: string | null
          source_id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string
          description?: string | null
          direction: string
          entry_date: string
          id?: string
          payment_method?: string | null
          source_id: string
          source_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          description?: string | null
          direction?: string
          entry_date?: string
          id?: string
          payment_method?: string | null
          source_id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      financial_close_checklist: {
        Row: {
          assigned_to: string | null
          business_id: string
          category: string
          checklist_key: string
          created_at: string
          evidence: string | null
          id: string
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          category: string
          checklist_key: string
          created_at?: string
          evidence?: string | null
          id?: string
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          category?: string
          checklist_key?: string
          created_at?: string
          evidence?: string | null
          id?: string
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      financial_close_controls: {
        Row: {
          business_id: string
          control_code: string
          created_at: string
          details: Json
          id: string
          period_end: string
          period_start: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          control_code: string
          created_at?: string
          details?: Json
          id?: string
          period_end: string
          period_start: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          control_code?: string
          created_at?: string
          details?: Json
          id?: string
          period_end?: string
          period_start?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_controls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      financial_posting_queue: {
        Row: {
          accounting_journal_id: string | null
          business_id: string
          created_at: string
          gross_amount: number
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_date: string
          source_id: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          accounting_journal_id?: string | null
          business_id: string
          created_at?: string
          gross_amount: number
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_date: string
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          accounting_journal_id?: string | null
          business_id?: string
          created_at?: string
          gross_amount?: number
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_date?: string
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_posting_queue_accounting_journal_id_fkey"
            columns: ["accounting_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      financial_reconciliation_items: {
        Row: {
          amount_book: number
          amount_external: number
          business_id: string
          created_at: string
          difference: number | null
          id: string
          period_end: string
          period_start: string
          resolution: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_kind: string
          status: string
          target_id: string | null
          target_kind: string | null
          updated_at: string
        }
        Insert: {
          amount_book?: number
          amount_external?: number
          business_id: string
          created_at?: string
          difference?: number | null
          id?: string
          period_end: string
          period_start: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_kind: string
          status?: string
          target_id?: string | null
          target_kind?: string | null
          updated_at?: string
        }
        Update: {
          amount_book?: number
          amount_external?: number
          business_id?: string
          created_at?: string
          difference?: number | null
          id?: string
          period_end?: string
          period_start?: string
          resolution?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_kind?: string
          status?: string
          target_id?: string | null
          target_kind?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_reconciliation_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_user_id: string
          body: string
          business_id: string
          business_name: string
          created_at: string
          id: string
          topic_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          business_id: string
          business_name: string
          created_at?: string
          id?: string
          topic_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          business_id?: string
          business_name?: string
          created_at?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_user_id: string
          body: string
          business_id: string
          business_industry: string | null
          business_name: string
          category: string
          created_at: string
          id: string
          reply_count: number
          title: string
          views: number
        }
        Insert: {
          author_user_id: string
          body: string
          business_id: string
          business_industry?: string | null
          business_name: string
          category?: string
          created_at?: string
          id?: string
          reply_count?: number
          title: string
          views?: number
        }
        Update: {
          author_user_id?: string
          body?: string
          business_id?: string
          business_industry?: string | null
          business_name?: string
          category?: string
          created_at?: string
          id?: string
          reply_count?: number
          title?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "forum_topics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string
          quantity_delta: number
          reason: string | null
          source_id: string | null
          source_type: string | null
          stock_after: number
          stock_before: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id: string
          quantity_delta: number
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          stock_after: number
          stock_before: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          stock_after?: number
          stock_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stocktake_lines: {
        Row: {
          barcode: string | null
          business_id: string
          counted_qty: number
          difference: number | null
          id: string
          product_id: string | null
          product_name: string
          scanned_at: string
          stocktake_id: string
          system_qty: number
        }
        Insert: {
          barcode?: string | null
          business_id: string
          counted_qty?: number
          difference?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          scanned_at?: string
          stocktake_id: string
          system_qty?: number
        }
        Update: {
          barcode?: string | null
          business_id?: string
          counted_qty?: number
          difference?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          scanned_at?: string
          stocktake_id?: string
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktake_lines_stocktake_id_fkey"
            columns: ["stocktake_id"]
            isOneToOne: false
            referencedRelation: "inventory_stocktakes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stocktakes: {
        Row: {
          business_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "inventory_stocktakes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      mobile_scanner_events: {
        Row: {
          business_id: string
          client_event_id: string
          code: string
          created_at: string
          id: string
          input_type: string
          normalized_code: string
          session_id: string
        }
        Insert: {
          business_id: string
          client_event_id: string
          code: string
          created_at?: string
          id?: string
          input_type?: string
          normalized_code: string
          session_id: string
        }
        Update: {
          business_id?: string
          client_event_id?: string
          code?: string
          created_at?: string
          id?: string
          input_type?: string
          normalized_code?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mobile_scanner_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_scanner_sessions: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          last_seen_at: string | null
          pair_code_hash: string
          paired_at: string | null
          paired_by: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          last_seen_at?: string | null
          pair_code_hash: string
          paired_at?: string | null
          paired_by?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          last_seen_at?: string | null
          pair_code_hash?: string
          paired_at?: string | null
          paired_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "mobile_scanner_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_action_outcomes: {
        Row: {
          action_id: string | null
          actual_impact: number | null
          business_id: string
          created_at: string
          evidence: Json
          expected_impact: number | null
          id: string
          observed_at: string
          outcome_type: string
        }
        Insert: {
          action_id?: string | null
          actual_impact?: number | null
          business_id: string
          created_at?: string
          evidence?: Json
          expected_impact?: number | null
          id?: string
          observed_at?: string
          outcome_type: string
        }
        Update: {
          action_id?: string | null
          actual_impact?: number | null
          business_id?: string
          created_at?: string
          evidence?: Json
          expected_impact?: number | null
          id?: string
          observed_at?: string
          outcome_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_action_outcomes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "nuva_action_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_outcomes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_action_queue: {
        Row: {
          action_type: string
          business_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          destination: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          impact: number
          mode: string
          payload: Json
          priority: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type: string
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          impact?: number
          mode?: string
          payload?: Json
          priority?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          destination?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          impact?: number
          mode?: string
          payload?: Json
          priority?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_action_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_autopilot_policies: {
        Row: {
          action_type: string
          approval_required: boolean
          business_id: string
          constraints: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          execution_count: number
          id: string
          last_evaluated_at: string | null
          last_executed_at: string | null
          mode: string
          name: string
          updated_at: string
        }
        Insert: {
          action_type: string
          approval_required?: boolean
          business_id: string
          constraints?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          execution_count?: number
          id?: string
          last_evaluated_at?: string | null
          last_executed_at?: string | null
          mode?: string
          name: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approval_required?: boolean
          business_id?: string
          constraints?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          execution_count?: number
          id?: string
          last_evaluated_at?: string | null
          last_executed_at?: string | null
          mode?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_autopilot_policies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_benchmarks: {
        Row: {
          business_id: string
          cohort_key: string
          cohort_size: number | null
          created_at: string
          evidence: Json
          id: string
          methodology_version: string
          metric_key: string
          metric_value: number | null
          percentile: number | null
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          business_id: string
          cohort_key: string
          cohort_size?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          methodology_version?: string
          metric_key: string
          metric_value?: number | null
          percentile?: number | null
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          business_id?: string
          cohort_key?: string
          cohort_size?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          methodology_version?: string
          metric_key?: string
          metric_value?: number | null
          percentile?: number | null
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_benchmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_business_instincts: {
        Row: {
          business_id: string
          confidence: number
          created_at: string
          evidence_count: number
          id: string
          key: string
          last_observed_at: string
          metadata: Json
          scope: string
          statement: string
          updated_at: string
        }
        Insert: {
          business_id: string
          confidence?: number
          created_at?: string
          evidence_count?: number
          id?: string
          key: string
          last_observed_at?: string
          metadata?: Json
          scope?: string
          statement: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          confidence?: number
          created_at?: string
          evidence_count?: number
          id?: string
          key?: string
          last_observed_at?: string
          metadata?: Json
          scope?: string
          statement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_instincts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_business_memory: {
        Row: {
          business_id: string
          confidence: number | null
          content: string
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          memory_type: string
          source_id: string | null
          source_type: string | null
          supersedes_id: string | null
          title: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          business_id: string
          confidence?: number | null
          content: string
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          memory_type: string
          source_id?: string | null
          source_type?: string | null
          supersedes_id?: string | null
          title: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          confidence?: number | null
          content?: string
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          memory_type?: string
          source_id?: string | null
          source_type?: string | null
          supersedes_id?: string | null
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_business_memory_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "nuva_business_memory"
            referencedColumns: ["id"]
          },
        ]
      }
      nuva_decision_evidence: {
        Row: {
          agents_consulted: string[]
          agreement: number
          business_id: string
          consensus_confidence: number
          created_at: string
          decision_id: string
          dissent: string[]
          evidence: Json
          execution_result: string | null
          guardian_decision: string | null
          id: string
          recommended_action: string | null
          signal: string
          verification_passed: boolean | null
        }
        Insert: {
          agents_consulted?: string[]
          agreement: number
          business_id: string
          consensus_confidence: number
          created_at?: string
          decision_id: string
          dissent?: string[]
          evidence?: Json
          execution_result?: string | null
          guardian_decision?: string | null
          id?: string
          recommended_action?: string | null
          signal: string
          verification_passed?: boolean | null
        }
        Update: {
          agents_consulted?: string[]
          agreement?: number
          business_id?: string
          consensus_confidence?: number
          created_at?: string
          decision_id?: string
          dissent?: string[]
          evidence?: Json
          execution_result?: string | null
          guardian_decision?: string | null
          id?: string
          recommended_action?: string | null
          signal?: string
          verification_passed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_decision_evidence_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_integration_connections: {
        Row: {
          auth_mode: string
          business_id: string
          created_at: string
          created_by: string | null
          external_account_id: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          provider: string
          scopes: string[]
          secret_ref: string | null
          status: string
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          auth_mode: string
          business_id: string
          created_at?: string
          created_by?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider: string
          scopes?: string[]
          secret_ref?: string | null
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          auth_mode?: string
          business_id?: string
          created_at?: string
          created_by?: string | null
          external_account_id?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider?: string
          scopes?: string[]
          secret_ref?: string | null
          status?: string
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_integration_events: {
        Row: {
          business_id: string
          connection_id: string | null
          created_at: string
          direction: string
          error: string | null
          event_type: string
          external_event_id: string
          id: string
          normalized: Json
          payload: Json
          payload_hash: string | null
          processed_at: string | null
          provider: string
          received_at: string
          retry_count: number
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          connection_id?: string | null
          created_at?: string
          direction: string
          error?: string | null
          event_type: string
          external_event_id: string
          id?: string
          normalized?: Json
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider: string
          received_at?: string
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          connection_id?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          event_type?: string
          external_event_id?: string
          id?: string
          normalized?: Json
          payload?: Json
          payload_hash?: string | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          retry_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "nuva_integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      nuva_intelligence_events: {
        Row: {
          business_id: string
          created_at: string
          event_type: string
          evidence: Json
          id: string
          occurred_at: string
          severity: string
          source_id: string | null
          source_table: string | null
          summary: string | null
          title: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_type: string
          evidence?: Json
          id?: string
          occurred_at?: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_type?: string
          evidence?: Json
          id?: string
          occurred_at?: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_intelligence_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_opportunities: {
        Row: {
          business_id: string
          confidence: number | null
          created_at: string
          description: string | null
          detected_at: string
          evidence: Json
          id: string
          opportunity_type: string
          potential_impact: number | null
          recommended_action: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          evidence?: Json
          id?: string
          opportunity_type: string
          potential_impact?: number | null
          recommended_action?: Json
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          evidence?: Json
          id?: string
          opportunity_type?: string
          potential_impact?: number | null
          recommended_action?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_risks: {
        Row: {
          business_id: string
          confidence: number | null
          created_at: string
          description: string | null
          detected_at: string
          evidence: Json
          id: string
          impact: number | null
          probability: number | null
          recommended_action: Json
          resolved_at: string | null
          risk_type: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          evidence?: Json
          id?: string
          impact?: number | null
          probability?: number | null
          recommended_action?: Json
          resolved_at?: string | null
          risk_type: string
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          confidence?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          evidence?: Json
          id?: string
          impact?: number | null
          probability?: number | null
          recommended_action?: Json
          resolved_at?: string | null
          risk_type?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_risks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      nuva_simulation_scenarios: {
        Row: {
          assumptions: Json
          baseline_snapshot: Json
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          name: string
          outputs: Json
          scenario_type: string
          status: string
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          baseline_snapshot?: Json
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          name: string
          outputs?: Json
          scenario_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          baseline_snapshot?: Json
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          name?: string
          outputs?: Json
          scenario_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "nuva_simulation_scenarios_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      ops_anomalies: {
        Row: {
          created_at: string
          deviations: number
          expected: number
          fingerprint: string
          id: string
          metric: string
          observed: number
          resolved_at: string | null
          severity: string
          status: string
          stddev: number
          window_bucket: string
        }
        Insert: {
          created_at?: string
          deviations: number
          expected: number
          fingerprint: string
          id?: string
          metric: string
          observed: number
          resolved_at?: string | null
          severity: string
          status?: string
          stddev: number
          window_bucket: string
        }
        Update: {
          created_at?: string
          deviations?: number
          expected?: number
          fingerprint?: string
          id?: string
          metric?: string
          observed?: number
          resolved_at?: string | null
          severity?: string
          status?: string
          stddev?: number
          window_bucket?: string
        }
        Relationships: []
      }
      ops_findings: {
        Row: {
          created_at: string
          details: Json
          fingerprint: string
          id: string
          resolved_at: string | null
          severity: string
          source: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          details?: Json
          fingerprint: string
          id?: string
          resolved_at?: string | null
          severity: string
          source: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          details?: Json
          fingerprint?: string
          id?: string
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      ops_incidents: {
        Row: {
          check_name: string
          consecutive_failures: number
          details: Json
          fingerprint: string
          id: string
          last_seen_at: string
          notified_at: string | null
          opened_at: string
          resolved_at: string | null
          severity: string
          status: string
          summary: string
          triage: Json | null
        }
        Insert: {
          check_name: string
          consecutive_failures?: number
          details?: Json
          fingerprint: string
          id?: string
          last_seen_at?: string
          notified_at?: string | null
          opened_at?: string
          resolved_at?: string | null
          severity: string
          status?: string
          summary: string
          triage?: Json | null
        }
        Update: {
          check_name?: string
          consecutive_failures?: number
          details?: Json
          fingerprint?: string
          id?: string
          last_seen_at?: string
          notified_at?: string | null
          opened_at?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          summary?: string
          triage?: Json | null
        }
        Relationships: []
      }
      ops_llm_usage: {
        Row: {
          agent: string
          created_at: string
          est_tokens: number | null
          id: number
          model: string
          provider: string
          reason: string | null
        }
        Insert: {
          agent: string
          created_at?: string
          est_tokens?: number | null
          id?: never
          model: string
          provider: string
          reason?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          est_tokens?: number | null
          id?: never
          model?: string
          provider?: string
          reason?: string | null
        }
        Relationships: []
      }
      ops_metrics_hourly: {
        Row: {
          avg_value: number
          bucket: string
          id: number
          metric: string
          sample_count: number
        }
        Insert: {
          avg_value: number
          bucket: string
          id?: never
          metric: string
          sample_count?: number
        }
        Update: {
          avg_value?: number
          bucket?: string
          id?: never
          metric?: string
          sample_count?: number
        }
        Relationships: []
      }
      owner_account_grants: {
        Row: {
          access_level: string
          active: boolean
          business_id: string
          created_at: string
          expires_at: string | null
          granted_by: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: string
          active?: boolean
          business_id: string
          created_at?: string
          expires_at?: string | null
          granted_by: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: string
          active?: boolean
          business_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "owner_account_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      owner_operational_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          environment: string
          error_fingerprint: string | null
          event_type: string
          id: string
          metric_name: string | null
          metric_value: number | null
          route: string | null
          service: string | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          environment?: string
          error_fingerprint?: string | null
          event_type: string
          id?: string
          metric_name?: string | null
          metric_value?: number | null
          route?: string | null
          service?: string | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          environment?: string
          error_fingerprint?: string | null
          event_type?: string
          id?: string
          metric_name?: string | null
          metric_value?: number | null
          route?: string | null
          service?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          business_id: string
          commerce_order: string
          created_at: string
          id: string
          provider: string
          resolved_at: string | null
          sale_id: string | null
          status: string
          token: string
        }
        Insert: {
          amount: number
          business_id: string
          commerce_order: string
          created_at?: string
          id?: string
          provider: string
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          token: string
        }
        Update: {
          amount?: number
          business_id?: string
          commerce_order?: string
          created_at?: string
          id?: string
          provider?: string
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          id: string
          processed: boolean
          provider: string
          received_at: string
          token: string
        }
        Insert: {
          id?: string
          processed?: boolean
          provider: string
          received_at?: string
          token: string
        }
        Update: {
          id?: string
          processed?: boolean
          provider?: string
          received_at?: string
          token?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          accounting_journal_id: string | null
          amount: number
          business_id: string
          created_at: string
          id: string
          method: string | null
          paid_at: string
          sale_id: string
        }
        Insert: {
          accounting_journal_id?: string | null
          amount: number
          business_id: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string
          sale_id: string
        }
        Update: {
          accounting_journal_id?: string | null
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_accounting_journal_id_fkey"
            columns: ["accounting_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      people_absences: {
        Row: {
          absence_type: string
          business_id: string
          created_at: string
          employee_id: string
          ends_on: string
          id: string
          notes: string | null
          paid: boolean
          source_document_id: string | null
          starts_on: string
        }
        Insert: {
          absence_type: string
          business_id: string
          created_at?: string
          employee_id: string
          ends_on: string
          id?: string
          notes?: string | null
          paid?: boolean
          source_document_id?: string | null
          starts_on: string
        }
        Update: {
          absence_type?: string
          business_id?: string
          created_at?: string
          employee_id?: string
          ends_on?: string
          id?: string
          notes?: string | null
          paid?: boolean
          source_document_id?: string | null
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_absences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_absences_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_afp_rates: {
        Row: {
          afp_name: string
          country_code: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          mandatory_rate: number
          source_reference: string
          source_url: string
          worker_commission: number
        }
        Insert: {
          afp_name: string
          country_code?: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          mandatory_rate?: number
          source_reference: string
          source_url: string
          worker_commission: number
        }
        Update: {
          afp_name?: string
          country_code?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          mandatory_rate?: number
          source_reference?: string
          source_url?: string
          worker_commission?: number
        }
        Relationships: []
      }
      people_attendance_events: {
        Row: {
          business_id: string
          created_at: string
          employee_id: string
          event_at: string
          event_type: string
          id: string
          metadata: Json
          source: string
        }
        Insert: {
          business_id: string
          created_at?: string
          employee_id: string
          event_at: string
          event_type: string
          id?: string
          metadata?: Json
          source?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          employee_id?: string
          event_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_attendance_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_attendance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_chile_holidays: {
        Row: {
          holiday_date: string
          holiday_type: string
          is_working_holiday: boolean
          name: string
        }
        Insert: {
          holiday_date: string
          holiday_type?: string
          is_working_holiday?: boolean
          name: string
        }
        Update: {
          holiday_date?: string
          holiday_type?: string
          is_working_holiday?: boolean
          name?: string
        }
        Relationships: []
      }
      people_compliance_items: {
        Row: {
          business_id: string
          category: string
          created_at: string
          due_date: string | null
          employee_id: string | null
          evidence_document_id: string | null
          id: string
          metadata: Json
          source_reference: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string
          due_date?: string | null
          employee_id?: string | null
          evidence_document_id?: string | null
          id?: string
          metadata?: Json
          source_reference?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          due_date?: string | null
          employee_id?: string | null
          evidence_document_id?: string | null
          id?: string
          metadata?: Json
          source_reference?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_compliance_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_compliance_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_compliance_items_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "people_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      people_contracts: {
        Row: {
          business_id: string
          contract_type: string
          created_at: string
          document_id: string | null
          employee_id: string
          end_date: string | null
          id: string
          salary_amount: number
          salary_type: string
          signed_at: string | null
          start_date: string
          status: string
          updated_at: string
          weekly_hours: number
          work_days: number
        }
        Insert: {
          business_id: string
          contract_type: string
          created_at?: string
          document_id?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          salary_amount?: number
          salary_type?: string
          signed_at?: string | null
          start_date: string
          status?: string
          updated_at?: string
          weekly_hours?: number
          work_days?: number
        }
        Update: {
          business_id?: string
          contract_type?: string
          created_at?: string
          document_id?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          salary_amount?: number
          salary_type?: string
          signed_at?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          weekly_hours?: number
          work_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_contracts_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_documents: {
        Row: {
          business_id: string
          created_at: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          metadata: Json
          status: string
          storage_path: string | null
          title: string
        }
        Insert: {
          business_id: string
          created_at?: string
          document_type: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json
          status?: string
          storage_path?: string | null
          title: string
        }
        Update: {
          business_id?: string
          created_at?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json
          status?: string
          storage_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_employees: {
        Row: {
          afp_name: string | null
          bank_account_last4: string | null
          bank_account_type: string | null
          bank_name: string | null
          birth_date: string | null
          business_id: string
          cost_center_id: string | null
          created_at: string
          department: string | null
          dependents_count: number
          email: string | null
          employment_status: string
          employment_type: string
          first_name: string
          gratification_mode: string
          health_additional_clp: number
          health_plan_uf: number | null
          health_system: string
          hire_date: string
          id: string
          job_title: string | null
          last_name: string
          manager_id: string | null
          national_id: string | null
          non_taxable_bonus: number
          other_deductions: number
          overtime_hours: number
          pension_status: string
          phone: string | null
          taxable_bonus: number
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          afp_name?: string | null
          bank_account_last4?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          birth_date?: string | null
          business_id: string
          cost_center_id?: string | null
          created_at?: string
          department?: string | null
          dependents_count?: number
          email?: string | null
          employment_status?: string
          employment_type?: string
          first_name: string
          gratification_mode?: string
          health_additional_clp?: number
          health_plan_uf?: number | null
          health_system?: string
          hire_date?: string
          id?: string
          job_title?: string | null
          last_name: string
          manager_id?: string | null
          national_id?: string | null
          non_taxable_bonus?: number
          other_deductions?: number
          overtime_hours?: number
          pension_status?: string
          phone?: string | null
          taxable_bonus?: number
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          afp_name?: string | null
          bank_account_last4?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          birth_date?: string | null
          business_id?: string
          cost_center_id?: string | null
          created_at?: string
          department?: string | null
          dependents_count?: number
          email?: string | null
          employment_status?: string
          employment_type?: string
          first_name?: string
          gratification_mode?: string
          health_additional_clp?: number
          health_plan_uf?: number | null
          health_system?: string
          hire_date?: string
          id?: string
          job_title?: string | null
          last_name?: string
          manager_id?: string | null
          national_id?: string | null
          non_taxable_bonus?: number
          other_deductions?: number
          overtime_hours?: number
          pension_status?: string
          phone?: string | null
          taxable_bonus?: number
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_gratification_ipc: {
        Row: {
          business_id: string | null
          created_at: string
          fiscal_year: number
          id: string
          index_value: number
          month: number
          source_reference: string | null
          source_url: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          fiscal_year: number
          id?: string
          index_value: number
          month: number
          source_reference?: string | null
          source_url?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          index_value?: number
          month?: number
          source_reference?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_ipc_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      people_gratification_settings: {
        Row: {
          business_id: string
          created_at: string
          effective_from: string
          effective_to: string
          fiscal_year: number
          id: string
          liquid_profit: number | null
          notes: string | null
          scheme: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          effective_from: string
          effective_to: string
          fiscal_year: number
          id?: string
          liquid_profit?: number | null
          notes?: string | null
          scheme: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string
          fiscal_year?: number
          id?: string
          liquid_profit?: number | null
          notes?: string | null
          scheme?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      people_gratification_settlements: {
        Row: {
          advances_revalued: number
          balance_credit: number
          balance_due: number
          business_id: string
          calculated_at: string
          calculation_payload: Json
          cap_amount: number | null
          employee_id: string
          fiscal_year: number
          id: string
          legal_amount: number
          scheme: string
          status: string
        }
        Insert: {
          advances_revalued?: number
          balance_credit?: number
          balance_due?: number
          business_id: string
          calculated_at?: string
          calculation_payload?: Json
          cap_amount?: number | null
          employee_id: string
          fiscal_year: number
          id?: string
          legal_amount?: number
          scheme: string
          status?: string
        }
        Update: {
          advances_revalued?: number
          balance_credit?: number
          balance_due?: number
          business_id?: string
          calculated_at?: string
          calculation_payload?: Json
          cap_amount?: number | null
          employee_id?: string
          fiscal_year?: number
          id?: string
          legal_amount?: number
          scheme?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_gratification_settlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_karin_cases: {
        Row: {
          accused_employee_id: string | null
          business_id: string
          case_type: string
          closed_at: string | null
          created_at: string
          id: string
          measures: Json
          received_at: string
          reporter_employee_id: string | null
          resolution: string | null
          restricted_notes: string | null
          status: string
        }
        Insert: {
          accused_employee_id?: string | null
          business_id: string
          case_type: string
          closed_at?: string | null
          created_at?: string
          id?: string
          measures?: Json
          received_at?: string
          reporter_employee_id?: string | null
          resolution?: string | null
          restricted_notes?: string | null
          status?: string
        }
        Update: {
          accused_employee_id?: string | null
          business_id?: string
          case_type?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          measures?: Json
          received_at?: string
          reporter_employee_id?: string | null
          resolution?: string | null
          restricted_notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_karin_cases_accused_employee_id_fkey"
            columns: ["accused_employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_karin_cases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_karin_cases_reporter_employee_id_fkey"
            columns: ["reporter_employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_leave_requests_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_legal_parameters: {
        Row: {
          country_code: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          parameter_key: string
          source_reference: string
          source_url: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          parameter_key: string
          source_reference: string
          source_url: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          parameter_key?: string
          source_reference?: string
          source_url?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      people_lre_exports: {
        Row: {
          business_id: string
          created_at: string
          file_hash: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          payload: Json
          payroll_period_id: string
          status: string
          validation_errors: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          file_hash?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          payload?: Json
          payroll_period_id: string
          status?: string
          validation_errors?: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          file_hash?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          payload?: Json
          payroll_period_id?: string
          status?: string
          validation_errors?: Json
        }
        Relationships: [
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_exports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_exports_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: true
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      people_lre_rows: {
        Row: {
          business_id: string
          created_at: string
          employee_id: string
          id: string
          payroll_period_id: string
          row_data: Json
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          employee_id: string
          id?: string
          payroll_period_id: string
          row_data?: Json
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          payroll_period_id?: string
          row_data?: Json
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_rows_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_lre_rows_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_lre_rows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_rows_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_lre_rows_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_payroll_inputs: {
        Row: {
          absences_days: number
          advance_payment: number
          business_id: string
          created_at: string
          employee_id: string
          gratification_amount: number
          id: string
          medical_leave_days: number
          medical_leave_rima: number
          non_taxable_bonus: number
          notes: string | null
          other_deductions: number
          overtime_hours: number
          payroll_period_id: string
          taxable_bonus: number
          updated_at: string
        }
        Insert: {
          absences_days?: number
          advance_payment?: number
          business_id: string
          created_at?: string
          employee_id: string
          gratification_amount?: number
          id?: string
          medical_leave_days?: number
          medical_leave_rima?: number
          non_taxable_bonus?: number
          notes?: string | null
          other_deductions?: number
          overtime_hours?: number
          payroll_period_id: string
          taxable_bonus?: number
          updated_at?: string
        }
        Update: {
          absences_days?: number
          advance_payment?: number
          business_id?: string
          created_at?: string
          employee_id?: string
          gratification_amount?: number
          id?: string
          medical_leave_days?: number
          medical_leave_rima?: number
          non_taxable_bonus?: number
          notes?: string | null
          other_deductions?: number
          overtime_hours?: number
          payroll_period_id?: string
          taxable_bonus?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_inputs_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_payroll_items: {
        Row: {
          business_id: string
          calculation_version: string
          components: Json
          created_at: string
          deductions: number
          employee_id: string
          employer_cost_amount: number
          employer_pension_additional: number
          employer_ssp: number
          gross_non_taxable: number
          gross_taxable: number
          id: string
          income_tax: number
          net_pay: number
          overtime_amount: number
          parameter_snapshot: Json
          payroll_period_id: string
          social_security: number
          vacation_amount: number
          warnings: Json
        }
        Insert: {
          business_id: string
          calculation_version?: string
          components?: Json
          created_at?: string
          deductions?: number
          employee_id: string
          employer_cost_amount?: number
          employer_pension_additional?: number
          employer_ssp?: number
          gross_non_taxable?: number
          gross_taxable?: number
          id?: string
          income_tax?: number
          net_pay?: number
          overtime_amount?: number
          parameter_snapshot?: Json
          payroll_period_id: string
          social_security?: number
          vacation_amount?: number
          warnings?: Json
        }
        Update: {
          business_id?: string
          calculation_version?: string
          components?: Json
          created_at?: string
          deductions?: number
          employee_id?: string
          employer_cost_amount?: number
          employer_pension_additional?: number
          employer_ssp?: number
          gross_non_taxable?: number
          gross_taxable?: number
          id?: string
          income_tax?: number
          net_pay?: number
          overtime_amount?: number
          parameter_snapshot?: Json
          payroll_period_id?: string
          social_security?: number
          vacation_amount?: number
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_items_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_items_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_items_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_payroll_liquidations: {
        Row: {
          business_id: string
          created_at: string
          document_payload: Json
          employee_id: string
          id: string
          issued_at: string | null
          payroll_item_id: string | null
          payroll_period_id: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          document_payload?: Json
          employee_id: string
          id?: string
          issued_at?: string | null
          payroll_item_id?: string | null
          payroll_period_id: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          document_payload?: Json
          employee_id?: string
          id?: string
          issued_at?: string | null
          payroll_item_id?: string | null
          payroll_period_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_employee_business_fk"
            columns: ["business_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_liquidations_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          calculated_at: string | null
          calculation_version: string
          closed_at: string | null
          created_at: string
          id: string
          parameter_snapshot: Json
          period_month: number
          period_year: number
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          calculated_at?: string | null
          calculation_version?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          parameter_snapshot?: Json
          period_month: number
          period_year: number
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          calculated_at?: string | null
          calculation_version?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          parameter_snapshot?: Json
          period_month?: number
          period_year?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      people_payroll_postings: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          finance_reference: string | null
          id: string
          payroll_period_id: string
          posting_key: string
          status: string
          total_amount: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          finance_reference?: string | null
          id?: string
          payroll_period_id: string
          posting_key: string
          status?: string
          total_amount?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          finance_reference?: string | null
          id?: string
          payroll_period_id?: string
          posting_key?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_postings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_postings_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_postings_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_payroll_runs: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          payroll_period_id: string
          result_summary: Json
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          payroll_period_id: string
          result_summary?: Json
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          payroll_period_id?: string
          result_summary?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_payroll_runs_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_payroll_runs_period_business_fk"
            columns: ["business_id", "payroll_period_id"]
            isOneToOne: false
            referencedRelation: "people_payroll_periods"
            referencedColumns: ["business_id", "id"]
          },
        ]
      }
      people_tax_brackets: {
        Row: {
          country_code: string
          created_at: string
          factor: number
          id: string
          max_income: number | null
          min_income: number
          period_month: number
          period_year: number
          rebate: number
          source_reference: string
          source_url: string
          tax_type: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          factor: number
          id?: string
          max_income?: number | null
          min_income: number
          period_month: number
          period_year: number
          rebate?: number
          source_reference: string
          source_url: string
          tax_type: string
        }
        Update: {
          country_code?: string
          created_at?: string
          factor?: number
          id?: string
          max_income?: number | null
          min_income?: number
          period_month?: number
          period_year?: number
          rebate?: number
          source_reference?: string
          source_url?: string
          tax_type?: string
        }
        Relationships: []
      }
      people_terminations: {
        Row: {
          business_id: string
          calculation_version: string
          components: Json
          created_at: string
          created_by: string
          deductions: number
          employee_id: string
          id: string
          notice_pay: number
          other_amount: number
          severance_amount: number
          severance_years: number
          termination_cause: string
          termination_date: string
          total_amount: number
          vacation_pay: number
        }
        Insert: {
          business_id: string
          calculation_version?: string
          components?: Json
          created_at?: string
          created_by?: string
          deductions?: number
          employee_id: string
          id?: string
          notice_pay?: number
          other_amount?: number
          severance_amount?: number
          severance_years?: number
          termination_cause: string
          termination_date: string
          total_amount?: number
          vacation_pay?: number
        }
        Update: {
          business_id?: string
          calculation_version?: string
          components?: Json
          created_at?: string
          created_by?: string
          deductions?: number
          employee_id?: string
          id?: string
          notice_pay?: number
          other_amount?: number
          severance_amount?: number
          severance_years?: number
          termination_cause?: string
          termination_date?: string
          total_amount?: number
          vacation_pay?: number
        }
        Relationships: [
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_terminations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_terminations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      people_vacation_balances: {
        Row: {
          accrued_days: number
          as_of_date: string
          available_days: number
          business_id: string
          created_at: string
          employee_id: string
          id: string
          progressive_days: number
          used_days: number
        }
        Insert: {
          accrued_days?: number
          as_of_date: string
          available_days?: number
          business_id: string
          created_at?: string
          employee_id: string
          id?: string
          progressive_days?: number
          used_days?: number
        }
        Update: {
          accrued_days?: number
          as_of_date?: string
          available_days?: number
          business_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          progressive_days?: number
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_vacation_balances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "people_vacation_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "people_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_catalog: {
        Row: {
          active: boolean
          ai_messages_monthly: number
          annual_price_clp: number
          display_name: string
          extra_user_price_clp: number
          features: Json
          included_users: number
          max_products: number
          monthly_price_clp: number
          plan: string
          storage_mb: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          ai_messages_monthly: number
          annual_price_clp: number
          display_name: string
          extra_user_price_clp: number
          features?: Json
          included_users: number
          max_products: number
          monthly_price_clp: number
          plan: string
          storage_mb: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          ai_messages_monthly?: number
          annual_price_clp?: number
          display_name?: string
          extra_user_price_clp?: number
          features?: Json
          included_users?: number
          max_products?: number
          monthly_price_clp?: number
          plan?: string
          storage_mb?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          app_version: string | null
          business_id: string | null
          environment: string
          event_name: string
          id: string
          metadata: Json
          occurred_at: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          business_id?: string | null
          environment?: string
          event_name: string
          id?: string
          metadata?: Json
          occurred_at?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          business_id?: string | null
          environment?: string
          event_name?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "platform_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      pricing_calculations: {
        Row: {
          business_id: string
          calculation_version: string
          created_at: string
          created_by: string | null
          id: string
          input_data: Json
          name: string
          product_id: string | null
          product_type: string
          result_data: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          calculation_version?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_data?: Json
          name?: string
          product_id?: string | null
          product_type?: string
          result_data?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          calculation_version?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_data?: Json
          name?: string
          product_id?: string | null
          product_type?: string
          result_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "pricing_calculations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "pricing_calculations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_codes: {
        Row: {
          business_id: string
          code: string
          code_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          product_id: string
          supplier_code: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          code: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          product_id: string
          supplier_code?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          code?: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          product_id?: string
          supplier_code?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "product_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "product_codes_business_product_fk"
            columns: ["business_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "product_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          blocked_stock: number
          business_id: string
          category: string | null
          cost: number
          created_at: string
          id: string
          image_url: string | null
          in_transit_stock: number
          low_stock_threshold: number
          max_stock: number
          name: string
          price: number
          reorder_point: number
          reserved_stock: number
          sku: string | null
          stock: number
        }
        Insert: {
          barcode?: string | null
          blocked_stock?: number
          business_id: string
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          in_transit_stock?: number
          low_stock_threshold?: number
          max_stock?: number
          name: string
          price?: number
          reorder_point?: number
          reserved_stock?: number
          sku?: string | null
          stock?: number
        }
        Update: {
          barcode?: string | null
          blocked_stock?: number
          business_id?: string
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          image_url?: string | null
          in_transit_stock?: number
          low_stock_threshold?: number
          max_stock?: number
          name?: string
          price?: number
          reorder_point?: number
          reserved_stock?: number
          sku?: string | null
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
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
      purchase_payments: {
        Row: {
          accounting_journal_id: string | null
          amount: number
          business_id: string
          created_at: string
          id: string
          method: string
          paid_at: string
          purchase_id: string
        }
        Insert: {
          accounting_journal_id?: string | null
          amount: number
          business_id: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          purchase_id: string
        }
        Update: {
          accounting_journal_id?: string | null
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_payments_accounting_journal_id_fkey"
            columns: ["accounting_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchase_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          accounting_journal_id: string | null
          accounting_posting_error: string | null
          accounting_posting_status: string
          business_id: string
          category: string
          created_at: string
          id: string
          items: Json
          notes: string | null
          purchase_date: string
          status: Database["public"]["Enums"]["purchase_status"]
          stock_applied: boolean
          supplier_id: string | null
          supplier_name: string | null
          tax_treatment: string
          total: number
          transaction_id: string | null
          vat_rate: number
        }
        Insert: {
          accounting_journal_id?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          business_id: string
          category?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stock_applied?: boolean
          supplier_id?: string | null
          supplier_name?: string | null
          tax_treatment?: string
          total?: number
          transaction_id?: string | null
          vat_rate?: number
        }
        Update: {
          accounting_journal_id?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          purchase_date?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          stock_applied?: boolean
          supplier_id?: string | null
          supplier_name?: string | null
          tax_treatment?: string
          total?: number
          transaction_id?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_accounting_journal_id_fkey"
            columns: ["accounting_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
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
          discount_pct: number
          id: string
          items: Json
          notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax: number
          terms: string | null
          total: number
          valid_until: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          customer_name: string
          discount_pct?: number
          id?: string
          items?: Json
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          discount_pct?: number
          id?: string
          items?: Json
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          terms?: string | null
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
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
      rate_limit_counters: {
        Row: {
          bucket_key: string
          count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          accounting_journal_id: string | null
          accounting_posting_error: string | null
          accounting_posting_status: string
          business_id: string
          channel: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          due_date: string | null
          id: string
          is_credit: boolean
          items: Json
          notes: string | null
          paid_amount: number
          payment_method: string | null
          pos_reference: string | null
          quote_id: string | null
          sale_date: string
          status: Database["public"]["Enums"]["sale_status"]
          stock_applied: boolean
          tax_treatment: string
          total: number
          transaction_id: string | null
          vat_rate: number
        }
        Insert: {
          accounting_journal_id?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          business_id: string
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          is_credit?: boolean
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          pos_reference?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          stock_applied?: boolean
          tax_treatment?: string
          total?: number
          transaction_id?: string | null
          vat_rate?: number
        }
        Update: {
          accounting_journal_id?: string | null
          accounting_posting_error?: string | null
          accounting_posting_status?: string
          business_id?: string
          channel?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          due_date?: string | null
          id?: string
          is_credit?: boolean
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          pos_reference?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          stock_applied?: boolean
          tax_treatment?: string
          total?: number
          transaction_id?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_accounting_journal_id_fkey"
            columns: ["accounting_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
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
      shifts: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          day_of_week: number
          employee_name: string
          employee_phone: string | null
          employee_user_id: string | null
          end_time: string
          id: string
          notes: string | null
          start_time: string
          updated_at: string
          week_start: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          day_of_week: number
          employee_name: string
          employee_phone?: string | null
          employee_user_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          updated_at?: string
          week_start: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          employee_name?: string
          employee_phone?: string | null
          employee_user_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          business_id: string
          id: string
          note: string | null
          occurred_at: string
          shipment_id: string
          status: string
        }
        Insert: {
          business_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          shipment_id: string
          status: string
        }
        Update: {
          business_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          shipment_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipment_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipment_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          business_id: string
          carrier: string | null
          city: string | null
          comuna: string | null
          content_description: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          declared_value: number | null
          delivered_at: string | null
          delivery_notes: string | null
          destination_country: string
          destination_email: string | null
          destination_postal_code: string | null
          destination_rut: string | null
          dispatched_at: string | null
          eta: string | null
          failure_reason: string | null
          id: string
          notes: string | null
          package_count: number
          payment_type: string
          priority: string
          proof_url: string | null
          recipient_contact: string | null
          reference_code: string | null
          region: string | null
          sale_id: string | null
          service_type: string
          shipping_address: string | null
          shipping_cost: number
          status: string
          tracking_number: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          business_id: string
          carrier?: string | null
          city?: string | null
          comuna?: string | null
          content_description?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_notes?: string | null
          destination_country?: string
          destination_email?: string | null
          destination_postal_code?: string | null
          destination_rut?: string | null
          dispatched_at?: string | null
          eta?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          package_count?: number
          payment_type?: string
          priority?: string
          proof_url?: string | null
          recipient_contact?: string | null
          reference_code?: string | null
          region?: string | null
          sale_id?: string | null
          service_type?: string
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          business_id?: string
          carrier?: string | null
          city?: string | null
          comuna?: string | null
          content_description?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          delivery_notes?: string | null
          destination_country?: string
          destination_email?: string | null
          destination_postal_code?: string | null
          destination_rut?: string | null
          dispatched_at?: string | null
          eta?: string | null
          failure_reason?: string | null
          id?: string
          notes?: string | null
          package_count?: number
          payment_type?: string
          priority?: string
          proof_url?: string | null
          recipient_contact?: string | null
          reference_code?: string | null
          region?: string | null
          sale_id?: string | null
          service_type?: string
          shipping_address?: string | null
          shipping_cost?: number
          status?: string
          tracking_number?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_charges: {
        Row: {
          amount: number
          attempt_started_at: string | null
          business_id: string
          commerce_order: string
          created_at: string
          flow_order: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          provider_subscription_id: string | null
          status: string
        }
        Insert: {
          amount: number
          attempt_started_at?: string | null
          business_id: string
          commerce_order: string
          created_at?: string
          flow_order?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          status: string
        }
        Update: {
          amount?: number
          attempt_started_at?: string | null
          business_id?: string
          commerce_order?: string
          created_at?: string
          flow_order?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "subscription_charges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
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
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      tax_annual_returns: {
        Row: {
          accounting_result: number
          balance_to_pay: number
          business_id: string
          created_at: string
          due_date: string | null
          filed_at: string | null
          id: string
          idpc_amount: number
          notes: string | null
          other_credits: number
          paid_at: string | null
          ppm_credits: number
          sii_reference: string | null
          status: string
          tax_result: number
          tax_year: number
          taxable_base: number
          updated_at: string
          working_papers: Json
        }
        Insert: {
          accounting_result?: number
          balance_to_pay?: number
          business_id: string
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          idpc_amount?: number
          notes?: string | null
          other_credits?: number
          paid_at?: string | null
          ppm_credits?: number
          sii_reference?: string | null
          status?: string
          tax_result?: number
          tax_year: number
          taxable_base?: number
          updated_at?: string
          working_papers?: Json
        }
        Update: {
          accounting_result?: number
          balance_to_pay?: number
          business_id?: string
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          idpc_amount?: number
          notes?: string | null
          other_credits?: number
          paid_at?: string | null
          ppm_credits?: number
          sii_reference?: string | null
          status?: string
          tax_result?: number
          tax_year?: number
          taxable_base?: number
          updated_at?: string
          working_papers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_annual_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      tax_f29_returns: {
        Row: {
          business_id: string
          calculation_json: Json
          created_at: string
          credit_iva: number
          credit_iva_remanent: number
          debit_iva: number
          id: string
          iva_to_pay: number
          other_taxes: number
          ppm_amount: number
          ppm_base: number
          ppm_rate: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          sales_exempt_net: number
          sales_export_net: number
          sales_taxable_net: number
          tax_period_id: string
          total_documents: number
          total_to_pay: number
          updated_at: string
          withholdings: number
        }
        Insert: {
          business_id: string
          calculation_json?: Json
          created_at?: string
          credit_iva?: number
          credit_iva_remanent?: number
          debit_iva?: number
          id?: string
          iva_to_pay?: number
          other_taxes?: number
          ppm_amount?: number
          ppm_base?: number
          ppm_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sales_exempt_net?: number
          sales_export_net?: number
          sales_taxable_net?: number
          tax_period_id: string
          total_documents?: number
          total_to_pay?: number
          updated_at?: string
          withholdings?: number
        }
        Update: {
          business_id?: string
          calculation_json?: Json
          created_at?: string
          credit_iva?: number
          credit_iva_remanent?: number
          debit_iva?: number
          id?: string
          iva_to_pay?: number
          other_taxes?: number
          ppm_amount?: number
          ppm_base?: number
          ppm_rate?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sales_exempt_net?: number
          sales_export_net?: number
          sales_taxable_net?: number
          tax_period_id?: string
          total_documents?: number
          total_to_pay?: number
          updated_at?: string
          withholdings?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_f29_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "tax_f29_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["business_id", "tax_period_id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_f29_returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_f29_returns_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: true
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_f29_returns_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: true
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["tax_period_id"]
          },
        ]
      }
      tax_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          due_date: string | null
          id: string
          paid_amount: number
          payment_date: string | null
          payment_reference: string | null
          receipt_document_id: string | null
          status: string
          tax_period_id: string | null
          tax_type: string
          tax_year: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          payment_date?: string | null
          payment_reference?: string | null
          receipt_document_id?: string | null
          status?: string
          tax_period_id?: string | null
          tax_type: string
          tax_year?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          payment_date?: string | null
          payment_reference?: string | null
          receipt_document_id?: string | null
          status?: string
          tax_period_id?: string | null
          tax_type?: string
          tax_year?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_payments_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "tax_supporting_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["tax_period_id"]
          },
        ]
      }
      tax_periods: {
        Row: {
          business_id: string
          created_at: string
          due_date: string | null
          filed_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          period_month: number
          period_year: number
          sii_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month: number
          period_year: number
          sii_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          due_date?: string | null
          filed_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_month?: number
          period_year?: number
          sii_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      tax_profiles: {
        Row: {
          accounting_basis: string
          activity_start_date: string | null
          business_id: string
          fiscal_year_end_month: number
          id: string
          ppm_rate: number | null
          tax_regime: string
          updated_at: string
          vat_status: string
        }
        Insert: {
          accounting_basis?: string
          activity_start_date?: string | null
          business_id: string
          fiscal_year_end_month?: number
          id?: string
          ppm_rate?: number | null
          tax_regime?: string
          updated_at?: string
          vat_status?: string
        }
        Update: {
          accounting_basis?: string
          activity_start_date?: string | null
          business_id?: string
          fiscal_year_end_month?: number
          id?: string
          ppm_rate?: number | null
          tax_regime?: string
          updated_at?: string
          vat_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      tax_supporting_documents: {
        Row: {
          business_id: string
          counterparty_name: string | null
          counterparty_rut: string | null
          created_at: string
          document_date: string | null
          document_number: string | null
          document_type: string
          exempt_amount: number
          file_name: string | null
          id: string
          iva_amount: number
          metadata: Json
          net_amount: number
          source: string
          status: string
          storage_path: string | null
          tax_period_id: string | null
          total_amount: number
        }
        Insert: {
          business_id: string
          counterparty_name?: string | null
          counterparty_rut?: string | null
          created_at?: string
          document_date?: string | null
          document_number?: string | null
          document_type: string
          exempt_amount?: number
          file_name?: string | null
          id?: string
          iva_amount?: number
          metadata?: Json
          net_amount?: number
          source?: string
          status?: string
          storage_path?: string | null
          tax_period_id?: string | null
          total_amount?: number
        }
        Update: {
          business_id?: string
          counterparty_name?: string | null
          counterparty_rut?: string | null
          created_at?: string
          document_date?: string | null
          document_number?: string | null
          document_type?: string
          exempt_amount?: number
          file_name?: string | null
          id?: string
          iva_amount?: number
          metadata?: Json
          net_amount?: number
          source?: string
          status?: string
          storage_path?: string | null
          tax_period_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_supporting_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "tax_supporting_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["business_id", "tax_period_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["tax_period_id"]
          },
        ]
      }
      tax_working_papers: {
        Row: {
          accounting_amount: number
          business_id: string
          concept: string
          created_at: string
          created_by: string | null
          credit_amount: number
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section: string
          sii_code: string | null
          sii_form: string | null
          source: string | null
          status: string
          supporting_document_id: string | null
          tax_adjustment: number
          tax_period_id: string | null
          tax_year: number
          taxable_amount: number
          updated_at: string
        }
        Insert: {
          accounting_amount?: number
          business_id: string
          concept: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section: string
          sii_code?: string | null
          sii_form?: string | null
          source?: string | null
          status?: string
          supporting_document_id?: string | null
          tax_adjustment?: number
          tax_period_id?: string | null
          tax_year: number
          taxable_amount?: number
          updated_at?: string
        }
        Update: {
          accounting_amount?: number
          business_id?: string
          concept?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string
          sii_code?: string | null
          sii_form?: string | null
          source?: string | null
          status?: string
          supporting_document_id?: string | null
          tax_adjustment?: number
          tax_period_id?: string | null
          tax_year?: number
          taxable_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_working_papers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_working_papers_supporting_document_id_fkey"
            columns: ["supporting_document_id"]
            isOneToOne: false
            referencedRelation: "tax_supporting_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_working_papers_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_working_papers_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["tax_period_id"]
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
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
    }
    Views: {
      business_plan_limits: {
        Row: {
          ai_messages_monthly: number | null
          annual_price_clp: number | null
          business_id: string | null
          display_name: string | null
          extra_user_price_clp: number | null
          features: Json | null
          included_users: number | null
          max_products: number | null
          monthly_price_clp: number | null
          plan: string | null
          storage_mb: number | null
        }
        Relationships: []
      }
      businesses_public: {
        Row: {
          comuna: string | null
          created_at: string | null
          id: string | null
          industry: Database["public"]["Enums"]["business_industry"] | null
          logo_url: string | null
          name: string | null
          public_contact_email: string | null
          public_contact_phone: string | null
          public_description: string | null
          public_photos: string[] | null
          public_slug: string | null
          public_social_links: Json | null
        }
        Insert: {
          comuna?: string | null
          created_at?: string | null
          id?: string | null
          industry?: Database["public"]["Enums"]["business_industry"] | null
          logo_url?: string | null
          name?: string | null
          public_contact_email?: string | null
          public_contact_phone?: string | null
          public_description?: string | null
          public_photos?: string[] | null
          public_slug?: string | null
          public_social_links?: Json | null
        }
        Update: {
          comuna?: string | null
          created_at?: string | null
          id?: string | null
          industry?: Database["public"]["Enums"]["business_industry"] | null
          logo_url?: string | null
          name?: string | null
          public_contact_email?: string | null
          public_contact_phone?: string | null
          public_description?: string | null
          public_photos?: string[] | null
          public_slug?: string | null
          public_social_links?: Json | null
        }
        Relationships: []
      }
      payment_intents_safe: {
        Row: {
          amount: number | null
          business_id: string | null
          commerce_order: string | null
          created_at: string | null
          id: string | null
          provider: string | null
          resolved_at: string | null
          sale_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          business_id?: string | null
          commerce_order?: string | null
          created_at?: string | null
          id?: string | null
          provider?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          business_id?: string | null
          commerce_order?: string | null
          created_at?: string | null
          id?: string | null
          provider?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "payment_intents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cash_flow_daily: {
        Row: {
          business_id: string | null
          flow_date: string | null
          inflows: number | null
          net_flow: number | null
          outflows: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_account_balances: {
        Row: {
          account_id: string | null
          account_type: string | null
          balance: number | null
          business_id: string | null
          code: string | null
          credits: number | null
          debits: number | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_cash_flow_daily: {
        Row: {
          business_id: string | null
          cash_in: number | null
          cash_out: number | null
          flow_date: string | null
          net_cash: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_cash_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_close_health: {
        Row: {
          blocking_controls: number | null
          business_id: string | null
          close_readiness: string | null
          open_controls: number | null
          passed_controls: number | null
          total_controls: number | null
        }
        Relationships: []
      }
      v_financial_close_status: {
        Row: {
          blocked_items: number | null
          business_id: string | null
          close_state: string | null
          passed_items: number | null
          pending_items: number | null
          period_end: string | null
          period_start: string | null
          total_items: number | null
          warning_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_close_checklist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_control_center: {
        Row: {
          blocked_postings: number | null
          blocking_controls: number | null
          business_id: string | null
          close_readiness: string | null
          linked_source_entries: number | null
          missing_source_entries: number | null
          open_controls: number | null
          open_tax_amount: number | null
          open_tax_payments: number | null
          overall_status: string | null
          passed_controls: number | null
          pending_posting_amount: number | null
          pending_postings: number | null
          posted_postings: number | null
          total_controls: number | null
          total_sources: number | null
        }
        Relationships: []
      }
      v_financial_income_statement_monthly: {
        Row: {
          account_type: string | null
          business_id: string | null
          credit: number | null
          debit: number | null
          month: number | null
          signed_amount: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_management_pnl_monthly: {
        Row: {
          business_id: string | null
          gross_profit: number | null
          net_result: number | null
          operating_expense: number | null
          other_income: number | null
          period_start: string | null
          purchases_total: number | null
          sales_total: number | null
        }
        Relationships: []
      }
      v_financial_management_summary: {
        Row: {
          business_id: string | null
          cost_of_sales: number | null
          net_cash: number | null
          open_tax_periods: number | null
          operating_expenses: number | null
          posted_journals: number | null
          revenue: number | null
          unposted_journals: number | null
        }
        Insert: {
          business_id?: string | null
          cost_of_sales?: never
          net_cash?: never
          open_tax_periods?: never
          operating_expenses?: never
          posted_journals?: never
          revenue?: never
          unposted_journals?: never
        }
        Update: {
          business_id?: string | null
          cost_of_sales?: never
          net_cash?: never
          open_tax_periods?: never
          operating_expenses?: never
          posted_journals?: never
          revenue?: never
          unposted_journals?: never
        }
        Relationships: []
      }
      v_financial_pnl_monthly: {
        Row: {
          business_id: string | null
          cost_of_sales: number | null
          month: string | null
          net_result: number | null
          operating_expenses: number | null
          other_expenses: number | null
          other_income: number | null
          revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_posting_health: {
        Row: {
          blocked_count: number | null
          business_id: string | null
          last_queued_at: string | null
          pending_amount: number | null
          pending_count: number | null
          posted_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "financial_posting_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_source_reconciliation: {
        Row: {
          amount: number | null
          business_id: string | null
          source_date: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
        }
        Relationships: []
      }
      v_financial_tax_control: {
        Row: {
          business_id: string | null
          control_status: string | null
          credit_iva: number | null
          credit_iva_remanent: number | null
          debit_iva: number | null
          due_date: string | null
          f29_id: string | null
          filed_at: string | null
          iva_to_pay: number | null
          other_taxes: number | null
          paid_at: string | null
          period_month: number | null
          period_status: string | null
          period_year: number | null
          ppm_amount: number | null
          ppm_base: number | null
          ppm_rate: number | null
          sales_exempt_net: number | null
          sales_taxable_net: number | null
          sii_reference: string | null
          tax_period_id: string | null
          total_documents: number | null
          total_to_pay: number | null
          withholdings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_treasury_daily: {
        Row: {
          business_id: string | null
          flow_date: string | null
          inflow: number | null
          net_flow: number | null
          outflow: number | null
        }
        Relationships: []
      }
      v_financial_trial_balance: {
        Row: {
          account_id: string | null
          account_type: string | null
          business_id: string | null
          code: string | null
          credit: number | null
          debit: number | null
          name: string | null
          net_credit: number | null
          net_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "accounting_journals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_financial_vat_working_paper: {
        Row: {
          business_id: string | null
          input_vat: number | null
          net_vat: number | null
          output_vat: number | null
          period: string | null
          taxable_purchases_gross: number | null
          taxable_sales_gross: number | null
          vat_position: string | null
        }
        Relationships: []
      }
      v_tax_control_monthly: {
        Row: {
          business_id: string | null
          credit_iva: number | null
          credit_iva_remanent: number | null
          debit_iva: number | null
          due_date: string | null
          filed_at: string | null
          iva_to_pay: number | null
          other_taxes: number | null
          paid_at: string | null
          period_month: number | null
          period_year: number | null
          ppm_amount: number | null
          status: string | null
          supporting_document_count: number | null
          total_documents: number | null
          total_to_pay: number | null
          withholdings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_periods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
        ]
      }
      v_tax_document_summary: {
        Row: {
          business_id: string | null
          input_iva: number | null
          output_iva: number | null
          purchase_docs: number | null
          purchases_net: number | null
          sales_docs: number | null
          sales_net: number | null
          tax_period_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_supporting_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["business_id", "id"]
          },
          {
            foreignKeyName: "tax_supporting_business_period_fk"
            columns: ["business_id", "tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["business_id", "tax_period_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_plan_limits"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_close_health"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_control_center"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_financial_management_summary"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_supporting_documents_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "v_financial_tax_control"
            referencedColumns: ["tax_period_id"]
          },
        ]
      }
    }
    Functions: {
      adjust_product_stock: {
        Args: {
          p_delta: number
          p_product_id: string
          p_reason?: string
          p_source_id?: string
          p_source_type?: string
        }
        Returns: {
          product_id: string
          stock_after: number
          stock_before: number
        }[]
      }
      approve_people_payroll_period: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      calculate_people_annual_gratification: {
        Args: { p_employee_id: string; p_year: number }
        Returns: number
      }
      calculate_people_gratification_settlement: {
        Args: { p_employee_id: string; p_year: number }
        Returns: number
      }
      calculate_people_payroll_period: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      calculate_people_termination: {
        Args: {
          p_employee_id: string
          p_notice_given?: boolean
          p_termination_cause: string
          p_termination_date: string
        }
        Returns: Json
      }
      calculate_people_vacation_balance: {
        Args: { p_as_of_date?: string; p_employee_id: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      claim_pending_invitations: { Args: never; Returns: number }
      cleanup_rate_limit_counters: { Args: never; Returns: undefined }
      close_cash_register: {
        Args: { p_cash_register_id: string; p_counted_cash: number }
        Returns: {
          business_id: string
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_registers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_people_payroll_period: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      convert_quote_to_sale: { Args: { p_quote_id: string }; Returns: string }
      create_demo_business_for_current_user: { Args: never; Returns: string }
      create_fast_sale: {
        Args: {
          p_channel?: string
          p_customer_id?: string
          p_customer_name?: string
          p_due_date?: string
          p_is_credit?: boolean
          p_items?: Json
          p_notes?: string
          p_payment_method?: string
        }
        Returns: string
      }
      create_mobile_scanner_session: {
        Args: { p_business_id: string }
        Returns: {
          expires_at: string
          pair_code: string
          session_id: string
        }[]
      }
      create_product_from_scanner: {
        Args: {
          p_business_id: string
          p_category?: string
          p_code: string
          p_code_type?: string
          p_cost?: number
          p_initial_stock?: number
          p_low_stock_threshold?: number
          p_name: string
          p_price?: number
          p_sku?: string
        }
        Returns: {
          code: string
          product_id: string
          sku: string
          stock_after: number
          stock_before: number
        }[]
      }
      create_shipment_for_sale: {
        Args: {
          p_eta?: string
          p_notes?: string
          p_priority?: string
          p_sale_id: string
          p_service_type?: string
          p_shipping_address?: string
        }
        Returns: string
      }
      finalize_inventory_stocktake: {
        Args: { p_stocktake_id: string }
        Returns: {
          adjusted_products: number
          status: string
          stocktake_id: string
          total_adjustment: number
        }[]
      }
      generate_people_liquidations: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      generate_product_sku:
        | {
            Args: { p_business_id: string; p_prefix?: string }
            Returns: string
          }
        | { Args: { p_prefix?: string }; Returns: string }
      get_business_members: {
        Args: { p_business_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          permissions: Json
          position: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }[]
      }
      get_cash_register_summary: {
        Args: { p_cash_register_id: string }
        Returns: {
          business_id: string
          cash_income: number
          cash_refunds: number
          cash_register_id: string
          cash_sales: number
          cash_withdrawals: number
          closed_at: string
          counted_cash: number
          difference: number
          expected_cash: number
          movement_count: number
          opened_at: string
          opening_amount: number
          status: string
        }[]
      }
      get_collection_priorities: {
        Args: never
        Returns: {
          balance: number
          customer_id: string
          customer_name: string
          customer_phone: string
          days_overdue: number
          due_date: string
          paid_amount: number
          priority: string
          sale_id: string
          total: number
        }[]
      }
      get_dashboard_kpis: {
        Args: { p_business_id: string }
        Returns: {
          expense: number
          income: number
          inventory_value: number
          net: number
          products_count: number
          sales_count: number
        }[]
      }
      get_nuva_business_baseline: {
        Args: { p_business_id: string; p_days?: number }
        Returns: Json
      }
      get_nuva_operating_snapshot: {
        Args: { p_business_id: string; p_days?: number }
        Returns: Json
      }
      get_owner_operational_metrics: {
        Args: { p_window_hours?: number }
        Returns: Json
      }
      get_platform_ai_metrics: { Args: never; Returns: Json }
      get_platform_owner_metrics:
        | { Args: never; Returns: Json }
        | { Args: { p_owner_id: string }; Returns: Json }
      get_public_catalog: {
        Args: { p_slug: string }
        Returns: {
          available_stock: number
          business_description: string
          business_email: string
          business_logo_url: string
          business_name: string
          business_phone: string
          product_category: string
          product_id: string
          product_image_url: string
          product_name: string
          product_price: number
          product_sku: string
        }[]
      }
      get_replenishment_recommendations: {
        Args: never
        Returns: {
          available_stock: number
          estimated_cost: number
          product_id: string
          product_name: string
          recommended_qty: number
          reorder_point: number
          sku: string
          unit_cost: number
          urgency: string
        }[]
      }
      increment_ai_usage: {
        Args: {
          p_business_id: string
          p_daily_limit: number
          p_user_id: string
        }
        Returns: boolean
      }
      increment_ai_usage_monthly: {
        Args: {
          p_business_id: string
          p_monthly_limit: number
          p_units?: number
          p_user_id: string
        }
        Returns: boolean
      }
      increment_forum_topic_views: {
        Args: { topic_id: string }
        Returns: undefined
      }
      invite_team_member: {
        Args: {
          _business_id: string
          _email: string
          _permissions: Json
          _position: string
          _role: Database["public"]["Enums"]["member_role"]
        }
        Returns: Json
      }
      is_owner_granted_business: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      lookup_product_by_code: {
        Args: { p_code: string }
        Returns: {
          barcode: string
          business_id: string
          code_type: string
          cost: number
          name: string
          price: number
          product_id: string
          sku: string
          stock: number
        }[]
      }
      nuva_core_integrity_audit: {
        Args: never
        Returns: {
          check_name: string
          failures: number
          severity: string
        }[]
      }
      open_cash_register: {
        Args: { p_business_id: string; p_opening_amount: number }
        Returns: {
          business_id: string
          closed_at: string | null
          closed_by: string | null
          counted_cash: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_registers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ops_detect_anomalies: {
        Args: { p_min_history?: number }
        Returns: {
          deviations: number
          expected: number
          metric: string
          observed: number
          stddev: number
          window_bucket: string
        }[]
      }
      ops_record_metric: {
        Args: { p_metric: string; p_value: number }
        Returns: undefined
      }
      pair_mobile_scanner: {
        Args: { p_pair_code: string }
        Returns: {
          business_id: string
          expires_at: string
          session_id: string
        }[]
      }
      people_accrued_vacation_days: {
        Args: { p_as_of: string; p_hire_date: string }
        Returns: number
      }
      people_add_holiday_days: {
        Args: { p_habiles: number; p_start: string }
        Returns: string
      }
      people_medical_leave_days: {
        Args: { p_employee_id: string; p_end: string; p_start: string }
        Returns: number
      }
      people_monthly_salary_for_period: {
        Args: {
          p_contract_end: string
          p_contract_start: string
          p_period_end: string
          p_period_start: string
          p_salary: number
        }
        Returns: number
      }
      people_unpaid_absence_days: {
        Args: { p_employee_id: string; p_end: string; p_start: string }
        Returns: number
      }
      people_valid_rut: { Args: { p_rut: string }; Returns: boolean }
      people_working_days_between: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      post_financial_journal: {
        Args: {
          p_business_id: string
          p_description: string
          p_entry_date: string
          p_lines?: Json
          p_source_id?: string
          p_source_type: string
        }
        Returns: string
      }
      post_people_payroll_to_finance: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      post_purchase_accounting: {
        Args: { p_purchase_id: string }
        Returns: string
      }
      post_purchase_payment_accounting: {
        Args: { p_payment_id: string }
        Returns: string
      }
      post_sale_accounting: { Args: { p_sale_id: string }; Returns: string }
      post_sale_payment_accounting: {
        Args: { p_payment_id: string }
        Returns: string
      }
      prepare_people_lre: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      purge_owner_operational_telemetry: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      queue_financial_source: {
        Args: {
          p_business_id: string
          p_gross: number
          p_source_date: string
          p_source_id: string
          p_source_type: string
        }
        Returns: string
      }
      record_cash_register_movement: {
        Args: {
          p_amount: number
          p_cash_register_id: string
          p_movement_type: string
          p_reason: string
        }
        Returns: {
          amount: number
          business_id: string
          cash_register_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_register_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_ai_tool_quota: {
        Args: { p_business_id: string; p_tool_id: string; p_units?: number }
        Returns: undefined
      }
      reserve_ai_tool_quota: {
        Args: { p_business_id: string; p_tool_id: string; p_units?: number }
        Returns: Json
      }
      review_people_leave_request: {
        Args: { p_action: string; p_leave_request_id: string; p_paid?: boolean }
        Returns: Json
      }
      revoke_mobile_scanner_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      seed_financial_accounts: {
        Args: { p_business_id: string }
        Returns: number
      }
      submit_mobile_scanner_event: {
        Args: {
          p_client_event_id: string
          p_code: string
          p_input_type?: string
          p_session_id: string
        }
        Returns: {
          business_id: string
          client_event_id: string
          code: string
          created_at: string
          id: string
          input_type: string
          normalized_code: string
          session_id: string
        }
        SetofOptions: {
          from: "*"
          to: "mobile_scanner_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      track_platform_event: {
        Args: {
          p_app_version?: string
          p_business_id?: string
          p_environment?: string
          p_event_name: string
          p_metadata?: Json
          p_session_id?: string
        }
        Returns: string
      }
      validate_people_payroll_period: {
        Args: { p_payroll_period_id: string }
        Returns: Json
      }
      validate_sii_dte_core: {
        Args: {
          p_document_type: number
          p_exempt_amount: number
          p_folio: number
          p_issue_date: string
          p_net_amount: number
          p_total_amount: number
          p_vat_amount: number
        }
        Returns: Json
      }
    }
    Enums: {
      ai_channel: "web"
      ai_role: "user" | "assistant" | "system"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ai_channel: ["web"],
      ai_role: ["user", "assistant", "system"],
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
