import React, { useState, useEffect } from 'react';
import './SellerAnalytics.css';

const SellerAnalytics = ({ userEmail, sellerName }) => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [customerInsights, setCustomerInsights] = useState(null);
  const [inventoryMetrics, setInventoryMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [period, setPeriod] = useState('This Month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [userEmail, period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashboardRes, trendsRes, productRes, customersRes, inventoryRes] =
        await Promise.all([
          fetch(`/api/seller-analytics/dashboard?period=${period}`, {
            headers,
          }),
          fetch('/api/seller-analytics/trends/sales', { headers }),
          fetch('/api/seller-analytics/products/performance', { headers }),
          fetch('/api/seller-analytics/customers/insights', { headers }),
          fetch('/api/seller-analytics/inventory/metrics', { headers }),
        ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setAnalytics(data.data);
      }
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.data);
      }
      if (productRes.ok) {
        const data = await productRes.json();
        setProductPerformance(data.data);
      }
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomerInsights(data.data);
      }
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventoryMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="seller-analytics-container">
      <div className="analytics-header">
        <h1>📊 Seller Analytics Dashboard</h1>
        <p>Track your sales, products, and customer insights</p>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="period-selector"
        >
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="This Quarter">This Quarter</option>
          <option value="This Year">This Year</option>
        </select>
      </div>

      <div className="analytics-tabs">
        <button
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button
          className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          Customers
        </button>
        <button
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
        <button
          className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-tab">
          <div className="kpi-grid">
            <div className="kpi-card">
              <h4>Total Revenue</h4>
              <p className="kpi-value">₹{analytics?.sales.totalRevenue || 0}</p>
              <p className="kpi-detail">{analytics?.sales.totalOrders || 0} orders</p>
            </div>
            <div className="kpi-card">
              <h4>Average Order Value</h4>
              <p className="kpi-value">
                ₹{Math.round(analytics?.sales.averageOrderValue || 0)}
              </p>
              <p className="kpi-detail">Per order</p>
            </div>
            <div className="kpi-card">
              <h4>Customer Satisfaction</h4>
              <p className="kpi-value">
                {Math.round(analytics?.kpis.customerSatisfactionScore || 0)}%
              </p>
              <p className="kpi-detail">Based on {analytics?.reviews.totalReviews || 0} reviews</p>
            </div>
            <div className="kpi-card">
              <h4>Order Fulfillment</h4>
              <p className="kpi-value">
                {Math.round(analytics?.kpis.orderFulfillmentRate || 0)}%
              </p>
              <p className="kpi-detail">Delivered orders</p>
            </div>
          </div>

          <div className="order-status-section">
            <h3>Order Status Breakdown</h3>
            <div className="status-grid">
              <div className="status-item">
                <span>Pending</span>
                <span className="count">{analytics?.sales.ordersByStatus.pending || 0}</span>
              </div>
              <div className="status-item">
                <span>Processing</span>
                <span className="count">{analytics?.sales.ordersByStatus.processing || 0}</span>
              </div>
              <div className="status-item">
                <span>Shipped</span>
                <span className="count">{analytics?.sales.ordersByStatus.shipped || 0}</span>
              </div>
              <div className="status-item">
                <span>Delivered</span>
                <span className="count">{analytics?.sales.ordersByStatus.delivered || 0}</span>
              </div>
              <div className="status-item">
                <span>Cancelled</span>
                <span className="count">{analytics?.sales.ordersByStatus.cancelled || 0}</span>
              </div>
              <div className="status-item">
                <span>Returned</span>
                <span className="count">{analytics?.sales.ordersByStatus.returned || 0}</span>
              </div>
            </div>
          </div>

          <div className="metrics-section">
            <h3>Key Metrics</h3>
            <div className="metrics-grid">
              <div className="metric">
                <label>Return Rate</label>
                <p>{Math.round(analytics?.kpis.returnRate || 0)}%</p>
              </div>
              <div className="metric">
                <label>Cancellation Rate</label>
                <p>{Math.round(analytics?.kpis.cancellationRate || 0)}%</p>
              </div>
              <div className="metric">
                <label>Average Rating</label>
                <p>{(analytics?.reviews.averageRating || 0).toFixed(2)} / 5</p>
              </div>
            </div>
          </div>

          <div className="trends-section">
            <h3>Revenue Trends</h3>
            <div className="trends-list">
              {trends.slice(-7).map((trend, idx) => (
                <div key={idx} className="trend-item">
                  <span className="date">{trend.date}</span>
                  <div className="trend-bar">
                    <div
                      className="trend-fill"
                      style={{
                        width: `${Math.min(
                          (trend.revenue / Math.max(...trends.map((t) => t.revenue), 1)) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="amount">₹{trend.revenue}</span>
                  <span className="orders">{trend.orderCount} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="products-tab">
          <h3>Top Selling Products</h3>
          {analytics?.products.topSellingProducts.length > 0 ? (
            <div className="products-list">
              {analytics.products.topSellingProducts.map((product, idx) => (
                <div key={idx} className="product-item">
                  <div className="product-rank">{idx + 1}</div>
                  <div className="product-info">
                    <p className="product-name">{product.productName}</p>
                    <p className="product-stats">
                      {product.unitsSold} units | ₹{product.revenue} revenue
                    </p>
                  </div>
                  <div className="product-rating">
                    <span className="rating">⭐ {product.rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No products yet</p>
          )}

          <h3 style={{ marginTop: '30px' }}>Product Performance</h3>
          {productPerformance.length > 0 ? (
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Views</th>
                    <th>Clicks</th>
                    <th>Conversion</th>
                    <th>Revenue</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {productPerformance.map((product, idx) => (
                    <tr key={idx}>
                      <td>{product.productName}</td>
                      <td>{product.views}</td>
                      <td>{product.clicks}</td>
                      <td>{product.conversionRate}%</td>
                      <td>₹{product.revenue}</td>
                      <td>⭐ {product.rating.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No performance data yet</p>
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="customers-tab">
          <div className="customer-summary">
            <div className="summary-card">
              <h4>Total Customers</h4>
              <p className="big-number">{customerInsights?.totalCustomers || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Average Customer Value</h4>
              <p className="big-number">₹{Math.round(customerInsights?.averageCustomerValue || 0)}</p>
            </div>
          </div>

          <h3>Top Customers</h3>
          {customerInsights?.topCustomers.length > 0 ? (
            <div className="customers-list">
              {customerInsights.topCustomers.map((customer, idx) => (
                <div key={idx} className="customer-item">
                  <div className="customer-rank">{idx + 1}</div>
                  <div className="customer-info">
                    <p className="customer-name">{customer.customerName}</p>
                    <p className="customer-email">{customer.customerEmail}</p>
                  </div>
                  <div className="customer-stats">
                    <span>{customer.totalOrders} orders</span>
                    <span>₹{customer.totalSpent}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No customer data yet</p>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="inventory-tab">
          <div className="inventory-summary">
            <div className="summary-card">
              <h4>Total Items</h4>
              <p className="big-number">{inventoryMetrics?.totalItems || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Out of Stock</h4>
              <p className="big-number warning">{inventoryMetrics?.outOfStockItems || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Low Stock</h4>
              <p className="big-number caution">{inventoryMetrics?.lowStockItems || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Inventory Value</h4>
              <p className="big-number">₹{inventoryMetrics?.inventoryValue || 0}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="reviews-tab">
          <div className="review-summary">
            <div className="summary-card">
              <h4>Average Rating</h4>
              <p className="big-number">
                {(analytics?.reviews.averageRating || 0).toFixed(1)} / 5
              </p>
            </div>
            <div className="summary-card">
              <h4>Total Reviews</h4>
              <p className="big-number">{analytics?.reviews.totalReviews || 0}</p>
            </div>
          </div>

          <h3>Rating Distribution</h3>
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="rating-row">
                <span className="stars">{'⭐'.repeat(rating)}</span>
                <div className="bar-container">
                  <div
                    className="bar"
                    style={{
                      width: `${
                        (analytics?.reviews.ratingDistribution[`${rating}Star`] /
                          (analytics?.reviews.totalReviews || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="count">
                  {analytics?.reviews.ratingDistribution[`${rating}Star`] || 0}
                </span>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '30px' }}>Recent Positive Reviews</h3>
          {analytics?.reviews.positiveReviews.length > 0 ? (
            <div className="reviews-list">
              {analytics.reviews.positiveReviews.map((review, idx) => (
                <div key={idx} className="review-item">
                  <div className="review-header">
                    <span className="customer">{review.customerName}</span>
                    <span className="rating">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p className="product">{review.productName}</p>
                  <p className="comment">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No positive reviews yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerAnalytics;
