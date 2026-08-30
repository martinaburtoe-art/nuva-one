/**
 * These FormData keys are produced by text/select inputs in the accounting workspaces.
 * Keeping the literal-key overload here documents that boundary contract without
 * globally pretending that every FormData value is a string.
 */
declare global {
  interface FormData {
    get(name: "code" | "name" | "account_type" | "tax_category" | "debit_account" | "credit_account" | "account_id" | "tax_code" | "date"): string | null;
  }
}

export {};
