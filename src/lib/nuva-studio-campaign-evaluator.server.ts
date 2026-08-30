import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Metric = {
  id: string;
  metric_name: string;
  metric_value: number | string;
  source: string;
  source_reference: string | null;
  observed_at: string;
};

type Evaluation = {
  id: string;
  decision: "no_data" | "keep" | "modify" | "retry" | "change_strategy";
  confidence: number;
  evidence: unknown[];
  missing_metrics: string[];
  recommended_changes: unknown[];
  metrics_snapshot: Metric[];
};

function db(supabase: SupabaseClient<Database>) {
  return supabase as unknown as { from: (table: string) => any };
}

const HIGHER_IS_BETTER = new Set([
  "ctr",
  "click_through_rate",
  "conversion_rate",
  "engagement_rate",
  "roas",
  "reach",
  "impressions",
  "clicks",
  "conversions",
]);

const LOWER_IS_BETTER = new Set([
  "cpa",
  "cpc",
  "cost_per_acquisition",
  "cost_per_click",
  "cost_per_conversion",
]);

function normalizedMetricName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function numeric(value: number | string) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function relativeDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

export async function evaluateStudioCampaignCycle(args: {
  supabase: SupabaseClient<Database>;
  businessId: string;
  campaignId: string;
  cycleId: string;
  cycleNumber: number;
  jobStatus: string;
}): Promise<Evaluation> {
  const database = db(args.supabase);
  const { data: metrics, error: metricsError } = await database
    .from("nuva_studio_campaign_metrics")
    .select("id, metric_name, metric_value, source, source_reference, observed_at")
    .eq("business_id", args.businessId)
    .eq("campaign_id", args.campaignId)
    .eq("cycle_id", args.cycleId)
    .order("observed_at", { ascending: true });
  if (metricsError) throw new Error(metricsError.message);

  const currentMetrics = (metrics ?? []) as Metric[];
  const latestObservedAt = currentMetrics.reduce((latest, metric) => metric.observed_at > latest ? metric.observed_at : latest, "");
  const { data: latestEvaluation, error: latestEvaluationError } = await database
    .from("nuva_studio_campaign_evaluations")
    .select("*")
    .eq("cycle_id", args.cycleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestEvaluationError) throw new Error(latestEvaluationError.message);
  if (latestEvaluation && (!latestObservedAt || String(latestEvaluation.created_at) >= latestObservedAt)) {
    return latestEvaluation as Evaluation;
  }

  let decision: Evaluation["decision"] = "keep";
  let confidence = 0.5;
  const evidence: unknown[] = [];
  const missingMetrics: string[] = [];
  const recommendedChanges: unknown[] = [];

  if (args.jobStatus === "failed" || args.jobStatus === "dead_letter") {
    decision = "retry";
    confidence = 0.95;
    evidence.push({ type: "execution", jobStatus: args.jobStatus });
    recommendedChanges.push("Retry the failed execution before changing campaign strategy.");
  } else if (currentMetrics.length === 0) {
    decision = "no_data";
    confidence = 1;
    missingMetrics.push("performance metrics");
    evidence.push({ type: "data_availability", status: "no_observed_metrics" });
    recommendedChanges.push("Collect externally observed campaign performance metrics before optimizing.");
  } else {
    const { data: previousMetrics, error: previousMetricsError } = await database
      .from("nuva_studio_campaign_metrics")
      .select("metric_name, metric_value, observed_at")
      .eq("business_id", args.businessId)
      .eq("campaign_id", args.campaignId)
      .neq("cycle_id", args.cycleId)
      .order("observed_at", { ascending: false });
    if (previousMetricsError) throw new Error(previousMetricsError.message);

    const previousByMetric = new Map<string, number[]>();
    for (const metric of (previousMetrics ?? []) as Array<{ metric_name: string; metric_value: number | string }>) {
      const value = numeric(metric.metric_value);
      if (value === null) continue;
      const key = normalizedMetricName(metric.metric_name);
      const values = previousByMetric.get(key) ?? [];
      values.push(value);
      previousByMetric.set(key, values);
    }

    let materialDeclines = 0;
    let materialImprovements = 0;
    let comparableMetrics = 0;
    const unsupportedMetrics: string[] = [];

    for (const metric of currentMetrics) {
      const current = numeric(metric.metric_value);
      if (current === null) continue;
      const key = normalizedMetricName(metric.metric_name);
      const previous = previousByMetric.get(key)?.[0];
      if (previous === undefined) {
        evidence.push({ type: "baseline", metric: key, current });
        continue;
      }

      const delta = relativeDelta(current, previous);
      if (delta === null) {
        evidence.push({ type: "comparison", metric: key, current, previous, delta: null, comparable: false });
        continue;
      }
      comparableMetrics += 1;
      const higherIsBetter = HIGHER_IS_BETTER.has(key);
      const lowerIsBetter = LOWER_IS_BETTER.has(key);
      if (!higherIsBetter && !lowerIsBetter) {
        unsupportedMetrics.push(key);
        evidence.push({ type: "comparison", metric: key, current, previous, delta, direction: "unknown" });
        continue;
      }

      const improved = higherIsBetter ? delta >= 0.05 : delta <= -0.05;
      const declined = higherIsBetter ? delta <= -0.10 : delta >= 0.10;
      if (improved) materialImprovements += 1;
      if (declined) materialDeclines += 1;
      evidence.push({ type: "comparison", metric: key, current, previous, delta, improved, declined });
    }

    if (materialDeclines >= 2 && materialDeclines > materialImprovements) {
      decision = "change_strategy";
      confidence = 0.9;
      recommendedChanges.push("Change campaign strategy because multiple comparable KPIs materially deteriorated.");
    } else if (materialDeclines >= 1 && materialDeclines > materialImprovements) {
      decision = "modify";
      confidence = 0.8;
      recommendedChanges.push("Modify the next cycle using the observed declining KPI as the primary constraint.");
    } else if (comparableMetrics === 0) {
      decision = "keep";
      confidence = 0.55;
      recommendedChanges.push("Keep the current strategy while establishing a comparable baseline for the next cycle.");
    } else {
      decision = "keep";
      confidence = materialImprovements > 0 ? 0.85 : 0.7;
      recommendedChanges.push("Keep the current strategy; continue collecting comparable observed KPIs.");
    }

    if (unsupportedMetrics.length > 0) {
      missingMetrics.push(...Array.from(new Set(unsupportedMetrics)).map((metric) => `direction for ${metric}`));
    }
  }

  const payload = {
    business_id: args.businessId,
    campaign_id: args.campaignId,
    cycle_id: args.cycleId,
    decision,
    confidence,
    evidence,
    missing_metrics: missingMetrics,
    recommended_changes: recommendedChanges,
    metrics_snapshot: currentMetrics,
  };
  const { data: created, error: createError } = await database
    .from("nuva_studio_campaign_evaluations")
    .insert(payload)
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return created as Evaluation;
}
