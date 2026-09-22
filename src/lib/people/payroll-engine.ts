export type PayrollParameters = {
  ordinaryWeeklyHours: number;
  overtimeMultiplier: number;
  minimumMonthlyWage?: number;
  sisRate?: number;
  employeePensionRate?: number;
  healthRate?: number;
  unemploymentEmployeeRate?: number;
  unemploymentEmployerRate?: number;
  taxableCeiling?: number;
};

export type PayrollInput = {
  baseSalary: number;
  taxableAllowances?: number;
  nonTaxableAllowances?: number;
  bonuses?: number;
  commissions?: number;
  overtimeHours?: number;
  overtimeHourlyRate?: number;
  employeePensionRate?: number;
  healthRate?: number;
  unemploymentEmployeeRate?: number;
  unemploymentEmployerRate?: number;
  employerOtherRate?: number;
};

export type PayrollResult = {
  ordinaryGross: number;
  overtimePay: number;
  gross: number;
  taxableGross: number;
  nonTaxableTotal: number;
  employeeDeductions: number;
  netBeforeOtherDeductions: number;
  employerContributions: number;
  employerCost: number;
  warnings: string[];
  breakdown: Record<string, number>;
};

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonNegative = (value: number | undefined) => Math.max(0, Number(value ?? 0));

/**
 * Deterministic payroll core. Legal rates are injected from the versioned
 * parameter registry; they are deliberately never hard-coded here.
 */
export function calculatePayroll(input: PayrollInput, params: PayrollParameters): PayrollResult {
  const base = nonNegative(input.baseSalary);
  const taxableAllowances = nonNegative(input.taxableAllowances);
  const nonTaxableAllowances = nonNegative(input.nonTaxableAllowances);
  const bonuses = nonNegative(input.bonuses);
  const commissions = nonNegative(input.commissions);
  const overtimeHours = nonNegative(input.overtimeHours);
  const overtimeRate = nonNegative(input.overtimeHourlyRate);
  const overtimePay = overtimeHours * overtimeRate * Math.max(1, params.overtimeMultiplier);
  const ordinaryGross = base + taxableAllowances + bonuses + commissions;
  const gross = ordinaryGross + overtimePay;
  const taxableGross = params.taxableCeiling ? Math.min(gross, params.taxableCeiling) : gross;

  const pensionRate = nonNegative(input.employeePensionRate ?? params.employeePensionRate);
  const healthRate = nonNegative(input.healthRate ?? params.healthRate);
  const unemploymentEmployeeRate = nonNegative(input.unemploymentEmployeeRate ?? params.unemploymentEmployeeRate);
  const unemploymentEmployerRate = nonNegative(input.unemploymentEmployerRate ?? params.unemploymentEmployerRate);
  const employerOtherRate = nonNegative(input.employerOtherRate);

  const pension = taxableGross * pensionRate;
  const health = taxableGross * healthRate;
  const unemploymentEmployee = taxableGross * unemploymentEmployeeRate;
  const employeeDeductions = pension + health + unemploymentEmployee;
  const unemploymentEmployer = taxableGross * unemploymentEmployerRate;
  const employerOther = taxableGross * employerOtherRate;
  const employerContributions = unemploymentEmployer + employerOther;
  const employerCost = gross + nonTaxableAllowances + employerContributions;
  const netBeforeOtherDeductions = gross + nonTaxableAllowances - employeeDeductions;

  const warnings: string[] = [];
  if (params.minimumMonthlyWage !== undefined && base < params.minimumMonthlyWage) {
    warnings.push("El sueldo base está bajo el parámetro de remuneración mínima configurado; revisar régimen y jornada antes de aprobar.");
  }
  if (params.ordinaryWeeklyHours <= 0) warnings.push("La jornada ordinaria semanal no está configurada.");
  if (overtimeHours > 0 && overtimeRate <= 0) warnings.push("Existen horas extraordinarias sin valor hora configurado.");

  return {
    ordinaryGross: round(ordinaryGross),
    overtimePay: round(overtimePay),
    gross: round(gross),
    taxableGross: round(taxableGross),
    nonTaxableTotal: round(nonTaxableAllowances),
    employeeDeductions: round(employeeDeductions),
    netBeforeOtherDeductions: round(netBeforeOtherDeductions),
    employerContributions: round(employerContributions),
    employerCost: round(employerCost),
    warnings,
    breakdown: {
      baseSalary: round(base),
      taxableAllowances: round(taxableAllowances),
      bonuses: round(bonuses),
      commissions: round(commissions),
      overtimePay: round(overtimePay),
      pension: round(pension),
      health: round(health),
      unemploymentEmployee: round(unemploymentEmployee),
      unemploymentEmployer: round(unemploymentEmployer),
      employerOther: round(employerOther),
    },
  };
}

export function validatePayrollParameters(params: PayrollParameters): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(params.ordinaryWeeklyHours) || params.ordinaryWeeklyHours <= 0 || params.ordinaryWeeklyHours > 45) errors.push("ordinaryWeeklyHours inválido");
  if (!Number.isFinite(params.overtimeMultiplier) || params.overtimeMultiplier < 1) errors.push("overtimeMultiplier inválido");
  for (const [key, value] of Object.entries(params)) {
    if (key === "ordinaryWeeklyHours" || key === "overtimeMultiplier") continue;
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) errors.push(`${key} inválido`);
  }
  return errors;
}
