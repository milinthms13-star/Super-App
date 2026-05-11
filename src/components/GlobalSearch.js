import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GlobalSearchEnhanced.css";

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);

  const searchCategories = [
    { id: "products", label: "Products", icon: "P", module: "ecommerce" },
    { id: "people", label: "People & Vendors", icon: "U", module: "messaging" },
    { id: "homes", label: "Homes & Properties", icon: "H", module: "realestate" },
    { id: "loans", label: "Loans & Finance", icon: "F", module: "finance" },
    { id: "freelancers", label: "Freelancers & Local Services", icon: "W", module: "freelancer" },
    { id: "bills", label: "Bill Pay & Utilities", icon: "B", module: "billpay" },
    { id: "learning", label: "Skill Learning & Career", icon: "K", module: "skilllearning" },
    { id: "rides", label: "Rides", icon: "R", module: "ridesharing" },
    { id: "food", label: "Food & Restaurants", icon: "D", module: "fooddelivery" },
    { id: "jobs", label: "Jobs & Services", icon: "J", module: "classifieds" },
    { id: "posts", label: "Community Posts", icon: "S", module: "socialmedia" },
    { id: "listings", label: "Local Listings", icon: "L", module: "localmarket" },
  ];

  const performSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const mockResults = [];
    searchCategories.forEach((category) => {
      if (category.label.toLowerCase().includes(query.toLowerCase())) {
        mockResults.push({
          id: `${category.id}-1`,
          category: category.id,
          categoryLabel: category.label,
          icon: category.icon,
          module: category.module,
          title: `${query} in ${category.label}`,
          subtitle: `Browse ${category.label.toLowerCase()}`,
        });
      }
    });

    if (query.length > 0) {
      ["products", "people", "homes", "loans", "freelancers", "bills", "learning", "rides"].forEach((cat) => {
        const categoryData = searchCategories.find((entry) => entry.id === cat);
        if (categoryData) {
          mockResults.push({
            id: `${cat}-demo-${query.length}`,
            category: cat,
            categoryLabel: categoryData.label,
            icon: categoryData.icon,
            module: categoryData.module,
            title: `"${query}" - Top ${categoryData.label}`,
            subtitle: `Popular in ${categoryData.label}`,
          });
        }
      });
    }

    setSearchResults(mockResults);
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const handleCategoryClick = (moduleId) => {
    navigate(`/${moduleId}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleResultClick = (result) => {
    navigate(`/${result.module}?search=${encodeURIComponent(searchQuery)}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="global-search-container">
      <div className="global-search-input-wrapper">
        <button
          type="button"
          className="search-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title="Search NilaHub ecosystem"
        >
          <span className="search-icon">S</span>
          <span className="search-placeholder">Search products, homes, rides...</span>
        </button>

        {isOpen && <div className="search-overlay" onClick={() => setIsOpen(false)} />}

        {isOpen && (
          <div className="search-dropdown">
            <div className="search-input-box">
              <span className="search-icon">S</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search everything in NilaHub..."
                className="search-input"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  X
                </button>
              )}
            </div>

            {searchQuery ? (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  <>
                    <div className="search-results-header">
                      Found {searchResults.length} results for "{searchQuery}"
                    </div>
                    <div className="search-results-list">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="search-result-item"
                          onClick={() => handleResultClick(result)}
                        >
                          <span className="result-icon">{result.icon}</span>
                          <div className="result-content">
                            <p className="result-title">{result.title}</p>
                            <p className="result-subtitle">{result.subtitle}</p>
                          </div>
                          <span className="result-arrow">-&gt;</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="search-no-results">
                    No results for "{searchQuery}". Try searching by category.
                  </div>
                )}
              </div>
            ) : (
              <div className="search-categories">
                <div className="search-categories-header">Browse by category</div>
                <div className="search-categories-grid">
                  {searchCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="search-category-btn"
                      onClick={() => handleCategoryClick(category.module)}
                    >
                      <span className="category-icon">{category.icon}</span>
                      <span className="category-label">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="search-footer">
              <p className="search-tip">Tip: Search across all platforms instantly</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
