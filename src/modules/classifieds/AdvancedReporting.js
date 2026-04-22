import React, { useState, useMemo } from 'react';

const AdvancedReporting = ({ listings = [], analyticsData = {} }) => {
  const [timePeriod, setTimePeriod] = useState('7days'); // 7days, 30days, 90days, all
  const [selectedMetric, setSelectedMetric] = useState('views');

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
    const totalChats = listings.reduce((sum, l) => sum + (l.chats || 0), 0);
    const totalFavorites = listings.reduce((sum, l) => sum + (l.favorites || 0), 0);
    const totalValue = listings.reduce((sum, l) => sum + l.price, 0);
    
    const avgViews = listings.length > 0 ? Math.round(totalViews / listings.length) : 0;
    const avgPrice = listings.length > 0 ? Math.round(totalValue / listings.length) : 0;
    
    const topCategory = listings.length > 0
      ? Object.entries(
          listings.reduce((acc, l) => {
            acc[l.category] = (acc[l.category] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0][0]
      : 'N/A';

    const conversionRate = totalChats > 0 && totalViews > 0
      ? Math.round((totalChats / totalViews) * 100 * 10) / 10
      : 0;

    return {
      totalListings: listings.length,
      totalViews,
      totalChats,
      totalFavorites,
      totalValue,
      avgViews,
      avgPrice,
      topCategory,
      conversionRate,
      engagementRate: totalChats + totalFavorites,
    };
  }, [listings]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const categories = {};
    listings.forEach(listing => {
      if (!categories[listing.category]) {
        categories[listing.category] = {
          name: listing.category,
          count: 0,
          views: 0,
          chats: 0,
          favorites: 0,
          avgPrice: 0,
          totalPrice: 0,
        };
      }
      categories[listing.category].count += 1;
      categories[listing.category].views += listing.views || 0;
      categories[listing.category].chats += listing.chats || 0;
      categories[listing.category].favorites += listing.favorites || 0;
      categories[listing.category].totalPrice += listing.price;
    });

    // Calculate averages
    Object.values(categories).forEach(cat => {
      if (cat.count > 0) {
        cat.avgPrice = Math.round(cat.totalPrice / cat.count);
      }
    });

    return Object.values(categories).sort((a, b) => b.views - a.views);
  }, [listings]);

  // Price distribution
  const priceDistribution = useMemo(() => {
    if (listings.length === 0) return [];
    
    const ranges = [
      { label: '₹0-1K', min: 0, max: 1000, count: 0 },
      { label: '₹1K-5K', min: 1000, max: 5000, count: 0 },
      { label: '₹5K-10K', min: 5000, max: 10000, count: 0 },
      { label: '₹10K-50K', min: 10000, max: 50000, count: 0 },
      { label: '₹50K+', min: 50000, max: Infinity, count: 0 },
    ];

    listings.forEach(listing => {
      const range = ranges.find(r => listing.price >= r.min && listing.price < r.max);
      if (range) range.count += 1;
    });

    return ranges;
  }, [listings]);

  // Trending products
  const trendingProducts = useMemo(() => {
    return listings
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((l, idx) => ({
        ...l,
        rank: idx + 1,
      }));
  }, [listings]);

  return (
    <div className="advanced-reporting">
      {/* Header */}
      <div className="reporting-header">
        <h2>📊 Analytics & Reports</h2>
        <select
          className="time-period-select"
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👁️</div>
          <div className="metric-content">
            <span className="metric-label">Total Views</span>
            <span className="metric-value">{analytics.totalViews.toLocaleString()}</span>
            <span className="metric-change">+12% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💬</div>
          <div className="metric-content">
            <span className="metric-label">Total Chats</span>
            <span className="metric-value">{analytics.totalChats}</span>
            <span className="metric-change">+8% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">❤️</div>
          <div className="metric-content">
            <span className="metric-label">Saved/Favorites</span>
            <span className="metric-value">{analytics.totalFavorites}</span>
            <span className="metric-change">+15% vs last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <span className="metric-label">Total Inventory Value</span>
            <span className="metric-value">₹{(analytics.totalValue / 100000).toFixed(1)}L</span>
            <span className="metric-change">+5% vs last period</span>
          </div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <span className="metric-label">Conversion Rate</span>
            <span className="metric-value">{analytics.conversionRate}%</span>
            <span className="metric-change">Avg: 2.3%</span>
          </div>
        </div>

        <div className="metric-card highlight">
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <span className="metric-label">Avg Rating</span>
            <span className="metric-value">4.8/5</span>
            <span className="metric-change">Based on 45 reviews</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {/* Category Performance */}
        <div className="chart-card">
          <h3>📦 Top Performing Categories</h3>
          <div className="category-chart">
            {categoryPerformance.slice(0, 5).map((cat, idx) => (
              <div key={idx} className="category-bar">
                <div className="bar-info">
                  <span className="bar-label">{cat.name}</span>
                  <span className="bar-count">{cat.count} listings</span>
                </div>
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(cat.views / Math.max(...categoryPerformance.map(c => c.views))) * 100}%`,
                    }}
                  />
                  <span className="bar-value">{cat.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Distribution */}
        <div className="chart-card">
          <h3>💲 Price Range Distribution</h3>
          <div className="price-distribution">
            {priceDistribution.map((range, idx) => (
              <div key={idx} className="price-range">
                <div className="range-label">{range.label}</div>
                <div className="range-bar">
                  <div
                    className="range-fill"
                    style={{
                      width: `${(range.count / Math.max(...priceDistribution.map(r => r.count))) * 100 || 0}%`,
                    }}
                  />
                  <span className="range-count">{range.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Products */}
      <div className="trending-section">
        <h3>🔥 Top 5 Trending Products</h3>
        <div className="trending-table">
          <div className="table-header-row">
            <div className="rank-col">Rank</div>
            <div className="product-col">Product</div>
            <div className="views-col">Views</div>
            <div className="chats-col">Chats</div>
            <div className="price-col">Price</div>
            <div className="engagement-col">Engagement</div>
          </div>

          {trendingProducts.map((product) => (
            <div key={product.id} className="table-data-row">
              <div className="rank-col">
                <span className={`rank-badge rank-${product.rank}`}>
                  #{product.rank}
                </span>
              </div>
              <div className="product-col">
                <img
                  src={product.image || '/placeholder.png'}
                  alt={product.title}
                  className="product-thumb"
                />
                <span className="product-name">{product.title}</span>
              </div>
              <div className="views-col">{product.views || 0}</div>
              <div className="chats-col">{product.chats || 0}</div>
              <div className="price-col">₹ {product.price.toLocaleString('en-IN')}</div>
              <div className="engagement-col">
                <div className="engagement-bar">
                  <div className="engagement-level">{Math.round(((product.views || 0) + (product.chats || 0)) / 2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-row">
          <span className="stat-label">Avg Views per Listing</span>
          <span className="stat-value">{analytics.avgViews}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Most Active Category</span>
          <span className="stat-value">{analytics.topCategory}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Avg Price</span>
          <span className="stat-value">₹ {analytics.avgPrice.toLocaleString('en-IN')}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Engagement Rate</span>
          <span className="stat-value">{analytics.engagementRate}</span>
        </div>
      </div>

      {/* Export Options */}
      <div className="export-section">
        <button className="export-btn">📥 Export as PDF</button>
        <button className="export-btn">📊 Export as CSV</button>
        <button className="export-btn">📧 Email Report</button>
      </div>
    </div>
  );
};

export default AdvancedReporting;
