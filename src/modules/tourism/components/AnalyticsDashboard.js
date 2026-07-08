import React, { useEffect, useState, useMemo } from "react";
import { tourismService } from "../../../services/tourismService";
import { formatInr } from "../tourismData";

const AnalyticsDashboard = ({ userRole, vendorId }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [popularPackages, setPopularPackages] = useState([]);
  const [activeChart, setActiveChart] = useState("overview");

  const isAdmin = userRole === "admin";
  const isVendor = ["vendor", "business", "entrepreneur"].includes(userRole);

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      };

      if (isAdmin) {
        const [dashboard, bookings, revenue, popular] = await Promise.all([
          tourismService.getDashboardAnalytics(params),
          tourismService.getBookingAnalytics(params),
          tourismService.getRevenueAnalytics(params),
          tourismService.getPopularPackages({ limit: 10, ...params }),
        ]);

        setDashboardData(dashboard);
        setBookingData(bookings);
        setRevenueData(revenue);
        setPopularPackages(popular);
      } else if (isVendor && vendorId) {
        const [vendor, popular] = await Promise.all([
          tourismService.getVendorAnalytics(vendorId, params),
          tourismService.getPopularPackages({ limit: 10, ...params }),
        ]);

        setVendorData(vendor);
        setPopularPackages(popular);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const clearDateRange = () => {
    setDateRange({ startDate: "", endDate: "" });
  };

  // Calculate chart data
  const bookingStatusChart = useMemo(() => {
    if (!bookingData?.byStatus) return null;

    const statuses = Object.entries(bookingData.byStatus).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: dashboardData?.overview?.totalBookings
        ? Math.round((count / dashboardData.overview.totalBookings) * 100)
        : 0,
    }));

    return statuses.sort((a, b) => b.count - a.count);
  }, [bookingData, dashboardData]);

  const revenueTrendChart = useMemo(() => {
    if (!revenueData?.byMonth) return null;

    return revenueData.byMonth.map((item) => ({
      month: new Date(item._id.year, item._id.month - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      revenue: item.totalRevenue,
      bookings: item.totalBookings,
    }));
  }, [revenueData]);

  const categoryChart = useMemo(() => {
    if (!bookingData?.byCategory) return null;

    return Object.entries(bookingData.byCategory)
      .map(([category, count]) => ({
        category,
        count,
        percentage: dashboardData?.overview?.totalBookings
          ? Math.round((count / dashboardData.overview.totalBookings) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [bookingData, dashboardData]);

  const destinationChart = useMemo(() => {
    if (!bookingData?.byDestination) return null;

    return Object.entries(bookingData.byDestination)
      .map(([destination, count]) => ({
        destination,
        count,
        percentage: dashboardData?.overview?.totalBookings
          ? Math.round((count / dashboardData.overview.totalBookings) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bookingData, dashboardData]);

  if (loading) {
    return (
      <div className="tourism-analytics-loading">
        <div className="tourism-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (!isAdmin && !isVendor) {
    return (
      <div className="tourism-analytics-restricted">
        <h3>Access Restricted</h3>
        <p>Analytics dashboard is only available for vendors and administrators.</p>
      </div>
    );
  }

  return (
    <div className="tourism-analytics-dashboard">
      <div className="tourism-analytics-header">
        <h2>📊 Tourism Analytics Dashboard</h2>
        <p>
          {isAdmin ? "Platform-wide metrics and insights" : "Your vendor performance metrics"}
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="tourism-analytics-filters">
        <div className="tourism-filter-group">
          <label>
            Start Date
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
            />
          </label>
          <label>
            End Date
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
            />
          </label>
          {(dateRange.startDate || dateRange.endDate) && (
            <button type="button" className="tourism-secondary-button" onClick={clearDateRange}>
              Clear Dates
            </button>
          )}
        </div>
        <button type="button" className="tourism-primary-button" onClick={loadAnalytics}>
          Refresh Data
        </button>
      </div>

      {/* Admin Dashboard */}
      {isAdmin && dashboardData && (
        <>
          {/* Overview Cards */}
          <div className="tourism-analytics-overview">
            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">📦</div>
              <div className="tourism-metric-content">
                <h4>Total Bookings</h4>
                <p className="tourism-metric-value">
                  {dashboardData.overview?.totalBookings?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">💰</div>
              <div className="tourism-metric-content">
                <h4>Total Revenue</h4>
                <p className="tourism-metric-value">
                  {formatInr(dashboardData.overview?.totalRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">📈</div>
              <div className="tourism-metric-content">
                <h4>Avg Booking Value</h4>
                <p className="tourism-metric-value">
                  {formatInr(dashboardData.overview?.avgBookingValue || 0)}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">🎯</div>
              <div className="tourism-metric-content">
                <h4>Conversion Rate</h4>
                <p className="tourism-metric-value">
                  {dashboardData.overview?.conversionRate?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">🏷️</div>
              <div className="tourism-metric-content">
                <h4>Total Packages</h4>
                <p className="tourism-metric-value">
                  {dashboardData.overview?.totalPackages?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">🏢</div>
              <div className="tourism-metric-content">
                <h4>Total Vendors</h4>
                <p className="tourism-metric-value">
                  {dashboardData.overview?.totalVendors?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Chart Navigation */}
          <div className="tourism-chart-nav">
            <button
              className={activeChart === "overview" ? "active" : ""}
              onClick={() => setActiveChart("overview")}
            >
              Overview
            </button>
            <button
              className={activeChart === "bookings" ? "active" : ""}
              onClick={() => setActiveChart("bookings")}
            >
              Bookings
            </button>
            <button
              className={activeChart === "revenue" ? "active" : ""}
              onClick={() => setActiveChart("revenue")}
            >
              Revenue
            </button>
            <button
              className={activeChart === "destinations" ? "active" : ""}
              onClick={() => setActiveChart("destinations")}
            >
              Destinations
            </button>
          </div>

          {/* Charts */}
          {activeChart === "overview" && (
            <div className="tourism-charts-grid">
              {/* Popular Packages */}
              {popularPackages.length > 0 && (
                <div className="tourism-chart-card">
                  <h3>🔥 Popular Packages</h3>
                  <div className="tourism-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Package</th>
                          <th>Destination</th>
                          <th>Bookings</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {popularPackages.slice(0, 10).map((pkg, idx) => (
                          <tr key={pkg._id}>
                            <td>#{idx + 1}</td>
                            <td>{pkg.title}</td>
                            <td>{pkg.destination}</td>
                            <td>{pkg.bookingsCount}</td>
                            <td>⭐ {pkg.rating?.toFixed(1) || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Revenue by Month */}
              {revenueTrendChart && (
                <div className="tourism-chart-card">
                  <h3>📈 Revenue Trend</h3>
                  <div className="tourism-bar-chart">
                    {revenueTrendChart.map((item, idx) => {
                      const maxRevenue = Math.max(...revenueTrendChart.map((d) => d.revenue));
                      const height = (item.revenue / maxRevenue) * 200;
                      return (
                        <div key={idx} className="tourism-bar-item">
                          <div
                            className="tourism-bar"
                            style={{ height: `${height}px` }}
                            title={`${item.month}: ${formatInr(item.revenue)}`}
                          ></div>
                          <div className="tourism-bar-label">{item.month}</div>
                          <div className="tourism-bar-value">{formatInr(item.revenue)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeChart === "bookings" && bookingStatusChart && (
            <div className="tourism-charts-grid">
              {/* Booking Status Distribution */}
              <div className="tourism-chart-card">
                <h3>📊 Bookings by Status</h3>
                <div className="tourism-progress-chart">
                  {bookingStatusChart.map((item) => (
                    <div key={item.status} className="tourism-progress-item">
                      <div className="tourism-progress-header">
                        <span className="tourism-progress-label">{item.status}</span>
                        <span className="tourism-progress-count">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="tourism-progress-bar">
                        <div
                          className={`tourism-progress-fill status-${item.status.toLowerCase()}`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bookings by Category */}
              {categoryChart && (
                <div className="tourism-chart-card">
                  <h3>🎯 Bookings by Category</h3>
                  <div className="tourism-progress-chart">
                    {categoryChart.map((item) => (
                      <div key={item.category} className="tourism-progress-item">
                        <div className="tourism-progress-header">
                          <span className="tourism-progress-label">{item.category}</span>
                          <span className="tourism-progress-count">
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="tourism-progress-bar">
                          <div
                            className="tourism-progress-fill"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeChart === "revenue" && revenueData && (
            <div className="tourism-charts-grid">
              {/* Revenue by Category */}
              {revenueData.byCategory && (
                <div className="tourism-chart-card">
                  <h3>💵 Revenue by Category</h3>
                  <div className="tourism-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Bookings</th>
                          <th>Revenue</th>
                          <th>Avg Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.byCategory.map((item) => (
                          <tr key={item._id}>
                            <td>{item._id}</td>
                            <td>{item.totalBookings}</td>
                            <td>{formatInr(item.totalRevenue)}</td>
                            <td>{formatInr(item.avgBookingValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Revenue by Vendor */}
              {revenueData.byVendor && (
                <div className="tourism-chart-card">
                  <h3>🏢 Top Vendors by Revenue</h3>
                  <div className="tourism-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Vendor</th>
                          <th>Bookings</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.byVendor.slice(0, 10).map((item, idx) => (
                          <tr key={item._id}>
                            <td>#{idx + 1}</td>
                            <td>{item.vendorName || "Unknown"}</td>
                            <td>{item.totalBookings}</td>
                            <td>{formatInr(item.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeChart === "destinations" && destinationChart && (
            <div className="tourism-charts-grid">
              <div className="tourism-chart-card">
                <h3>🗺️ Top Destinations</h3>
                <div className="tourism-progress-chart">
                  {destinationChart.map((item) => (
                    <div key={item.destination} className="tourism-progress-item">
                      <div className="tourism-progress-header">
                        <span className="tourism-progress-label">{item.destination}</span>
                        <span className="tourism-progress-count">
                          {item.count} bookings ({item.percentage}%)
                        </span>
                      </div>
                      <div className="tourism-progress-bar">
                        <div
                          className="tourism-progress-fill"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vendor Dashboard */}
      {isVendor && vendorData && (
        <>
          <div className="tourism-analytics-overview">
            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">📦</div>
              <div className="tourism-metric-content">
                <h4>Your Bookings</h4>
                <p className="tourism-metric-value">
                  {vendorData.totalBookings?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">💰</div>
              <div className="tourism-metric-content">
                <h4>Your Revenue</h4>
                <p className="tourism-metric-value">
                  {formatInr(vendorData.totalRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">🏷️</div>
              <div className="tourism-metric-content">
                <h4>Active Packages</h4>
                <p className="tourism-metric-value">
                  {vendorData.activePackages?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">⭐</div>
              <div className="tourism-metric-content">
                <h4>Avg Rating</h4>
                <p className="tourism-metric-value">
                  {vendorData.avgRating?.toFixed(1) || "N/A"}
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">📈</div>
              <div className="tourism-metric-content">
                <h4>Conversion Rate</h4>
                <p className="tourism-metric-value">
                  {vendorData.conversionRate?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            <div className="tourism-metric-card">
              <div className="tourism-metric-icon">💬</div>
              <div className="tourism-metric-content">
                <h4>Total Reviews</h4>
                <p className="tourism-metric-value">
                  {vendorData.totalReviews?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Your Popular Packages */}
          {popularPackages.length > 0 && (
            <div className="tourism-chart-card">
              <h3>🔥 Your Popular Packages</h3>
              <div className="tourism-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Package</th>
                      <th>Destination</th>
                      <th>Bookings</th>
                      <th>Revenue</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularPackages
                      .filter((pkg) => pkg.vendorId === vendorId)
                      .slice(0, 10)
                      .map((pkg, idx) => (
                        <tr key={pkg._id}>
                          <td>#{idx + 1}</td>
                          <td>{pkg.title}</td>
                          <td>{pkg.destination}</td>
                          <td>{pkg.bookingsCount}</td>
                          <td>{formatInr(pkg.startPrice * pkg.bookingsCount)}</td>
                          <td>⭐ {pkg.rating?.toFixed(1) || "N/A"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
