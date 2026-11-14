import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";

export type DocumentTemplateDesign = {
  brandColor?: string;
  showLogo?: boolean;
  showTaxId?: boolean;
  footerNote?: string;
};

export function useDocumentTemplate() {
  const { active } = useActiveBusiness();
  return useQuery({
    queryKey: ["document_templates", active?.id],
    enabled: !!active?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates" as any)
        .select("*")
        .eq("business_id", active!.id)
        .eq("is_default", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        // Older production environments may not have received the additive template migration yet.
        // Keep PDF generation usable with the safe built-in theme until that migration is deployed.
        if (error.code === "42P01" || error.code === "PGRST205") return null;
        throw error;
      }
      return data as any | null;
    },
  });
}
