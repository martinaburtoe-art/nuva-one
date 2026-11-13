import {
  getIndustryProfile,
  INDUSTRY_PROFILES,
  type IndustryCapability,
  type IndustryProfile,
  type IndustryProfileId,
} from "@/lib/industry-profiles";
import {
  getAvailableIndustryCapabilities,
  getCapabilityReadiness,
} from "@/lib/industry-capability-readiness";

export type IndustryOnboardingQuestion = {
  id: string;
  prompt: string;
  required: false;
};

export type IndustryOnboardingPlan = {
  profile: IndustryProfile;
  questions: IndustryOnboardingQuestion[];
  suggestedUnits: readonly string[];
  enabledCapabilities: IndustryCapability[];
  plannedCapabilities: IndustryCapability[];
  supportsSecondaryProfile: true;
  siiActivityCode: {
    required: false;
    canAddMultiple: true;
    mustBeConfirmedByUser: true;
  };
};

/**
 * Builds the sector-specific onboarding contract.
 *
 * This is a presentation/data contract only: it does not persist a profile,
 * activate a module, or infer a tax activity. Persistence belongs to the
 * tenant-scoped onboarding flow and must be introduced with a reviewed
 * additive database migration.
 */
export function buildIndustryOnboardingPlan(
  profileId: IndustryProfileId | string | null | undefined,
): IndustryOnboardingPlan {
  const profile = getIndustryProfile(profileId) ?? getIndustryProfile("general_business")!;
  const enabledCapabilities = getAvailableIndustryCapabilities(profile.capabilities);
  const enabled = new Set(enabledCapabilities);

  return {
    profile,
    questions: profile.operationalQuestions.map((prompt, index) => ({
      id: `${profile.id}:operation:${index + 1}`,
      prompt,
      required: false,
    })),
    suggestedUnits: profile.suggestedUnits,
    enabledCapabilities,
    plannedCapabilities: profile.capabilities.filter((capability) => !enabled.has(capability)),
    supportsSecondaryProfile: true,
    siiActivityCode: {
      required: false,
      canAddMultiple: true,
      mustBeConfirmedByUser: true,
    },
  };
}

export function getIndustryOnboardingPlans(): IndustryOnboardingPlan[] {
  return INDUSTRY_PROFILES.map((profile) => buildIndustryOnboardingPlan(profile.id));
}

export function isIndustryCapabilityEnabled(
  capability: IndustryCapability,
): boolean {
  return getCapabilityReadiness(capability).status === "available";
}

export type IndustryOnboardingSelection = {
  primary: IndustryOnboardingPlan;
  secondary: IndustryOnboardingPlan[];
  questions: IndustryOnboardingQuestion[];
  suggestedUnits: string[];
  enabledCapabilities: IndustryCapability[];
  plannedCapabilities: IndustryCapability[];
  unknownSecondaryProfileIds: string[];
  maxSecondaryProfiles: 3;
};

/**
 * Combines a primary business model with up to three secondary activities.
 * Unknown secondary IDs are returned for visible validation; they are never
 * silently converted into another profile.
 */
export function buildIndustryOnboardingSelection(
  primaryProfileId: IndustryProfileId | string | null | undefined,
  secondaryProfileIds: readonly string[] = [],
): IndustryOnboardingSelection {
  const primary = buildIndustryOnboardingPlan(primaryProfileId);
  const uniqueSecondaryIds = [...new Set(secondaryProfileIds)]
    .filter((id) => id !== primary.profile.id);
  const acceptedIds = uniqueSecondaryIds.slice(0, 3);
  const overflowIds = uniqueSecondaryIds.slice(3);
  const secondary = acceptedIds
    .map((id) => getIndustryProfile(id))
    .filter((profile): profile is IndustryProfile => Boolean(profile))
    .map((profile) => buildIndustryOnboardingPlan(profile.id));
  const acceptedSet = new Set(secondary.map((plan) => plan.profile.id));
  const unknownSecondaryProfileIds = [
    ...uniqueSecondaryIds.filter((id) => !acceptedSet.has(id)),
    ...overflowIds,
  ];

  const allPlans = [primary, ...secondary];
  const unique = <T,>(values: T[]) => [...new Set(values)];
  return {
    primary,
    secondary,
    questions: allPlans.flatMap((plan) => plan.questions),
    suggestedUnits: unique(allPlans.flatMap((plan) => [...plan.suggestedUnits])),
    enabledCapabilities: unique(allPlans.flatMap((plan) => plan.enabledCapabilities)),
    plannedCapabilities: unique(allPlans.flatMap((plan) => plan.plannedCapabilities)),
    unknownSecondaryProfileIds,
    maxSecondaryProfiles: 3,
  };
}
