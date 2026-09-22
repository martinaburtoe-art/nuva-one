import { describe, expect, it } from "vitest";
import { calculatePayroll, validatePayrollParameters } from "./payroll-engine";

describe("Nüva People payroll engine", () => {
  const params = {
    ordinaryWeeklyHours: 42,
    overtimeMultiplier: 1.5,
    minimumMonthlyWage: 553553,
    employeePensionRate: 0.1144,
    healthRate: 0.07,
    unemploymentEmployeeRate: 0.006,
    unemploymentEmployerRate: 0.024,
  };

  it("calculates gross, deductions and employer cost deterministically", () => {
    const result = calculatePayroll({ baseSalary: 1_000_000, overtimeHours: 2, overtimeHourlyRate: 5_000 }, params);
    expect(result.ordinaryGross).toBe(1_000_000);
    expect(result.overtimePay).toBe(15_000);
    expect(result.gross).toBe(1_015_000);
    expect(result.employeeDeductions).toBeGreaterThan(0);
    expect(result.employerCost).toBeGreaterThan(result.gross);
  });

  it("never creates negative payroll components", () => {
    const result = calculatePayroll({ baseSalary: -100, bonuses: -10, overtimeHours: -2 }, params);
    expect(result.gross).toBe(0);
    expect(result.employeeDeductions).toBe(0);
    expect(result.employerCost).toBe(0);
  });

  it("emits a warning when base salary is below the configured minimum", () => {
    const result = calculatePayroll({ baseSalary: 500_000 }, params);
    expect(result.warnings.some((warning) => warning.includes("remuneración mínima"))).toBe(true);
  });

  it("rejects invalid legal parameter sets", () => {
    expect(validatePayrollParameters({ ...params, ordinaryWeeklyHours: 0 })).toContain("ordinaryWeeklyHours inválido");
    expect(validatePayrollParameters({ ...params, overtimeMultiplier: 0 })).toContain("overtimeMultiplier inválido");
  });
});
