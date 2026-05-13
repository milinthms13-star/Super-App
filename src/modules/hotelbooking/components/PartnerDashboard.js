import React, { useState, useEffect } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../HotelBooking.css";

const PartnerDashboard = ({ currentUser }) => {
  const { apiCall } = useApp();
  const [activePartnerTab, setActivePartnerTab] = useState("overview");
  const [properties, setProperties] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [commissionSettings, setCommissionSettings] = useState({
    defaultRate: 10,
    basicRate: 8,
    featuredRate: 12,
    premiumRate: 15,
  });
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [imageDragActive, setImageDragActive] = useState(false);
  const [selectedBookingRequest, setSelectedBookingRequest] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [featuredProperty, setFeaturedProperty] = useState(null);
  
  // Property form state
  const [propertyForm, setPropertyForm] = useState({
    businessName: "",
    propertyType: "Hotel",
    location: "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
    email: "",
    description: "",
    amenities: [],
    images: [],
  });
  const [editingProperty, setEditingProperty] = useState(null);

  // Room form state
  const [roomForm, setRoomForm] = useState({
    type: "",
    capacity: 1,
    bedType: "Double",
    basePrice: 0,
    totalInventory: 1,
    amenities: [],
    cancellationPolicy: "Flexible",
  });

  const resetRoomForm = () => {
    setEditingRoom(null);
    setRoomForm({
      type: "",
      capacity: 1,
      bedType: "Double",
      basePrice: 0,
      totalInventory: 1,
      amenities: [],
      cancellationPolicy: "Flexible",
    });
  };

  const handleRoomFormChange = (e) => {
    const { name, value } = e.target;
    setRoomForm(prev => ({
      ...prev,
      [name]: name === "capacity" || name === "basePrice" || name === "totalInventory"
        ? Number(value)
        : value,
    }));
  };

  const handleRoomAmenityToggle = (amenity) => {
    setRoomForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const openRoomForm = (property, room = null) => {
    setSelectedProperty(property);
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        ...room,
        basePrice: Number(room.basePrice),
        capacity: Number(room.capacity),
        totalInventory: Number(room.totalInventory),
      });
    } else {
      resetRoomForm();
    }
    setShowRoomForm(true);
  };

  const saveRoomToProperty = () => {
    if (!selectedProperty) {
      return;
    }

    const roomId = editingRoom ? editingRoom._id : Date.now().toString();
    const roomData = {
      ...roomForm,
      _id: roomId,
    };

    const updatedProperties = properties.map(property => {
      if (property._id !== selectedProperty._id) {
        return property;
      }

      const existingRooms = Array.isArray(property.rooms) ? property.rooms : [];
      const updatedRooms = editingRoom
        ? existingRooms.map(room => (room._id === roomId ? roomData : room))
        : [...existingRooms, roomData];

      return {
        ...property,
        rooms: updatedRooms,
      };
    });

    setProperties(updatedProperties);
    localStorage.setItem(`partner_properties_${currentUser?.id}`, JSON.stringify(updatedProperties));
    setShowRoomForm(false);
    setSelectedProperty(null);
    resetRoomForm();
    alert(`Room ${editingRoom ? "updated" : "added"} successfully!`);
  };

  const handleEditRoom = (property, room) => {
    openRoomForm(property, room);
  };

  const handleDeleteRoom = (propertyId, roomId) => {
    const confirmed = window.confirm("Delete this room type? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    const updatedProperties = properties.map(property => {
      if (property._id !== propertyId) {
        return property;
      }

      return {
        ...property,
        rooms: (property.rooms || []).filter(room => room._id !== roomId),
      };
    });

    setProperties(updatedProperties);
    localStorage.setItem(`partner_properties_${currentUser?.id}`, JSON.stringify(updatedProperties));
  };

  const resetPropertyForm = () => {
    setEditingProperty(null);
    setPropertyForm({
      businessName: "",
      propertyType: "Hotel",
      location: "",
      address: "",
      city: "",
      pincode: "",
      phone: "",
      email: "",
      description: "",
      amenities: [],
      images: [],
    });
  };

  const openPropertyForm = (property = null) => {
    if (!property) {
      resetPropertyForm();
      setShowPropertyForm(true);
      return;
    }

    setEditingProperty(property);
    setPropertyForm({
      businessName: property.businessName || "",
      propertyType: property.propertyType || "Hotel",
      location: property.location || "",
      address: property.address || "",
      city: property.city || "",
      pincode: property.pincode || "",
      phone: property.phone || "",
      email: property.email || "",
      description: property.description || "",
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      images: Array.isArray(property.images) ? property.images : [],
    });
    setShowPropertyForm(true);
  };

  const openFeaturedUpgradeModal = (property) => {
    setFeaturedProperty(property);
    setShowFeaturedModal(true);
  };

  const confirmFeaturedUpgrade = () => {
    if (!featuredProperty) {
      return;
    }

    const updatedProperties = properties.map(property =>
      property._id === featuredProperty._id
        ? { ...property, isFeatured: true, listingType: "featured" }
        : property
    );
    setProperties(updatedProperties);
    localStorage.setItem(`partner_properties_${currentUser?.id}`, JSON.stringify(updatedProperties));
    setShowFeaturedModal(false);
    setFeaturedProperty(null);
    alert(`"${featuredProperty.businessName}" is now a Featured Listing.`);
  };

  const closeFeaturedUpgradeModal = () => {
    setShowFeaturedModal(false);
    setFeaturedProperty(null);
  };

  // Load partner data on mount
  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      // Try API calls first, fallback to localStorage
      try {
        const propertiesRes = await apiCall(`/api/partner/properties/${currentUser.id}`);
        setProperties(propertiesRes?.data || []);
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
        const savedProperties = localStorage.getItem(`partner_properties_${currentUser?.id}`);
        setProperties(savedProperties ? JSON.parse(savedProperties) : []);
      }

      try {
        const bookingsRes = await apiCall(`/api/partner/booking-requests/${currentUser.id}`);
        setBookingRequests(bookingsRes?.data || []);
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
        const savedBookingRequests = localStorage.getItem(`booking_requests_${currentUser?.id}`);
        setBookingRequests(savedBookingRequests ? JSON.parse(savedBookingRequests) : []);
      }

      try {
        const payoutsRes = await apiCall(`/api/partner/payouts/${currentUser.id}`);
        setPayouts(payoutsRes?.data || []);
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
        const savedPayouts = localStorage.getItem(`payouts_${currentUser?.id}`);
        setPayouts(savedPayouts ? JSON.parse(savedPayouts) : []);
      }

      // Load commission settings (admin controlled)
      const savedCommissionSettings = localStorage.getItem("admin_commission_settings");
      if (savedCommissionSettings) {
        setCommissionSettings(JSON.parse(savedCommissionSettings));
      }
    } catch (error) {
      console.error("Error loading partner data:", error);
    }
  };

  const handlePropertyFormChange = (e) => {
    const { name, value } = e.target;
    setPropertyForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setPropertyForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPropertyForm(prev => ({
          ...prev,
          images: [...prev.images, event.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(true);
  };

  const handleImageDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(false);
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(false);
    const files = Array.from(e.dataTransfer.files || []).filter(file => file.type.startsWith("image/"));
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPropertyForm(prev => ({
          ...prev,
          images: [...prev.images, event.target.result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    setPropertyForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const submitPropertyForm = async () => {
    try {
      const propertyData = { ...propertyForm, ownerId: currentUser?.id };
      const isEditing = Boolean(editingProperty);
      const endpoint = isEditing ? `/api/hotels/${editingProperty._id}` : "/api/hotels/create";
      const method = isEditing ? "PUT" : "POST";

      try {
        const response = await apiCall(endpoint, method, propertyData);
        const updatedProperty = response?.data || response || {
          ...propertyData,
          _id: editingProperty?._id || Date.now().toString(),
          verified: editingProperty?.verified || false,
          rooms: editingProperty?.rooms || [],
          isFeatured: editingProperty?.isFeatured || false,
          listingType: editingProperty?.listingType || "standard",
          stats: editingProperty?.stats || { bookings: 0, revenue: 0, rating: 0 },
        };

        const updatedProperties = isEditing
          ? properties.map(property => property._id === editingProperty._id ? { ...property, ...updatedProperty } : property)
          : [...properties, { ...updatedProperty, _id: updatedProperty._id || Date.now().toString() }];

        setProperties(updatedProperties);
        localStorage.setItem(`partner_properties_${currentUser?.id}`, JSON.stringify(updatedProperties));
        alert(`Property "${propertyForm.businessName}" ${isEditing ? "updated" : "registered"} successfully!`);
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
        const fallbackProperty = {
          ...propertyData,
          _id: editingProperty?._id || Date.now().toString(),
          verified: editingProperty?.verified || false,
          rooms: editingProperty?.rooms || [],
          isFeatured: editingProperty?.isFeatured || false,
          listingType: editingProperty?.listingType || "standard",
          stats: editingProperty?.stats || { bookings: 0, revenue: 0, rating: 0 },
        };

        const updatedProperties = isEditing
          ? properties.map(property => property._id === editingProperty._id ? { ...property, ...fallbackProperty } : property)
          : [...properties, fallbackProperty];

        setProperties(updatedProperties);
        localStorage.setItem(`partner_properties_${currentUser?.id}`, JSON.stringify(updatedProperties));
        alert(`Property "${propertyForm.businessName}" ${isEditing ? "updated" : "registered"} successfully (offline mode)!`);
      }

      setShowPropertyForm(false);
      resetPropertyForm();
    } catch (error) {
      console.error("Error submitting property:", error);
      alert("Failed to save property");
    }
  };

  const handleApproveBookingRequest = async (requestId) => {
    try {
      try {
        await apiCall(`/api/partner/booking-requests/${requestId}/approve`, "POST");
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
      }

      // Update local state regardless
      const updated = bookingRequests.map(req =>
        req._id === requestId ? { ...req, status: "approved" } : req
      );
      setBookingRequests(updated);
      localStorage.setItem(`booking_requests_${currentUser?.id}`, JSON.stringify(updated));
      alert("Booking request approved!");
    } catch (error) {
      console.error("Error approving booking:", error);
      alert("Failed to approve booking");
    }
  };

  const handleRejectBookingRequest = async (requestId) => {
    try {
      try {
        await apiCall(`/api/partner/booking-requests/${requestId}/reject`, "POST");
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
      }

      // Update local state regardless
      const updated = bookingRequests.map(req =>
        req._id === requestId ? { ...req, status: "rejected" } : req
      );
      setBookingRequests(updated);
      localStorage.setItem(`booking_requests_${currentUser?.id}`, JSON.stringify(updated));
      alert("Booking request rejected.");
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert("Failed to reject booking");
    }
  };

  const getPropertyForRequest = (request) => {
    return properties.find(property => property.businessName === request.hotelName);
  };

  const getCommissionRateForRequest = (request) => {
    const property = getPropertyForRequest(request);
    return property?.isFeatured ? commissionSettings.featuredRate : commissionSettings.defaultRate;
  };

  const getCommissionForRequest = (request) => {
    const rate = getCommissionRateForRequest(request);
    return Math.round((request.totalPrice || 0) * (rate / 100));
  };

  const approvedBookingRequests = bookingRequests.filter(req => req.status === "approved");
  const pendingPayoutAmount = approvedBookingRequests.reduce((sum, req) => {
    const rate = getCommissionRateForRequest(req);
    return sum + Math.round((req.totalPrice || 0) * (1 - rate / 100));
  }, 0);

  const handleSettlePayout = async (payoutId) => {
    try {
      try {
        await apiCall(`/api/partner/payouts/${payoutId}/settle`, "POST");
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
      }

      // Update local state regardless
      const updated = payouts.map(payout =>
        payout._id === payoutId ? { ...payout, status: "paid" } : payout
      );
      setPayouts(updated);
      localStorage.setItem(`payouts_${currentUser?.id}`, JSON.stringify(updated));
      alert("Payout marked as paid.");
    } catch (error) {
      console.error("Error settling payout:", error);
      alert("Failed to settle payout");
    }
  };

  const handleRequestPayout = async () => {
    if (approvedBookingRequests.length === 0) {
      alert("No approved bookings available for payout.");
      return;
    }

    try {
      const startDate = approvedBookingRequests.reduce((min, req) => {
        const date = new Date(req.checkInDate);
        return date < min ? date : min;
      }, new Date(approvedBookingRequests[0].checkInDate));

      const endDate = approvedBookingRequests.reduce((max, req) => {
        const date = new Date(req.checkOutDate);
        return date > max ? date : max;
      }, new Date(approvedBookingRequests[0].checkOutDate));

      const grossAmount = approvedBookingRequests.reduce((sum, req) => sum + (req.totalPrice || 0), 0);
      const commission = approvedBookingRequests.reduce((sum, req) => sum + getCommissionForRequest(req), 0);
      const netAmount = grossAmount - commission;

      const payoutData = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bookings: approvedBookingRequests.length,
        grossAmount,
        commission,
        netAmount,
        bookingIds: approvedBookingRequests.map(req => req._id),
      };

      try {
        const response = await apiCall("/api/partner/payouts/request", "POST", payoutData);
        const newPayout = response?.data || {
          ...payoutData,
          _id: Date.now().toString(),
          status: "pending",
        };

        const updatedPayouts = [...payouts, newPayout];
        setPayouts(updatedPayouts);
        localStorage.setItem(`payouts_${currentUser?.id}`, JSON.stringify(updatedPayouts));
        alert("Payout request submitted successfully!");
      } catch (apiError) {
        console.warn("API call failed, using localStorage:", apiError);
        // Fallback to localStorage
        const newPayout = {
          ...payoutData,
          _id: Date.now().toString(),
          status: "pending",
        };

        const updatedPayouts = [...payouts, newPayout];
        setPayouts(updatedPayouts);
        localStorage.setItem(`payouts_${currentUser?.id}`, JSON.stringify(updatedPayouts));
        alert("Payout request created (offline mode).");
      }
    } catch (error) {
      console.error("Error requesting payout:", error);
      alert("Failed to request payout");
    }
  };

  const handleContactGuest = (request) => {
    const contactInfo = request.guestEmail || request.guestPhone || "No contact available";
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(contactInfo)
        .then(() => alert(`Guest contact copied: ${contactInfo}`))
        .catch(() => alert(`Guest contact: ${contactInfo}`));
    } else {
      alert(`Guest contact: ${contactInfo}`);
    }
  };

  const openBookingDetails = (request) => {
    setSelectedBookingRequest(request);
    setShowBookingDetails(true);
  };

  const closeBookingDetails = () => {
    setSelectedBookingRequest(null);
    setShowBookingDetails(false);
  };

  return (
    <section className="hotel-booking-section">
      <div className="hotel-booking-section-heading">
        <h2>Partner Dashboard</h2>
        <p>Manage your properties, bookings, and payouts.</p>
      </div>

      {/* Partner Navigation */}
      <div className="hotel-booking-partner-nav">
        <button
          type="button"
          className={`hotel-booking-partner-nav-item ${activePartnerTab === "overview" ? "active" : ""}`}
          onClick={() => setActivePartnerTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`hotel-booking-partner-nav-item ${activePartnerTab === "properties" ? "active" : ""}`}
          onClick={() => setActivePartnerTab("properties")}
        >
          My Properties ({properties.length})
        </button>
        <button
          type="button"
          className={`hotel-booking-partner-nav-item ${activePartnerTab === "bookings" ? "active" : ""}`}
          onClick={() => setActivePartnerTab("bookings")}
        >
          Booking Requests ({bookingRequests.filter(b => b.status === "pending").length})
        </button>
        <button
          type="button"
          className={`hotel-booking-partner-nav-item ${activePartnerTab === "payouts" ? "active" : ""}`}
          onClick={() => setActivePartnerTab("payouts")}
        >
          Payouts
        </button>
      </div>

      {/* Overview Tab */}
      {activePartnerTab === "overview" && (
        <div className="hotel-booking-partner-content">
          <div className="hotel-booking-partner-stats">
            <div className="hotel-booking-partner-stat-card">
              <div className="hotel-booking-stat-value">{properties.length}</div>
              <div className="hotel-booking-stat-label">Properties Listed</div>
              <div className="hotel-booking-stat-subtitle">
                {properties.filter(p => p.verified).length} verified
              </div>
            </div>

            <div className="hotel-booking-partner-stat-card">
              <div className="hotel-booking-stat-value">{bookingRequests.filter(b => b.status === "pending").length}</div>
              <div className="hotel-booking-stat-label">Pending Bookings</div>
              <div className="hotel-booking-stat-subtitle">
                {bookingRequests.filter(b => b.status === "approved").length} approved
              </div>
            </div>

            <div className="hotel-booking-partner-stat-card">
              <div className="hotel-booking-stat-value">₹{payouts.reduce((sum, p) => sum + (p.netAmount || 0), 0).toLocaleString()}</div>
              <div className="hotel-booking-stat-label">Total Earnings</div>
              <div className="hotel-booking-stat-subtitle">Pending payout: ₹{pendingPayoutAmount.toLocaleString()}</div>
            </div>

            <div className="hotel-booking-partner-stat-card">
              <div className="hotel-booking-stat-value">{bookingRequests.length}</div>
              <div className="hotel-booking-stat-label">Total Bookings</div>
              <div className="hotel-booking-stat-subtitle">This month</div>
            </div>
          </div>

          <div className="hotel-booking-partner-grid">
            <div className="hotel-booking-partner-card">
              <h3>🏨 Register New Property</h3>
              <p>Add your hotel, homestay, or resort to NilaStay</p>
              <ul>
                <li>✓ Free basic listing</li>
                <li>✓ Reach Kerala tourists</li>
                <li>✓ 10% commission per booking</li>
                <li>✓ Direct customer contact</li>
              </ul>
              <button
                type="button"
                className="hotel-booking-primary-button"
                onClick={() => setShowPropertyForm(true)}
              >
                Register Property
              </button>
            </div>

            <div className="hotel-booking-partner-card">
              <h3>⭐ Featured Listing</h3>
              <p>Get premium visibility and more bookings</p>
              <ul>
                <li>✓ Top search results</li>
                <li>✓ Priority support</li>
                <li>✓ ₹299/month</li>
                <li>✓ Analytics included</li>
              </ul>
              <button
                type="button"
                className="hotel-booking-secondary-button"
                onClick={() => {
                  const nextStandard = properties.find(property => !property.isFeatured);
                  if (nextStandard) {
                    openFeaturedUpgradeModal(nextStandard);
                    setActivePartnerTab("properties");
                  } else {
                    alert("All your properties are already featured.");
                  }
                }}
              >
                {properties.some(property => !property.isFeatured) ? "Upgrade a Property" : "All Properties Featured"}
              </button>
            </div>

            <div className="hotel-booking-partner-card">
              <h3>💡 Partner Growth Pack</h3>
              <p>Professional tools to scale your business</p>
              <ul>
                <li>✓ Professional photos</li>
                <li>✓ SEO optimization</li>
                <li>✓ Seasonal pricing</li>
                <li>✓ Dedicated support</li>
              </ul>
              <button type="button" className="hotel-booking-secondary-button">
                Learn More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Properties Tab */}
      {activePartnerTab === "properties" && (
        <div className="hotel-booking-partner-content">
          {properties.length === 0 ? (
            <div className="hotel-booking-empty-state">
              <p>📭 No properties registered yet</p>
              <p>Start by registering your first property</p>
              <button
                type="button"
                className="hotel-booking-primary-button"
                onClick={() => setShowPropertyForm(true)}
              >
                Register Property
              </button>
            </div>
          ) : (
            <div className="hotel-booking-properties-grid">
              {properties.map(property => (
                <div key={property._id} className="hotel-booking-property-card">
                  <div className="hotel-booking-property-header">
                    <h3>{property.businessName}</h3>
                    <span className={`hotel-booking-status ${property.verified ? "hotel-booking-status-confirmed" : "hotel-booking-status-pending"}`}>
                      {property.verified ? "✓ Verified" : "⏳ Pending"}
                    </span>
                  </div>

                  <div className="hotel-booking-property-info">
                    <p><strong>Location:</strong> {property.location}</p>
                    <p><strong>Type:</strong> {property.propertyType}</p>
                    <p><strong>Rooms:</strong> {property.rooms?.length || 0}</p>
                    <p><strong>Bookings:</strong> {property.stats?.bookings || 0}</p>
                    <p><strong>Revenue:</strong> ₹{property.stats?.revenue?.toLocaleString() || 0}</p>
                  </div>

                  {property.rooms?.length > 0 && (
                    <div className="hotel-booking-room-list">
                      {property.rooms.map(room => (
                        <div key={room._id} className="hotel-booking-room-card">
                          <div>
                            <h4>{room.type}</h4>
                            <p>{room.bedType} bed • Capacity {room.capacity}</p>
                            <p>₹{room.basePrice.toLocaleString()} / night</p>
                          </div>
                          <div className="hotel-booking-room-actions">
                            <button
                              type="button"
                              className="hotel-booking-secondary-button"
                              onClick={() => handleEditRoom(property, room)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="hotel-booking-danger-button"
                              onClick={() => handleDeleteRoom(property._id, room._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="hotel-booking-property-actions">
                    {property.isFeatured ? (
                      <span className="hotel-booking-badge hotel-booking-badge-featured">Featured Listing</span>
                    ) : (
                      <button
                        type="button"
                        className="hotel-booking-secondary-button"
                        onClick={() => openFeaturedUpgradeModal(property)}
                      >
                        Upgrade to Featured
                      </button>
                    )}
                    <button
                      type="button"
                      className="hotel-booking-secondary-button"
                      onClick={() => openRoomForm(property)}
                    >
                      + Add Room
                    </button>
                    <button
                      type="button"
                      className="hotel-booking-secondary-button"
                      onClick={() => openPropertyForm(property)}
                    >
                      Edit Property
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Requests Tab */}
      {activePartnerTab === "bookings" && (
        <div className="hotel-booking-partner-content">
          {bookingRequests.length === 0 ? (
            <div className="hotel-booking-empty-state">
              <p>📭 No booking requests yet</p>
              <p>When customers book your properties, requests will appear here</p>
            </div>
          ) : (
            <div className="hotel-booking-booking-requests-list">
              {bookingRequests.map(request => (
                <div key={request._id} className="hotel-booking-booking-request-card">
                  <div className="hotel-booking-request-header">
                    <div>
                      <h3>{request.hotelName}</h3>
                      <p className="hotel-booking-guest-name">Guest: {request.guestName}</p>
                    </div>
                    <span className={`hotel-booking-status hotel-booking-status-${request.status}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="hotel-booking-request-details">
                    <span>📅 {new Date(request.checkInDate).toLocaleDateString()} - {new Date(request.checkOutDate).toLocaleDateString()}</span>
                    <span>👤 {request.numberOfGuests} guests</span>
                    <span>🏠 {request.roomType}</span>
                    <span>💰 ₹{request.totalPrice.toLocaleString()}</span>
                  </div>

                  {request.specialRequests && (
                    <div className="hotel-booking-request-notes">
                      <strong>Notes:</strong> {request.specialRequests}
                    </div>
                  )}

                  <div className="hotel-booking-request-actions">
                    <button
                      type="button"
                      className="hotel-booking-secondary-button"
                      onClick={() => openBookingDetails(request)}
                    >
                      📄 View Details
                    </button>
                    {request.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="hotel-booking-primary-button"
                          onClick={() => handleApproveBookingRequest(request._id)}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          className="hotel-booking-danger-button"
                          onClick={() => handleRejectBookingRequest(request._id)}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="hotel-booking-secondary-button"
                      onClick={() => handleContactGuest(request)}
                    >
                      📞 Contact Guest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Featured Upgrade Modal */}
      {showFeaturedModal && featuredProperty && (
        <div className="hotel-booking-modal-overlay">
          <div className="hotel-booking-modal">
            <div className="hotel-booking-modal-header">
              <h2>Upgrade to Featured Listing</h2>
              <button
                type="button"
                className="hotel-booking-modal-close"
                onClick={closeFeaturedUpgradeModal}
              >
                ✕
              </button>
            </div>

            <div className="hotel-booking-modal-body">
              <div className="hotel-booking-modal-section">
                <h3>{featuredProperty.businessName}</h3>
                <p>{featuredProperty.location} • {featuredProperty.propertyType}</p>
                <p>{featuredProperty.description || "No property description available."}</p>
              </div>

              <div className="hotel-booking-modal-section">
                <h3>Upgrade Benefits</h3>
                <ul>
                  <li>Priority placement in search</li>
                  <li>Higher customer visibility</li>
                  <li>Featured badge on listing</li>
                  <li>Better booking conversion</li>
                </ul>
              </div>

              <div className="hotel-booking-modal-section">
                <h3>Upgrade Fee</h3>
                <p>₹299 for the first month (mock pricing)</p>
                <p>Featured commission rate: {commissionSettings.featuredRate}%</p>
              </div>
            </div>

            <div className="hotel-booking-modal-actions">
              <button
                type="button"
                className="hotel-booking-secondary-button"
                onClick={closeFeaturedUpgradeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hotel-booking-primary-button"
                onClick={confirmFeaturedUpgrade}
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBookingRequest && (
        <div className="hotel-booking-modal-overlay">
          <div className="hotel-booking-modal">
            <div className="hotel-booking-modal-header">
              <h2>Booking Request Details</h2>
              <button
                type="button"
                className="hotel-booking-modal-close"
                onClick={closeBookingDetails}
              >
                ✕
              </button>
            </div>

            <div className="hotel-booking-modal-body">
              <div className="hotel-booking-modal-section">
                <h3>{selectedBookingRequest.hotelName}</h3>
                <p><strong>Guest:</strong> {selectedBookingRequest.guestName}</p>
                <p><strong>Check-in:</strong> {new Date(selectedBookingRequest.checkInDate).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> {new Date(selectedBookingRequest.checkOutDate).toLocaleDateString()}</p>
                <p><strong>Guests:</strong> {selectedBookingRequest.numberOfGuests}</p>
                <p><strong>Room Type:</strong> {selectedBookingRequest.roomType}</p>
                <p><strong>Total Price:</strong> ₹{selectedBookingRequest.totalPrice?.toLocaleString()}</p>
                <p><strong>Contact:</strong> {selectedBookingRequest.guestEmail || selectedBookingRequest.guestPhone || "Not provided"}</p>
              </div>

              {selectedBookingRequest.specialRequests && (
                <div className="hotel-booking-request-notes">
                  <strong>Guest Notes:</strong> {selectedBookingRequest.specialRequests}
                </div>
              )}
            </div>

            <div className="hotel-booking-modal-actions">
              <button
                type="button"
                className="hotel-booking-secondary-button"
                onClick={closeBookingDetails}
              >
                Close
              </button>
              {selectedBookingRequest.status === "pending" && (
                <>
                  <button
                    type="button"
                    className="hotel-booking-danger-button"
                    onClick={() => {
                      handleRejectBookingRequest(selectedBookingRequest._id);
                      closeBookingDetails();
                    }}
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    className="hotel-booking-primary-button"
                    onClick={() => {
                      handleApproveBookingRequest(selectedBookingRequest._id);
                      closeBookingDetails();
                    }}
                  >
                    Approve Request
                  </button>
                </>
              )}
              <button
                type="button"
                className="hotel-booking-secondary-button"
                onClick={() => handleContactGuest(selectedBookingRequest)}
              >
                Contact Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activePartnerTab === "payouts" && (
        <div className="hotel-booking-partner-content">
          {payouts.length === 0 ? (
            <div className="hotel-booking-empty-state">
              <p>💰 No payouts yet</p>
              <p>Your first payout will be available after 10 confirmed bookings</p>
              {approvedBookingRequests.length > 0 && (
                <button
                  type="button"
                  className="hotel-booking-primary-button"
                  onClick={handleRequestPayout}
                >
                  Request Payout
                </button>
              )}
            </div>
          ) : (
            <>
              {approvedBookingRequests.length > 0 && (
                <div className="hotel-booking-partner-card" style={{ marginBottom: "1.5rem" }}>
                  <h3>Pending Request</h3>
                  <p>{approvedBookingRequests.length} approved booking(s) ready for payout.</p>
                  <p>
                    Expected net amount: <strong>₹{pendingPayoutAmount.toLocaleString()}</strong>
                  </p>
                  <button
                    type="button"
                    className="hotel-booking-primary-button"
                    onClick={handleRequestPayout}
                  >
                    Generate Payout Request
                  </button>
                </div>
              )}
              <div className="hotel-booking-payouts-list">
              {payouts.map(payout => (
                <div key={payout._id} className="hotel-booking-payout-card">
                  <div className="hotel-booking-payout-header">
                    <div>
                      <h3>Payout Period: {new Date(payout.startDate).toLocaleDateString()} - {new Date(payout.endDate).toLocaleDateString()}</h3>
                      <span className={`hotel-booking-status hotel-booking-status-${payout.status}`}>
                        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="hotel-booking-payout-details">
                    <div className="hotel-booking-payout-item">
                      <span>Bookings:</span>
                      <strong>{payout.bookings}</strong>
                    </div>
                    <div className="hotel-booking-payout-item">
                      <span>Gross Amount:</span>
                      <strong>₹{payout.grossAmount?.toLocaleString()}</strong>
                    </div>
                    <div className="hotel-booking-payout-item">
                      <span>Commission ({payout.grossAmount > 0 ? Math.round((payout.commission / payout.grossAmount) * 100) : commissionSettings.defaultRate}%):</span>
                      <strong>-₹{payout.commission?.toLocaleString()}</strong>
                    </div>
                    <div className="hotel-booking-payout-item hotel-booking-payout-total">
                      <span>Net Payout:</span>
                      <strong>₹{payout.netAmount?.toLocaleString()}</strong>
                    </div>
                  </div>
                  {payout.status === "pending" && (
                    <div className="hotel-booking-payout-actions">
                      <button
                        type="button"
                        className="hotel-booking-primary-button"
                        onClick={() => handleSettlePayout(payout._id)}
                      >
                        Mark as Paid
                      </button>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Room Form Modal */}
      {showRoomForm && (
        <div className="hotel-booking-modal-overlay">
          <div className="hotel-booking-modal">
            <div className="hotel-booking-modal-header">
              <h2>{editingRoom ? "Edit Room" : "Add Room"}</h2>
              <button
                type="button"
                className="hotel-booking-modal-close"
                onClick={() => {
                  setShowRoomForm(false);
                  setSelectedProperty(null);
                  resetRoomForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="hotel-booking-modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRoomToProperty();
                }}
              >
                <div className="hotel-booking-form-section">
                  <h3>Room Details</h3>

                  <div className="hotel-booking-form-group">
                    <label>Room Type *</label>
                    <input
                      type="text"
                      name="type"
                      value={roomForm.type}
                      onChange={handleRoomFormChange}
                      placeholder="Deluxe, Standard, Suite"
                      required
                    />
                  </div>

                  <div className="hotel-booking-form-row">
                    <div className="hotel-booking-form-group">
                      <label>Capacity *</label>
                      <input
                        type="number"
                        name="capacity"
                        value={roomForm.capacity}
                        min="1"
                        onChange={handleRoomFormChange}
                        required
                      />
                    </div>
                    <div className="hotel-booking-form-group">
                      <label>Bed Type *</label>
                      <select
                        name="bedType"
                        value={roomForm.bedType}
                        onChange={handleRoomFormChange}
                      >
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Twin">Twin</option>
                        <option value="King">King</option>
                        <option value="Queen">Queen</option>
                      </select>
                    </div>
                  </div>

                  <div className="hotel-booking-form-row">
                    <div className="hotel-booking-form-group">
                      <label>Price per Night *</label>
                      <input
                        type="number"
                        name="basePrice"
                        value={roomForm.basePrice}
                        min="0"
                        onChange={handleRoomFormChange}
                        required
                      />
                    </div>
                    <div className="hotel-booking-form-group">
                      <label>Inventory *</label>
                      <input
                        type="number"
                        name="totalInventory"
                        value={roomForm.totalInventory}
                        min="1"
                        onChange={handleRoomFormChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Room Amenities</h3>
                  <div className="hotel-booking-amenities-grid">
                    {[
                      "WiFi",
                      "AC",
                      "Breakfast",
                      "River View",
                      "Balcony",
                      "Work Desk",
                      "TV",
                      "Mini Fridge",
                    ].map(amenity => (
                      <label key={amenity} className="hotel-booking-checkbox-large">
                        <input
                          type="checkbox"
                          checked={roomForm.amenities.includes(amenity)}
                          onChange={() => handleRoomAmenityToggle(amenity)}
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Policy</h3>
                  <div className="hotel-booking-form-group">
                    <label>Cancellation Policy</label>
                    <select
                      name="cancellationPolicy"
                      value={roomForm.cancellationPolicy}
                      onChange={handleRoomFormChange}
                    >
                      <option value="Flexible">Flexible</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Strict">Strict</option>
                    </select>
                  </div>
                </div>

                <div className="hotel-booking-modal-actions">
                  <button
                    type="button"
                    className="hotel-booking-secondary-button"
                    onClick={() => {
                      setShowRoomForm(false);
                      setSelectedProperty(null);
                      resetRoomForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hotel-booking-primary-button">
                    {editingRoom ? "Update Room" : "Save Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Property Registration Form Modal */}
      {showPropertyForm && (
        <div className="hotel-booking-modal-overlay">
          <div className="hotel-booking-modal">
            <div className="hotel-booking-modal-header">
              <h2>Register Your Property</h2>
              <button
                type="button"
                className="hotel-booking-modal-close"
                onClick={() => setShowPropertyForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="hotel-booking-modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPropertyForm();
                }}
              >
                <div className="hotel-booking-form-section">
                  <h3>Property Information</h3>

                  <div className="hotel-booking-form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      name="businessName"
                      value={propertyForm.businessName}
                      onChange={handlePropertyFormChange}
                      placeholder="Your hotel/homestay name"
                      required
                    />
                  </div>

                  <div className="hotel-booking-form-group">
                    <label>Property Type *</label>
                    <select
                      name="propertyType"
                      value={propertyForm.propertyType}
                      onChange={handlePropertyFormChange}
                    >
                      <option value="Hotel">Hotel</option>
                      <option value="Homestay">Homestay</option>
                      <option value="Resort">Resort</option>
                      <option value="Lodge">Lodge</option>
                      <option value="Villa">Villa</option>
                      <option value="Cottage">Cottage</option>
                    </select>
                  </div>

                  <div className="hotel-booking-form-group">
                    <label>Description *</label>
                    <textarea
                      name="description"
                      value={propertyForm.description}
                      onChange={handlePropertyFormChange}
                      placeholder="Describe your property..."
                      rows="4"
                      required
                    />
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Location Details</h3>

                  <div className="hotel-booking-form-group">
                    <label>Location *</label>
                    <select
                      name="location"
                      value={propertyForm.location}
                      onChange={handlePropertyFormChange}
                      required
                    >
                      <option value="">Select location</option>
                      <option value="Kollam">Kollam</option>
                      <option value="Varkala">Varkala</option>
                      <option value="Alleppey">Alleppey</option>
                      <option value="Munnar">Munnar</option>
                      <option value="Thekkady">Thekkady</option>
                      <option value="Kochi">Kochi</option>
                      <option value="Trivandrum">Trivandrum</option>
                      <option value="Kovalam">Kovalam</option>
                      <option value="Wayanad">Wayanad</option>
                    </select>
                  </div>

                  <div className="hotel-booking-form-group">
                    <label>Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={propertyForm.address}
                      onChange={handlePropertyFormChange}
                      placeholder="Full address"
                      required
                    />
                  </div>

                  <div className="hotel-booking-form-row">
                    <div className="hotel-booking-form-group">
                      <label>City *</label>
                      <input
                        type="text"
                        name="city"
                        value={propertyForm.city}
                        onChange={handlePropertyFormChange}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="hotel-booking-form-group">
                      <label>Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={propertyForm.pincode}
                        onChange={handlePropertyFormChange}
                        placeholder="Pincode"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Contact Information</h3>

                  <div className="hotel-booking-form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={propertyForm.phone}
                      onChange={handlePropertyFormChange}
                      placeholder="10-digit phone number"
                      maxLength="10"
                      required
                    />
                  </div>

                  <div className="hotel-booking-form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={propertyForm.email}
                      onChange={handlePropertyFormChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Amenities</h3>

                  <div className="hotel-booking-amenities-grid">
                    {["WiFi", "AC", "Parking", "Swimming Pool", "Restaurant", "Spa", "Gym", "Pet Friendly", "Family Friendly"].map(
                      amenity => (
                        <label key={amenity} className="hotel-booking-checkbox-large">
                          <input
                            type="checkbox"
                            checked={propertyForm.amenities.includes(amenity)}
                            onChange={() => handleAmenityToggle(amenity)}
                          />
                          {amenity}
                        </label>
                      )
                    )}
                  </div>
                </div>

                <div className="hotel-booking-form-section">
                  <h3>Property Photos</h3>
                  <div
                    className={`hotel-booking-file-upload${imageDragActive ? " drag-active" : ""}`}
                    onDragEnter={handleImageDragEnter}
                    onDragOver={handleImageDragEnter}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                  >
                    <label>Upload Photos (Max 5)</label>
                    <p>Drag & drop images here, or click to browse</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={propertyForm.images.length >= 5}
                    />
                  </div>

                  {propertyForm.images.length > 0 && (
                    <div className="hotel-booking-image-preview-grid">
                      {propertyForm.images.map((image, idx) => (
                        <div key={idx} className="hotel-booking-image-preview">
                          <img src={image} alt={`Preview ${idx}`} />
                          <button
                            type="button"
                            className="hotel-booking-remove-image"
                            onClick={() => handleRemoveImage(idx)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hotel-booking-modal-actions">
                  <button
                    type="button"
                    className="hotel-booking-secondary-button"
                    onClick={() => setShowPropertyForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hotel-booking-primary-button">
                    Register Property
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PartnerDashboard;
