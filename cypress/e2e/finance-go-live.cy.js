describe("Finance module go-live smoke", () => {
  it("loads finance hub and key actions", () => {
    cy.visit("/finance");
    cy.contains("Nila Finance Hub", { timeout: 20000 }).should("be.visible");
    cy.contains("Apply Now").should("be.visible");
    cy.contains("Compare Offers").should("be.visible");
  });
});
