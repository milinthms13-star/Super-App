import React from "react";

const LoanMarketplaceTab = ({ categories, filters, onFilterChange }) => {
  const { selectedCategory, filteredLoanCategories, filteredInstitutions, institutionLoadState } = filters;
  const { setSelectedCategory } = onFilterChange;

  return (
    <section className="finance-section">
      <div className="finance-section-header">
        <h2>Loan Marketplace</h2>
        <p>Discover offers quickly with trusted partner highlights.</p>
      </div>

      <div className="finance-chip-row">
        <button
          type="button"
          className={selectedCategory === "all" ? "active" : ""}
          onClick={() => setSelectedCategory("all")}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={selectedCategory === category.id ? "active" : ""}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.title}
          </button>
        ))}
      </div>

      <div className="finance-card-grid finance-loan-category-grid">
        {filteredLoanCategories.map((category) => (
          <article key={category.id} className="finance-card finance-loan-category-card">
            <strong>{category.title}</strong>
            <p>{category.summary}</p>
          </article>
        ))}
      </div>

      <div className="finance-section-header">
        <h3>Institution Listings</h3>
        <p>EMI, approval speed and trust signals at a glance.</p>
      </div>

      {institutionLoadState.loading ? <p>Loading institutions...</p> : null}
      {institutionLoadState.error ? <p className="finance-error">{institutionLoadState.error}</p> : null}

      <div className="finance-card-grid finance-institution-grid">
        {filteredInstitutions.map((institution) => (
          <article key={institution._id} className="finance-card finance-institution-card">
            <div className="finance-card-summary">
              <strong>{institution.name}</strong>
              {institution.verifiedPartner ? <span className="finance-verified">Trusted</span> : null}
            </div>
            <div className="finance-tag-row">
              <span>{String(institution.type || "").toUpperCase()}</span>
              <span>{institution.approvalTime?.minDays || 1}-{institution.approvalTime?.maxDays || 7} day approval</span>
            </div>
            <p><strong>Interest:</strong> {institution.interestRange?.min || "-"}% - {institution.interestRange?.max || "-"}%</p>
            <p><strong>Processing Fee:</strong> {institution.processingFee?.value}{institution.processingFee?.type === "percentage" ? "%" : " INR"}</p>
            <p><strong>Service Cities:</strong> {(institution.serviceDistricts || []).slice(0, 4).join(", ")}{(institution.serviceDistricts || []).length > 4 ? "..." : ""}</p>
            <p><strong>Rating:</strong> {institution.ratings?.average || "4.0"} ({institution.ratings?.totalReviews || 0} reviews)</p>
            <button type="button">Apply with {institution.name}</button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default LoanMarketplaceTab;
