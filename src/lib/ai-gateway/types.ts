export type NuvaPlan = "starter" | "pro";

export type AiCapability =
  | "chat"
  | "research"
  | "marketing"
  | "copywriting"
  | "image"
  | "image_edit"
  | "video"
  | "voice"
  | "brand"
  | "strategy"
  | "document"
  | "automation";

export type AiProvider = "google" | "openai" | "fish_audio" | "n8n" | "internal";

export interface AiToolDefinition {
  id: string;
  label: string;
  capability: AiCapability;
  provider: AiProvider;
  model?: string;
  enabled: boolean;
  costUnits: number;
  plans: NuvaPlan[];
  dailyLimit?: number;
  monthlyLimit?: number;
  description: string;
}

export interface AiUsageDecision {
  allowed: boolean;
  reason?: "disabled" | "plan" | "daily_limit" | "monthly_limit" | "provider_unavailable";
  remainingUnits?: number;
}

export interface AiGenerationRequest {
  businessId: string;
  capability: AiCapability;
  prompt: string;
  toolId?: string;
  metadata?: Record<string, unknown>;
}
