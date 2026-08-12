export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
        Relationships: []
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
        Relationships: []
      }
      ai_usage_daily: {
        Row: { business_id: string; message_count: number; usage_date: string }
        Insert: { business_id: string; message_count?: number; usage_date?: string }
        Update: { business_id?: string; message_count?: number; usage_date?: string }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          billing_failed_attempts: number
          comuna: string | null
          created_at: string
          flow_card_status: string
          flow_customer_id: string | null
          giro: string | null
          id: string
          industry: Database["public"]["Enums"]["business_industry"]
          logo_url: string | null
          name: string
          next_charge_date: string | null
          owner_id: string
          plan: string
          public_description: string | null
          public_enabled: boolean
          public_slug: string | null
          size: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          tax_id: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          address?: string | null
          billing_failed_attempts?: number
          comuna?: string | null
          created_at?: string
          flow_card_status?: string
          flow_customer_id?: string | null
          giro?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          name: string
          next_charge_date?: string | null
          owner_id?: string
          plan?: string
          public_description?: string | null
          public_enabled?: boolean
          public_slug?: string | null
          size?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tax_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          address?: string | null
          billing_failed_attempts?: number
          comuna?: string | null
          created_at?: string
          flow_card_status?: string
          flow_customer_id?: string | null
          giro?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["business_industry"]
          logo_url?: string | null
          name?: string
          next_charge_date?: string | null
          owner_id?: string
          plan?: string
          public_description?: string | null
          public_enabled?: boolean
          public_slug?: string | null
          size?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tax_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      collection_reminders: {
        Row: {
          business_id: string
          channel: string
          id: string
          message_content: string | null
          sale_id: string
          sent_at: string
          status: string
        }
        Insert: {
          business_id: string
          channel?: string
          id?: string
          message_content?: string | null
          sale_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          channel?: string
          id?: string
          message_content?: string | null
          sale_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      customer_activities: {
        Row: {
          business_id: string
          completed: boolean
          completed_at: string | null
          content: string
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          id: string
          type: string
        }
        Insert: {
          business_id: string
          completed?: boolean
          completed_at?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          type?: string
        }
        Update: {
          business_id?: string
          completed?: boolean
          completed_at?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          type?: string
        }
        Relationships: []
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
          status?: string
          tags?: string[]
          tax_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      payment_webhook_events: {
        Row: { id: string; processed: boolean; provider: string; received_at: string; token: string }
        Insert: { id?: string; processed?: boolean; provider: string; received_at?: string; token: string }
        Update: { id?: string; processed?: boolean; provider?: string; received_at?: string; token?: string }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          method: string | null
          paid_at: string
          sale_id: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string
          sale_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: string | null
          paid_at?: string
          sale_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          business_id: string
          category: string | null
          cost: number
          created_at: string
          id: string
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string | null
          stock?: number
        }
        Relationships: []
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
          total: number
          transaction_id: string | null
        }
        Insert: {
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
          total?: number
          transaction_id?: string | null
        }
        Update: {
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
          total?: number
          transaction_id?: string | null
        }
        Relationships: []
      }
      quote_followups: {
        Row: {
          business_id: string
          channel: string
          id: string
          message_content: string | null
          quote_id: string
          sent_at: string
          status: string
        }
        Insert: {
          business_id: string
          channel?: string
          id?: string
          message_content?: string | null
          quote_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          channel?: string
          id?: string
          message_content?: string | null
          quote_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
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
          sent_at: string | null
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
          sent_at?: string | null
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
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: { bucket_key: string; count: number; window_start: string }
        Insert: { bucket_key: string; count?: number; window_start: string }
        Update: { bucket_key?: string; count?: number; window_start?: string }
        Relationships: []
      }
      sales: {
        Row: {
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
          due_date?: string | null
          id?: string
          is_credit?: boolean
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
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
          due_date?: string | null
          id?: string
          is_credit?: boolean
          items?: Json
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          quote_id?: string | null
          sale_date?: string
          status?: Database["public"]["Enums"]["sale_status"]
          stock_applied?: boolean
          total?: number
          transaction_id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      subscription_charges: {
        Row: {
          amount: number
          business_id: string
          commerce_order: string
          created_at: string
          flow_order: string | null
          id: string
          status: string
        }
        Insert: {
          amount: number
          business_id: string
          commerce_order: string
          created_at?: string
          flow_order?: string | null
          id?: string
          status: string
        }
        Update: {
          amount?: number
          business_id?: string
          commerce_order?: string
          created_at?: string
          flow_order?: string | null
          id?: string
          status?: string
        }
        Relationships: []
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
        Relationships: []
      }
      system_alerts: {
        Row: { created_at: string; id: string; message: string; metadata: Json | null; source: string }
        Insert: { created_at?: string; id?: string; message: string; metadata?: Json | null; source: string }
        Update: { created_at?: string; id?: string; message?: string; metadata?: Json | null; source?: string }
        Relationships: []
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
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          access_token: string
          active: boolean
          auto_general_ai: boolean
          auto_price_query: boolean
          auto_stock_query: boolean
          business_id: string
          created_at: string
          display_phone_number: string | null
          id: string
          phone_number_id: string
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          access_token: string
          active?: boolean
          auto_general_ai?: boolean
          auto_price_query?: boolean
          auto_stock_query?: boolean
          business_id: string
          created_at?: string
          display_phone_number?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          active?: boolean
          auto_general_ai?: boolean
          auto_price_query?: boolean
          auto_stock_query?: boolean
          business_id?: string
          created_at?: string
          display_phone_number?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          business_id: string
          created_at: string
          direction: string
          from_number: string
          id: string
          intent: string | null
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          direction: string
          from_number: string
          id?: string
          intent?: string | null
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          direction?: string
          from_number?: string
          id?: string
          intent?: string | null
        }
        Relationships: []
      }
      whatsapp_owner_links: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          id: string
          owner_phone_number: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          id?: string
          owner_phone_number: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          id?: string
          owner_phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      businesses_public: {
        Row: {
          created_at: string | null
          id: string | null
          industry: Database["public"]["Enums"]["business_industry"] | null
          name: string | null
          public_description: string | null
          public_slug: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          industry?: Database["public"]["Enums"]["business_industry"] | null
          name?: string | null
          public_description?: string | null
          public_slug?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          industry?: Database["public"]["Enums"]["business_industry"] | null
          name?: string | null
          public_description?: string | null
          public_slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_bucket_key: string; p_max_requests: number; p_window_seconds: number }
        Returns: boolean
      }
      claim_pending_invitations: { Args: never; Returns: number }
      cleanup_rate_limit_counters: { Args: never; Returns: undefined }
      increment_forum_topic_views: { Args: { topic_id: string }; Returns: undefined }
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
      increment_ai_usage: {
        Args: { p_business_id: string; p_daily_limit: number }
        Returns: boolean
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
    }
    Enums: {
      ai_channel: "web" | "whatsapp"
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
      quote_status: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired"
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
      ai_channel: ["web", "whatsapp"],
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
      quote_status: ["draft", "sent", "viewed", "accepted", "rejected", "expired"],
      sale_status: ["draft", "pending", "paid", "cancelled"],
      tx_type: ["income", "expense"],
    },
  },
} as const
