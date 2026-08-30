export type StudioDatabase = {
  public: {
    Tables: {
      ai_tool_registry: {
        Row: { id: string; cost_units: number; enabled: boolean };
        Insert: { id: string; cost_units: number; enabled?: boolean };
        Update: Partial<{ id: string; cost_units: number; enabled: boolean }>;
        Relationships: [];
      };
      ai_asset_library: {
        Row: { id: string; business_id: string; user_id: string; job_id: string | null; asset_type: string; title: string; storage_path: string; public_url: string | null; metadata: unknown };
        Insert: { id?: string; business_id: string; user_id: string; job_id?: string | null; asset_type: string; title: string; storage_path: string; public_url?: string | null; metadata?: unknown };
        Update: Partial<{ id: string; business_id: string; user_id: string; job_id: string | null; asset_type: string; title: string; storage_path: string; public_url: string | null; metadata: unknown }>;
        Relationships: [];
      };
      nuva_studio_jobs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      nuva_studio_job_steps: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      nuva_studio_job_callbacks: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      nuva_studio_campaign_cycles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      nuva_studio_campaigns: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      audit_log: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_ai_tool_quota: { Args: { p_business_id: string; p_tool_id: string; p_units: number }; Returns: boolean };
      release_ai_tool_quota: { Args: { p_business_id: string; p_tool_id: string; p_units: number }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
