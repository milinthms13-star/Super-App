describe("JobPortal module go-live smoke", () => {
  it("loads jobportal hub and core 360 sections", () => {
    cy.visit("/jobportal");
    cy.contains("Live Job Listings", { timeout: 20000 }).should("be.visible");
    cy.contains("AI Job Match").should("be.visible");
    cy.contains("Free Government Job Portals").should("be.visible");
    cy.contains("Career Tips Assistant").should("be.visible");
  });
});
