import React from 'react';
import ProductCard from '../ProductCard';
import { resolveProductImageSrc } from '../productImage';

const EcommerceMarketplace = ({
  visibleProducts,
  favorites,
  marketplaceView,
  marketplaceSearch,
  selectedCategory,
  selectedSubcategory,
  selectedSeller,
  marketplaceMinPrice,
  marketplaceMaxPrice,
  marketplaceMinRating,
  marketplaceInStockOnly,
  marketplaceSort,
  esSearchResults,
  esSearchFallback,
  marketplaceFacetSummary,
  filteredProducts,
  sortedProducts,
  onQuickView,
  addToCart,
  loadMoreMarketplaceProducts,
  marketplacePagination,
}) => {
  return (
    <section>
      <div className="section-heading shopper-heading">
        <div>
          <h3>{marketplaceView === "favorites" ? "Favorite Products" : "Approved Products"}</h3>
          <p>
            {filteredProducts.length === 0 ? "No products match filters." : `${sortedProducts.length} results`}
          </p>
        </div>
      </div>

      <div className="products-grid">
        {sortedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpenQuickView={() => onQuickView(product)}
          />
        ))}
      </div>

      {marketplacePagination.hasNextPage && (
        <button className="btn btn-outline" onClick={loadMoreMarketplaceProducts}>
          Load more
        </button>
      )}
    </section>
  );
};

export default EcommerceMarketplace;

