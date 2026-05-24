/** Credit cost per billable action — see billing.md */

export const CREDIT_ACTIONS = [
  "lead_search.shallow",
  "lead_search.deep",
  "script.generate",
  "site.generate",
  "site.edit",
  "google.verify",
] as const;

export type CreditAction = (typeof CREDIT_ACTIONS)[number];

export const CREDIT_COSTS: Record<CreditAction, number> = {
  "lead_search.shallow": 5,
  "lead_search.deep": 20,
  "script.generate": 2,
  "site.generate": 40,
  "site.edit": 10,
  "google.verify": 1,
};

export function creditCost(action: CreditAction): number {
  return CREDIT_COSTS[action];
}

export const CREDIT_ACTION_LABELS: Record<CreditAction, string> = {
  "lead_search.shallow": "Quick lead search",
  "lead_search.deep": "Deep lead search",
  "script.generate": "AI call script",
  "site.generate": "Website preview (full)",
  "site.edit": "Website Studio edit",
  "google.verify": "Google listing verify",
};
