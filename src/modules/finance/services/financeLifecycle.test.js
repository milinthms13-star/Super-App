import { buildLeadAlerts, buildLeadTimeline, deriveRepaymentInsights } from "./financeLifecycle";

describe("financeLifecycle", () => {
  test("builds fallback timeline when statusTimeline is missing", () => {
    const timeline = buildLeadTimeline({
      leadId: "FIN-001",
      status: "lead_received",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0].status).toBe("lead_received");
  });

  test("creates repayment insights for disbursed lead", () => {
    const insights = deriveRepaymentInsights({
      status: "disbursed",
      statusTimeline: [
        {
          status: "disbursed",
          changedAt: "2026-01-15T00:00:00.000Z",
        },
      ],
    });

    expect(insights).not.toBeNull();
    expect(insights.nextDueDateLabel).toBeTruthy();
  });

  test("flags document pending alerts", () => {
    const alerts = buildLeadAlerts([
      {
        leadId: "FIN-002",
        status: "documents_pending",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(alerts.some((item) => item.id.includes("docs-pending"))).toBe(true);
  });
});
