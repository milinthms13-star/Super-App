import { buildEmiSchedule, calculateEmi } from "./financeMath";

describe("financeMath", () => {
  test("calculates EMI for standard input", () => {
    const emi = calculateEmi(500000, 12, 60);
    expect(emi).toBeGreaterThan(10000);
    expect(emi).toBeLessThan(12000);
  });

  test("returns zero EMI for invalid inputs", () => {
    expect(calculateEmi(0, 10, 36)).toBe(0);
    expect(calculateEmi(100000, 10, 0)).toBe(0);
  });

  test("builds schedule with prepayment reducing closing balance", () => {
    const result = buildEmiSchedule({
      principal: 300000,
      annualInterest: 10,
      tenureMonths: 24,
      prepaymentAmount: 20000,
      prepaymentMonth: 6,
    });

    expect(result.schedule.length).toBeGreaterThan(0);
    expect(result.schedule[5].prepayment).toBe(20000);
    expect(result.totalPayable).toBeGreaterThan(0);
  });
});
