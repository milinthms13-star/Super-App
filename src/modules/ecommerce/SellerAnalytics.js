import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { formatCurrency, formatDisplayDate } from "../../utils/ecommerceHelpers";
import "./SellerAnalytics.css";

const PERIODS = ["Today", "This Week", "This Month", "This Quarter", "This Year"];

const SellerAnalytics = () => {
  const { apiCall, currentUser } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState("This Month");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiCall("/selleranalytics/dashboard", "GET", { period });
        if (!isMounted) {
          return;
        }

        if (!response?.success || !response?.data) {
          throw new Error("Analytics data is unavailable right now.");
        }

        setAnalytics(response.data);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message || "Analytics could not be loaded.");
          setAnalytics(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [apiCall, period]);

  const trendPeak = useMemo(() => {
    const trend = analytics?.sales?.revenueTrend || [];
    return Math.max(1, ...trend.map((entry) => Number(entry.revenue || 0)));
  }, [analytics]);

  const heatPeak = useMemo(() => {
    const heatmap = analytics?.geography?.heatmap || [];
    return Math.max(1, ...heatmap.map((entry) => Number(entry.revenue || 0)));
  }, [analytics]);

  if (loading) {
    return (
      <section className="seller-analytics-shell">
        <div className="seller-analytics-loading">
          <strong>Loading seller analytics...</strong>
          <p>Revenue trends, product velocity, and regional demand are being prepared.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="seller-analytics-shell">
        <div className="seller-analytics-loading seller-analytics-error">
          <strong>Analytics unavailable</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <section className="seller-analytics-shell">
      <div className="seller-analytics-header">
        <div>
          <span className="seller-analytics-kicker">Seller Analytics</span>
          <h3>{currentUser?.businessName || currentUser?.name || "Your shop"} performance</h3>
          <p>
            Revenue, product velocity, and regional demand for {analytics.period.toLowerCase()}.
          </p>
        </div>
        <label className="seller-analytics-period">
          <span>Reporting Window</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            {PERIODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="seller-analytics-tabs">
        {[
          { id: "overview", label: "Overview" },
          { id: "products", label: "Products" },
          { id: "regions", label: "Regions" },
          { id: "reviews", label: "Reviews" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`seller-analytics-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="seller-analytics-grid">
          <article className="seller-analytics-card seller-analytics-kpi">
            <span>Revenue</span>
            <strong>INR {formatCurrency(analytics.sales.totalRevenue)}</strong>
            <small>{analytics.sales.totalOrders} seller order segment(s)</small>
          </article>
          <article className="seller-analytics-card seller-analytics-kpi">
            <span>Average Order</span>
            <strong>INR {formatCurrency(analytics.sales.averageOrderValue)}</strong>
            <small>Repeat shoppers: {Math.round(analytics.kpis.repeatCustomerRate || 0)}%</small>
          </article>
          <article className="seller-analytics-card seller-analytics-kpi">
            <span>Fulfillment Rate</span>
            <strong>{Math.round(analytics.kpis.orderFulfillmentRate || 0)}%</strong>
            <small>Delivered segments out of all seller-managed orders</small>
          </article>
          <article className="seller-analytics-card seller-analytics-kpi">
            <span>Customer Satisfaction</span>
            <strong>{Math.round(analytics.kpis.customerSatisfactionScore || 0)}%</strong>
            <small>{(analytics.reviews.averageRating || 0).toFixed(1)} / 5 average rating</small>
          </article>

          <article className="seller-analytics-card seller-analytics-span-2">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Revenue Trend</h4>
                <p>Orders and revenue contribution over time.</p>
              </div>
            </div>
            <div className="seller-analytics-trend-list">
              {(analytics.sales.revenueTrend || []).length > 0 ? (
                analytics.sales.revenueTrend.map((entry) => (
                  <div className="seller-analytics-trend-row" key={entry.date}>
                    <span>{entry.date}</span>
                    <div className="seller-analytics-trend-bar">
                      <div
                        className="seller-analytics-trend-fill"
                        style={{
                          width: `${Math.max(6, (Number(entry.revenue || 0) / trendPeak) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>INR {formatCurrency(entry.revenue)}</strong>
                    <small>{entry.orderCount} orders</small>
                  </div>
                ))
              ) : (
                <p className="seller-analytics-empty">No sales trend yet for this period.</p>
              )}
            </div>
          </article>

          <article className="seller-analytics-card seller-analytics-span-2">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Regional Heatmap</h4>
                <p>Where seller demand is strongest based on order revenue.</p>
              </div>
            </div>
            <div className="seller-analytics-region-grid">
              {(analytics.geography.heatmap || []).slice(0, 6).map((region) => (
                <div className="seller-analytics-region-card" key={region.label}>
                  <div className="seller-analytics-region-top">
                    <strong>{region.label}</strong>
                    <span>{region.orderCount} orders</span>
                  </div>
                  <div className="seller-analytics-region-meter">
                    <div
                      className="seller-analytics-region-fill"
                      style={{
                        width: `${Math.max(8, (Number(region.revenue || 0) / heatPeak) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>INR {formatCurrency(region.revenue)}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {activeTab === "products" && (
        <div className="seller-analytics-stack">
          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Top Product Velocity</h4>
                <p>Products moving fastest across orders and stock.</p>
              </div>
            </div>
            <div className="seller-analytics-product-list">
              {(analytics.products.topSellingProducts || []).map((product) => (
                <div className="seller-analytics-product-row" key={product.productId}>
                  <div>
                    <strong>{product.productName}</strong>
                    <p>{product.unitsSold} units sold</p>
                  </div>
                  <div>
                    <strong>INR {formatCurrency(product.revenue)}</strong>
                    <p>{product.stock} in stock</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Performance Table</h4>
                <p>Velocity, CTR, and sell-through at a glance.</p>
              </div>
            </div>
            <div className="seller-analytics-table-wrap">
              <table className="seller-analytics-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units</th>
                    <th>Revenue</th>
                    <th>CTR</th>
                    <th>Sell-Through</th>
                    <th>Last Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.products.productVelocity || []).slice(0, 8).map((product) => (
                    <tr key={product.productId}>
                      <td>{product.productName}</td>
                      <td>{product.unitsSold}</td>
                      <td>INR {formatCurrency(product.revenue)}</td>
                      <td>{Math.round(product.conversionRate || 0)}%</td>
                      <td>{Math.round(product.sellThroughRate || 0)}%</td>
                      <td>{product.lastSoldAt ? formatDisplayDate(product.lastSoldAt) : "No sale yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {activeTab === "regions" && (
        <div className="seller-analytics-stack">
          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Top States</h4>
                <p>Revenue concentration by delivery state.</p>
              </div>
            </div>
            <div className="seller-analytics-product-list">
              {(analytics.geography.topStates || []).map((state) => (
                <div className="seller-analytics-product-row" key={state.state}>
                  <div>
                    <strong>{state.state}</strong>
                    <p>{state.orderCount} orders</p>
                  </div>
                  <div>
                    <strong>INR {formatCurrency(state.revenue)}</strong>
                    <p>Regional demand</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Heatmap Details</h4>
                <p>District-level delivery concentration.</p>
              </div>
            </div>
            <div className="seller-analytics-region-grid">
              {(analytics.geography.heatmap || []).map((region) => (
                <div className="seller-analytics-region-card" key={region.label}>
                  <div className="seller-analytics-region-top">
                    <strong>{region.label}</strong>
                    <span>{region.orderCount} orders</span>
                  </div>
                  <div className="seller-analytics-region-meter">
                    <div
                      className="seller-analytics-region-fill"
                      style={{
                        width: `${Math.max(8, (Number(region.revenue || 0) / heatPeak) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>INR {formatCurrency(region.revenue)}</small>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="seller-analytics-stack">
          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Review Snapshot</h4>
                <p>Customer sentiment across your seller catalog.</p>
              </div>
            </div>
            <div className="seller-analytics-review-grid">
              <div>
                <span>Average Rating</span>
                <strong>{(analytics.reviews.averageRating || 0).toFixed(1)} / 5</strong>
              </div>
              <div>
                <span>Total Reviews</span>
                <strong>{analytics.reviews.totalReviews || 0}</strong>
              </div>
              <div>
                <span>5-Star Reviews</span>
                <strong>{analytics.reviews.ratingDistribution.fiveStar || 0}</strong>
              </div>
              <div>
                <span>1-2 Star Reviews</span>
                <strong>
                  {(analytics.reviews.ratingDistribution.oneStar || 0) +
                    (analytics.reviews.ratingDistribution.twoStar || 0)}
                </strong>
              </div>
            </div>
          </article>

          <article className="seller-analytics-card">
            <div className="seller-analytics-card-heading">
              <div>
                <h4>Recent Positive Reviews</h4>
                <p>Approved high-rating reviews from your products.</p>
              </div>
            </div>
            {(analytics.reviews.positiveReviews || []).length > 0 ? (
              <div className="seller-analytics-review-list">
                {analytics.reviews.positiveReviews.map((review) => (
                  <div className="seller-analytics-review-card" key={review.reviewId}>
                    <div className="seller-analytics-review-top">
                      <strong>{review.customerName}</strong>
                      <span>{review.rating}/5</span>
                    </div>
                    <p>{review.productName}</p>
                    <small>{review.comment}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="seller-analytics-empty">
                Positive review cards will appear here as approved reviews arrive.
              </p>
            )}
          </article>
        </div>
      )}
    </section>
  );
};

export default SellerAnalytics;
