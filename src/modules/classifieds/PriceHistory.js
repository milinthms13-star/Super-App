import React, { useState, useMemo } from 'react';

const PriceHistory = ({ priceHistory = [], currentPrice, currency = '₹' }) => {
  const [showChart, setShowChart] = useState(false);

  // Get price statistics
  const stats = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return {
        minPrice: currentPrice,
        maxPrice: currentPrice,
        avgPrice: currentPrice,
        lowestPrice: currentPrice,
        highestPrice: currentPrice,
        priceDropped: false,
        dropPercentage: 0,
        dropAmount: 0,
      };
    }

    const prices = priceHistory.map(h => h.price);
    const minPrice = Math.min(...prices, currentPrice);
    const maxPrice = Math.max(...prices, currentPrice);
    const avgPrice = Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length
    );

    const initialPrice = priceHistory[0]?.price || currentPrice;
    const priceDropped = currentPrice < initialPrice;
    const dropAmount = initialPrice - currentPrice;
    const dropPercentage = initialPrice > 0 
      ? Math.round((dropAmount / initialPrice) * 100)
      : 0;

    return {
      minPrice,
      maxPrice,
      avgPrice,
      lowestPrice: minPrice,
      highestPrice: maxPrice,
      priceDropped,
      dropPercentage,
      dropAmount,
    };
  }, [priceHistory, currentPrice]);

  // Get price trend indicator
  const getTrendIcon = () => {
    if (!stats.priceDropped) return '📈 Price stable';
    return `📉 ${stats.dropPercentage}% drop`;
  };

  // Format last change date
  const getLastChangeDate = () => {
    if (!priceHistory || priceHistory.length === 0) return 'No history';
    const lastChange = priceHistory[priceHistory.length - 1];
    const date = new Date(lastChange.date || lastChange.timestamp);
    const today = new Date();
    const diffMs = today - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="price-history">
      {/* Price Stats Card */}
      <div className="price-stats-card">
        <div className="price-stat-header">
          <h4>💰 Price History</h4>
          <button 
            className="price-chart-toggle"
            onClick={() => setShowChart(!showChart)}
            title={showChart ? 'Hide chart' : 'Show chart'}
          >
            {showChart ? '▼' : '▶'} Details
          </button>
        </div>

        {/* Price Trend */}
        <div className="price-trend">
          <div className="trend-item">
            <span className="trend-label">Current Price</span>
            <span className="trend-value current">
              {currency} {currentPrice.toLocaleString()}
            </span>
          </div>

          {stats.priceDropped && (
            <div className="price-drop-alert">
              <span className="drop-icon">🎉</span>
              <div className="drop-info">
                <span className="drop-label">Great Deal!</span>
                <span className="drop-amount">
                  {currency} {stats.dropAmount.toLocaleString()} off
                </span>
              </div>
              <span className="drop-percent">-{stats.dropPercentage}%</span>
            </div>
          )}

          <div className="trend-indicator">
            {getTrendIcon()}
          </div>
        </div>

        {/* Collapsible Details */}
        {showChart && (
          <div className="price-details">
            <div className="detail-row">
              <span className="detail-label">Lowest Price</span>
              <span className="detail-value">
                {currency} {stats.lowestPrice.toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Highest Price</span>
              <span className="detail-value">
                {currency} {stats.highestPrice.toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Average Price</span>
              <span className="detail-value">
                {currency} {stats.avgPrice.toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Changed</span>
              <span className="detail-value">{getLastChangeDate()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Price Points</span>
              <span className="detail-value">{priceHistory.length + 1}</span>
            </div>
          </div>
        )}

        {/* Price Timeline (Mini Chart) */}
        {showChart && priceHistory.length > 0 && (
          <div className="price-timeline">
            <div className="timeline-header">
              <span>Price Timeline (Last {priceHistory.length} changes)</span>
            </div>
            <div className="timeline-bars">
              {priceHistory.slice(-8).map((entry, idx) => {
                const percentage = 
                  ((entry.price - stats.minPrice) / 
                  (stats.maxPrice - stats.minPrice)) * 100;
                return (
                  <div
                    key={idx}
                    className="timeline-bar"
                    style={{ height: `${Math.max(percentage, 10)}%` }}
                    title={`${currency} ${entry.price.toLocaleString()}`}
                  />
                );
              })}
              {/* Current price bar */}
              <div
                className="timeline-bar current"
                style={{ 
                  height: `${
                    ((currentPrice - stats.minPrice) / 
                    (stats.maxPrice - stats.minPrice)) * 100
                  }%` 
                }}
                title={`${currency} ${currentPrice.toLocaleString()}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Price Watch CTA */}
      {stats.priceDropped && (
        <div className="price-watch-cta">
          <button className="watch-price-btn">
            🔔 Get Price Alerts
          </button>
        </div>
      )}
    </div>
  );
};

export default PriceHistory;
