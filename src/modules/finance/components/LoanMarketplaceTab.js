import React from "react";

const LoanMarketplaceTab = ({ institutions, categories, filters, onFilterChange }) => {
  const { selectedCategory, filteredLoanCategories, filteredInstitutions, institutionLoadState } = filters;
  const { setSelectedCategory } = onFilterChange;

  return (
    <section className="finance-section">
      <div className="finance-section-header">
        <h2>Loan & Institution Marketplace</h2>
        <p>Collapsible summary cards first, detailed info on demand.</p>
      </div>

      <div className="finance-chip-row">
        <button type="button" onClick={() => setSelectedCategory("all")}>All</button>
        {categories.map((category) => (
          <button key={category.id} type="button" onClick={() => setSelectedCategory(category.id)}>
            {category.title}
          </button>
        ))}
      </div>

      <div className="finance-card-grid">
        {filteredLoanCategories.map((category) => (
          <details key={category.id} className="finance-card">
            <summary>
              <strong>{category.title}</strong>
            </summary>
            <p>{category.summary}</p>
          </details>
        ))}
      </div>

      <div className="finance-section-header">
        <h3>Institution Listings</h3>
        <p>Real onboarding fields with verified badges, fees, turnaround and ratings.</p>
      </div>

      {institutionLoadState.loading ? <p>Loading institutions...</p> : null}
      {institutionLoadState.error ? <p className="finance-error">{institutionLoadState.error}</p> : null}

      <div className="finance-card-grid">
        {filteredInstitutions.map((institution) => (
          <details key={institution._id} className="finance-card">
            <summary className="finance-card-summary">
              <span>{institution.name}</span>
              {institution.verifiedPartner ? <span className="finance-verified">Verified Partner</span> : null}
            </summary>
            <p><strong>Type:</strong> {institution.type}</p>
            <p><strong>Branch:</strong> {institution.branchAddress}</p>
            <p><strong>Contact:</strong> {institution.contactPerson?.name} ({institution.contactPerson?.phone})</p>
            <p><strong>Service Districts:</strong> {(institution.serviceDistricts || []).join(", ")}</p>
            <p><strong>Approval Time:</strong> {institution.approvalTime?.minDays}-{institution.approvalTime?.maxDays} days</p>
            <p><strong>Processing Fee:</strong> {institution.processingFee?.value}{institution.processingFee?.type === "percentage" ? "%" : " INR"}</p>
            <p><strong>Commission Model:</strong> {institution.commissionModel?.type} {institution.commissionModel?.value}</p>
            <p><strong>Rating:</strong> {institution.ratings?.average} ({institution.ratings?.totalReviews} reviews)</p>
          </details>
        ))}
      </div>
    </section>
  );
};

export default LoanMarketplaceTab;
