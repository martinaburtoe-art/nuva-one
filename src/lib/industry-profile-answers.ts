import { getIndustryProfile, type IndustryProfileId } from "@/lib/industry-profiles";

export type IndustryAnswerChoice = "yes" | "no";
export type IndustryAnswerDraft = Record<string, IndustryAnswerChoice | undefined>;

/**
 * Persist only questions actually answered by the owner.
 * Question keys are derived from the stable registry order, never user text.
 */
export function serializeIndustryAnswers(
  profileId: IndustryProfileId | string | null | undefined,
  draft: IndustryAnswerDraft,
): Record<string, boolean> {
  const profile = getIndustryProfile(profileId);
  if (!profile) return {};
  return Object.fromEntries(
    profile.operationalQuestions.flatMap((_, index) => {
      const answer = draft["operation_" + (index + 1)];
      return answer === "yes" || answer === "no"
        ? [["operation_" + (index + 1), answer === "yes"]]
        : [];
    }),
  );
}
