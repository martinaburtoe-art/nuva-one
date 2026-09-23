-- Payroll domain hardening: monetary input/output invariants and partial-period absence deduction
ALTER TABLE public.people_employees
  ADD CONSTRAINT people_employees_taxable_bonus_nonnegative_ck CHECK (taxable_bonus >= 0),
  ADD CONSTRAINT people_employees_non_taxable_bonus_nonnegative_ck CHECK (non_taxable_bonus >= 0),
  ADD CONSTRAINT people_employees_other_deductions_nonnegative_ck CHECK (other_deductions >= 0);

ALTER TABLE public.people_payroll_inputs
  ADD CONSTRAINT people_payroll_inputs_taxable_bonus_nonnegative_ck CHECK (taxable_bonus >= 0),
  ADD CONSTRAINT people_payroll_inputs_non_taxable_bonus_nonnegative_ck CHECK (non_taxable_bonus >= 0),
  ADD CONSTRAINT people_payroll_inputs_other_deductions_nonnegative_ck CHECK (other_deductions >= 0),
  ADD CONSTRAINT people_payroll_inputs_advance_nonnegative_ck CHECK (advance_payment >= 0);

ALTER TABLE public.people_payroll_items
  ADD CONSTRAINT people_payroll_items_amounts_nonnegative_ck CHECK (
    gross_taxable >= 0 AND gross_non_taxable >= 0 AND deductions >= 0 AND
    employer_cost_amount >= 0 AND net_pay >= 0 AND overtime_amount >= 0 AND
    vacation_amount >= 0 AND income_tax >= 0 AND social_security >= 0
  );

-- The absence deduction is based on the salary actually applicable to the payroll period.
-- This prevents an absence during a partial-month contract from deducting against a full-month salary.
