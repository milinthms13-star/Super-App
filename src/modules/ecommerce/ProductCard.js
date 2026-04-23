import React, { useMemo, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { useApp } from "../../contexts/AppContext";
import { resolveProductImageSrc } from "./productImage";
import {
  formatFriendlyDate,
  formatCurrency,
  formatCountdown,
  getReturnWindowText,
} from "../../utils/ecommerceHelpers";
import { sanitizeText } from "../../utils/xssProtection";

const ProductCard = ({ product, onOpenQuickView }) => {
  const { cart, addToCart, addToFavorites, removeFavorite, favorites, currentUser } = useApp();
  const [isAdded, setIsAdded] = useState(false);
  const [stockMessage, setStockMessage] = useState("");
  const [imageError, setImageError] = useState(false);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const isSellerAccount =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";
  const isFavorited = favorites.some((fav) => fav.id === product.id);

  // Memoize cart item lookup separately
  const cartItem = useMemo(() => cart.find((item) => item.id === product.id), [cart, product.id]);
  const currentQty = cartItem?.quantity || 0;

  // Memoize stock calculations
  const stockInfo = useMemo(() => {
    const stock = typeof product.stock === "number" ? product.stock : Number.POSITIVE_INFINITY;
    const hasReached = Number.isFinite(stock) && currentQty >= stock;
    return { stock, hasReached };
  }, [product.stock, currentQty]);

  // Memoize rating calculations
  const ratingInfo = useMemo(() => {
    const rating = Number.isFinite(Number(product.rating)) ? Number(product.rating) : 4.5;
    const reviews = Number.isFinite(Number(product.reviews)) ? Number(product.reviews) : 0;
    return { rating, reviews };
  }, [product.rating, product.reviews]);

  // Memoize batch metadata
  const batchMeta = useMemo(() => {
    return [
      product.batchLabel ? `Batch ${product.batchLabel}` : "",
      product.batchLocation ? `Dispatch from ${product.batchLocation}` : "",
      product.expiryDate ? `Expires ${String(product.expiryDate).slice(0, 10)}` : "",
    ].filter(Boolean);
  }, [product.batchLabel, product.batchLocation, product.expiryDate]);

  const productImageSrc = useMemo(
    () => resolveProductImageSrc(product.image, product.imageVariants),
    [product.image, product.imageVariants]
  );
  const showUpcomingDiscount = product.discountStatus === "upcoming";
  const showExpiredDiscount = product.discountStatus === "expired";
  const returnPolicyText = useMemo(() => getReturnWindowText(product), [product]);
  const flashReservationExpiry = product.flashSale?.reservation?.expiresAt || null;
  const flashSaleExpiry = product.flashSaleEndsAt || product.flashSale?.endsAt || null;

  useEffect(() => {
    if (!flashReservationExpiry && !flashSaleExpiry) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [flashReservationExpiry, flashSaleExpiry]);

  const flashSaleMeta = useMemo(() => {
    const reservationEndsAt = flashReservationExpiry ? new Date(flashReservationExpiry) : null;
    const saleEndsAt = flashSaleExpiry ? new Date(flashSaleExpiry) : null;
    const reservationRemainingMs =
      reservationEndsAt && !Number.isNaN(reservationEndsAt.getTime())
        ? Math.max(0, reservationEndsAt.getTime() - countdownNow)
        : 0;
    const saleRemainingMs =
      saleEndsAt && !Number.isNaN(saleEndsAt.getTime())
        ? Math.max(0, saleEndsAt.getTime() - countdownNow)
        : 0;

    return {
      reservationRemainingMs,
      saleRemainingMs,
      hasReservation: reservationRemainingMs > 0,
      hasSaleCountdown: saleRemainingMs > 0,
    };
  }, [countdownNow, flashReservationExpiry, flashSaleExpiry]);

  // Memoize handlers to prevent unnecessary re-renders of child components
  const handleAddToCart = useCallback(() => {
    if (isSellerAccount) {
      setStockMessage("Seller accounts cannot purchase products");
      return;
    }

    const added = addToCart(product);

    if (!added) {
      setStockMessage("Available stock limit reached");
      return;
    }

    setStockMessage("");
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  }, [isSellerAccount, addToCart, product]);

  const handleFavorite = useCallback(() => {
    if (isFavorited) {
      removeFavorite(product.id);
    } else {
      addToFavorites(product);
    }
  }, [isFavorited, product.id, removeFavorite, addToFavorites]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleQuickView = useCallback(() => {
    onOpenQuickView?.(product);
  }, [onOpenQuickView, product]);

  return (
    <div className="product-card">
      <div className="product-image">
        {product.isDiscountActive && (
          <span className="product-discount-badge" aria-label={`${Math.round(Number(product.discountPercentage || 0))}% discount`}>
            {Math.round(Number(product.discountPercentage || 0))}% OFF
          </span>
        )}
        {product.flashSaleActive && (
          <span className="product-flash-badge" aria-label="Flash sale active">
            Flash Sale
          </span>
        )}
        {productImageSrc && !imageError ? (
          <img
            className="product-media-image"
            src={productImageSrc}
            alt={sanitizeText(product.name) || "Product"}
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <span className="product-emoji" role="img" aria-label={sanitizeText(product.name)}>
            {sanitizeText(product.name)?.slice(0, 1)?.toUpperCase() || "P"}
          </span>
        )}
        <button
          type="button"
          className={`favorite-btn ${isFavorited ? "favorited" : ""}`}
          onClick={handleFavorite}
          aria-label={isFavorited ? `Remove ${sanitizeText(product.name)} from favorites` : `Add ${sanitizeText(product.name)} to favorites`}
          aria-pressed={isFavorited}
        >
          {isFavorited ? "♥" : "♡"}
        </button>
      </div>

      <div className="product-info">
        <div className="product-header-row">
          <div>
            <h3 className="product-name">{sanitizeText(product.name)}</h3>
            {product.businessName && <p className="product-business">{sanitizeText(product.businessName)}</p>}
          </div>
          {product.category && <span className="product-category-chip">{sanitizeText(product.category)}</span>}
        </div>

        {(product.subcategory || product.model || product.styleTheme || product.color) && (
          <div className="product-attribute-row">
            {product.subcategory && <span className="product-attribute-chip">{sanitizeText(product.subcategory)}</span>}
            {product.model && <span className="product-attribute-chip">{sanitizeText(product.model)}</span>}
            {product.styleTheme && <span className="product-attribute-chip">{sanitizeText(product.styleTheme)}</span>}
            {product.color && <span className="product-attribute-chip">{sanitizeText(product.color)}</span>}
          </div>
        )}

        {product.description && <p className="product-description">{sanitizeText(product.description)}</p>}

        <div className="product-detail-stack">
          {batchMeta.length > 0 && (
            <p className="product-batch-meta">{batchMeta.join(" · ")}</p>
          )}
          <p className="product-return-policy">{returnPolicyText}</p>
          {product.flashSaleActive && flashSaleMeta.hasSaleCountdown && (
            <p className="product-flash-detail">
              Ends in {formatCountdown(flashSaleMeta.saleRemainingMs)}
              {Number(product.flashSaleRemainingStock || 0) > 0
                ? ` · ${product.flashSaleRemainingStock} flash deal${product.flashSaleRemainingStock === 1 ? "" : "s"} left`
                : ""}
            </p>
          )}
          {flashSaleMeta.hasReservation && (
            <p className="product-flash-reserved">
              Reserved for you for {formatCountdown(flashSaleMeta.reservationRemainingMs)}
            </p>
          )}
        </div>

        {ratingInfo.reviews > 0 && (
          <div className="product-rating" aria-label={`Rated ${ratingInfo.rating} stars from ${ratingInfo.reviews} reviews`}>
            <span className="stars">★ {ratingInfo.rating}</span>
            <span className="reviews">
              ({ratingInfo.reviews} {ratingInfo.reviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}

        {typeof product.stock === "number" && product.stock > 0 && product.stock < 5 && (
          <div className="product-stock-warning" role="alert">
            Only {product.stock} {product.stock === 1 ? "item" : "items"} left!
          </div>
        )}

        <div className="product-purchase">
          <span className="product-price-label">
            {product.isDiscountActive ? "Selling Price" : "Price"}
          </span>
          <span className="product-price">INR {formatCurrency(product.price)}</span>
          {product.isDiscountActive && (
            <>
              <span className="product-original-price-label">Original Price</span>
              <span className="product-original-price">INR {formatCurrency(product.mrp)}</span>
              <span className="product-discount-copy">
                Save INR {formatCurrency(product.discountAmount)} (
                {Math.round(Number(product.discountPercentage || 0))}% off)
              </span>
            </>
          )}
          {showUpcomingDiscount && formatFriendlyDate(product.discountStartDate) && (
            <span className="product-discount-status">
              Offer starts on {formatFriendlyDate(product.discountStartDate)}
            </span>
          )}
          {showExpiredDiscount && formatFriendlyDate(product.discountEndDate) && (
            <span className="product-discount-status">
              Previous offer ended on {formatFriendlyDate(product.discountEndDate)}
            </span>
          )}
          {typeof product.stock === "number" && (
            <span className={`product-stock ${product.stock === 0 ? "out-of-stock" : ""}`}>
              {product.stock === 0
                ? "Out of stock"
                : `${product.stock} in stock${
                    currentQty > 0
                      ? ` · ${currentQty} in cart`
                      : ""
                  }`}
            </span>
          )}
          {stockMessage && <span className="product-stock-limit" role="alert">{stockMessage}</span>}
        </div>

        <div className="product-action-buttons">
          <button
            type="button"
            className="quick-view-btn"
            onClick={handleQuickView}
            aria-label={`Quick view ${sanitizeText(product.name)}`}
          >
            Quick View
          </button>
          <button
            type="button"
            className={`add-to-cart-btn ${isAdded ? "added" : ""}`}
            onClick={handleAddToCart}
            disabled={stockInfo.hasReached || isSellerAccount}
            aria-label={
              isSellerAccount
                ? "Seller account cannot add to cart"
                : stockInfo.hasReached
                  ? `Cannot add more than ${stockInfo.stock} units`
                  : `Add ${sanitizeText(product.name)} to cart`
            }
          >
            {isSellerAccount
              ? "Seller View"
              : stockInfo.hasReached
                ? "Max Added"
                : isAdded
                  ? "Added"
                  : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number,
    mrp: PropTypes.number,
    stock: PropTypes.number,
    rating: PropTypes.number,
    reviews: PropTypes.number,
    image: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    imageVariants: PropTypes.object,
    category: PropTypes.string,
    subcategory: PropTypes.string,
    model: PropTypes.string,
    color: PropTypes.string,
    styleTheme: PropTypes.string,
    description: PropTypes.string,
    businessName: PropTypes.string,
    batchLabel: PropTypes.string,
    batchLocation: PropTypes.string,
    expiryDate: PropTypes.string,
    returnAllowed: PropTypes.bool,
    returnWindowDays: PropTypes.number,
    isDiscountActive: PropTypes.bool,
    discountPercentage: PropTypes.number,
    discountAmount: PropTypes.number,
    discountStatus: PropTypes.oneOf(["active", "upcoming", "expired"]),
    discountStartDate: PropTypes.string,
    discountEndDate: PropTypes.string,
    flashSaleActive: PropTypes.bool,
    flashSaleEndsAt: PropTypes.string,
    flashSaleRemainingStock: PropTypes.number,
    flashSale: PropTypes.shape({
      endsAt: PropTypes.string,
      reservation: PropTypes.shape({
        expiresAt: PropTypes.string,
      }),
    }),
  }).isRequired,
  onOpenQuickView: PropTypes.func,
};

ProductCard.defaultProps = {
  onOpenQuickView: null,
};

export default ProductCard;
