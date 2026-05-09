# Ecommerce Phase 1 - Frontend Integration Guide
**Date:** May 9, 2026  
**Framework:** React / React Native  
**Status:** Ready for Implementation

---

## 📑 Table of Contents

1. [Setup & Configuration](#setup)
2. [Wishlist Component](#wishlist-component)
3. [Recently Viewed Component](#recently-viewed-component)
4. [Address Manager Component](#address-manager-component)
5. [Payment Methods Component](#payment-methods-component)
6. [Search History Component](#search-history-component)
7. [Hook Patterns](#hook-patterns)

---

## Setup

### 1. Create API Service Layer
```javascript
// src/services/ecommerceAPI.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ecommerceAPI = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
ecommerceAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const wishlistAPI = {
  getWishlist: () => ecommerceAPI.get('/wishlist/me'),
  addItem: (productId, notes = '') => 
    ecommerceAPI.post('/wishlist/items', { productId, notes, quantity: 1 }),
  removeItem: (productId) => ecommerceAPI.delete(`/wishlist/items/${productId}`),
  updateNotes: (productId, notes) => 
    ecommerceAPI.patch(`/wishlist/items/${productId}/notes`, { notes }),
  togglePriceNotification: (productId) => 
    ecommerceAPI.patch(`/wishlist/items/${productId}/notify/price`),
  toggleStockNotification: (productId) => 
    ecommerceAPI.patch(`/wishlist/items/${productId}/notify/stock`),
  clear: () => ecommerceAPI.delete('/wishlist/clear'),
  generateShareLink: () => ecommerceAPI.post('/wishlist/share'),
  getSharedWishlist: (shareLink) => 
    ecommerceAPI.get(`/wishlist/share/${shareLink}`),
  disableSharing: () => ecommerceAPI.delete('/wishlist/share'),
  getStats: () => ecommerceAPI.get('/wishlist/stats'),
};

export const recentlyViewedAPI = {
  getRecentItems: (limit = 12) => 
    ecommerceAPI.get(`/recently-viewed/me?limit=${limit}`),
  trackView: (productId, deviceType = 'mobile', timeSpent = 0) =>
    ecommerceAPI.post('/recently-viewed/track', { 
      productId, deviceType, timeSpent 
    }),
  getByCategory: (category) => 
    ecommerceAPI.get(`/recently-viewed/category/${category}`),
  getAnalytics: () => ecommerceAPI.get('/recently-viewed/analytics'),
  getBrowsingPatterns: () => ecommerceAPI.get('/recently-viewed/patterns'),
  clear: () => ecommerceAPI.delete('/recently-viewed/clear'),
  removeItem: (productId) => ecommerceAPI.delete(`/recently-viewed/${productId}`),
};

export const addressAPI = {
  getAddresses: () => ecommerceAPI.get('/addresses/me'),
  getPrimary: () => ecommerceAPI.get('/addresses/primary'),
  addAddress: (data) => ecommerceAPI.post('/addresses/add', data),
  updateAddress: (addressId, data) => 
    ecommerceAPI.patch(`/addresses/${addressId}`, data),
  deleteAddress: (addressId) => ecommerceAPI.delete(`/addresses/${addressId}`),
  setPrimary: (addressId) => 
    ecommerceAPI.patch(`/addresses/${addressId}/set-primary`),
  recordUsage: (addressId) => ecommerceAPI.post(`/addresses/${addressId}/use`),
  verify: (addressId, lat, lng) =>
    ecommerceAPI.post(`/addresses/${addressId}/verify`, {
      latitude: lat,
      longitude: lng
    }),
  getStats: () => ecommerceAPI.get('/addresses/stats/usage'),
};

export const paymentMethodAPI = {
  getMethods: () => ecommerceAPI.get('/payment-methods/me'),
  getDefault: () => ecommerceAPI.get('/payment-methods/default'),
  addMethod: (data) => ecommerceAPI.post('/payment-methods/add', data),
  updateMethod: (methodId, data) => 
    ecommerceAPI.patch(`/payment-methods/${methodId}`, data),
  deleteMethod: (methodId) => ecommerceAPI.delete(`/payment-methods/${methodId}`),
  setDefault: (methodId) => 
    ecommerceAPI.patch(`/payment-methods/${methodId}/set-default`),
  recordUsage: (methodId, orderId) =>
    ecommerceAPI.post(`/payment-methods/${methodId}/use`, { orderId }),
  getStats: () => ecommerceAPI.get('/payment-methods/stats'),
};

export const searchHistoryAPI = {
  getHistory: (limit = 20) => 
    ecommerceAPI.get(`/search-history/me?limit=${limit}`),
  recordSearch: (query, filters = {}, resultsCount = 0) =>
    ecommerceAPI.post('/search-history/record', {
      query, filters, resultsCount, deviceType: 'mobile'
    }),
  getTrending: () => ecommerceAPI.get('/search-history/trending'),
  saveSearch: (name, query, filters = {}) =>
    ecommerceAPI.post('/search-history/save', { name, query, filters }),
  getSavedSearches: () => ecommerceAPI.get('/search-history/saved'),
  removeSavedSearch: (searchId) => 
    ecommerceAPI.delete(`/search-history/saved/${searchId}`),
  getAnalytics: () => ecommerceAPI.get('/search-history/analytics'),
  clear: () => ecommerceAPI.delete('/search-history/clear'),
  getSuggestions: (query, limit = 10) =>
    ecommerceAPI.get(`/search-history/suggestions/${query}?limit=${limit}`),
};

export default ecommerceAPI;
```

---

## Wishlist Component

### 1. Custom Hook
```javascript
// src/hooks/useWishlist.js
import { useState, useEffect } from 'react';
import { wishlistAPI } from '../services/ecommerceAPI';

export const useWishlist = () => {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await wishlistAPI.getWishlist();
      setWishlist(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch wishlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const addToWishlist = async (productId, notes = '') => {
    try {
      await wishlistAPI.addItem(productId, notes);
      await fetchWishlist();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await wishlistAPI.removeItem(productId);
      await fetchWishlist();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const isInWishlist = (productId) => {
    return wishlist?.items?.some((item) => 
      item.productId === productId
    ) || false;
  };

  const toggleNotification = async (productId, type = 'price') => {
    try {
      if (type === 'price') {
        await wishlistAPI.togglePriceNotification(productId);
      } else if (type === 'stock') {
        await wishlistAPI.toggleStockNotification(productId);
      }
      await fetchWishlist();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const shareWishlist = async () => {
    try {
      const response = await wishlistAPI.generateShareLink();
      return { 
        success: true, 
        shareUrl: response.data.data.shareUrl 
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  return {
    wishlist,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleNotification,
    shareWishlist,
    refetch: fetchWishlist,
  };
};
```

### 2. Wishlist UI Component
```javascript
// src/components/Wishlist/WishlistPage.jsx
import React, { useState } from 'react';
import { useWishlist } from '../../hooks/useWishlist';
import ProductCard from '../ProductCard';
import './WishlistPage.css';

export default function WishlistPage() {
  const { wishlist, loading, error, removeFromWishlist, shareWishlist } = 
    useWishlist();
  const [shareMessage, setShareMessage] = useState('');

  const handleShare = async () => {
    const result = await shareWishlist();
    if (result.success) {
      setShareMessage(`Share link: ${result.shareUrl}`);
      // Copy to clipboard
      navigator.clipboard.writeText(result.shareUrl);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <h1>My Wishlist</h1>
        <div className="wishlist-stats">
          <span>{wishlist?.totalItems} items</span>
          <span>₹{wishlist?.estimatedValue?.toLocaleString()}</span>
          <button onClick={handleShare} className="share-btn">
            📤 Share Wishlist
          </button>
        </div>
      </div>

      {shareMessage && (
        <div className="success-message">{shareMessage}</div>
      )}

      <div className="wishlist-grid">
        {wishlist?.items?.map((item) => (
          <div key={item.productId} className="wishlist-item">
            <ProductCard product={item} />
            <div className="item-actions">
              <button 
                onClick={() => removeFromWishlist(item.productId)}
                className="remove-btn"
              >
                ❌ Remove
              </button>
              <input 
                type="text" 
                placeholder="Add notes..."
                defaultValue={item.notes}
                className="notes-input"
              />
              <label className="checkbox">
                <input 
                  type="checkbox" 
                  defaultChecked={item.notifyOnPriceChange}
                />
                Notify on price change
              </label>
            </div>
          </div>
        ))}
      </div>

      {wishlist?.items?.length === 0 && (
        <div className="empty-state">
          <p>Your wishlist is empty</p>
          <a href="/products">Continue Shopping</a>
        </div>
      )}
    </div>
  );
}
```

### 3. Add to Wishlist Button
```javascript
// src/components/ProductCard/AddToWishlistButton.jsx
import React, { useState } from 'react';
import { useWishlist } from '../../hooks/useWishlist';

export default function AddToWishlistButton({ productId }) {
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const [loading, setLoading] = useState(false);
  const inWishlist = isInWishlist(productId);

  const handleClick = async () => {
    setLoading(true);
    if (inWishlist) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleClick}
      disabled={loading}
      className={`wishlist-btn ${inWishlist ? 'active' : ''}`}
    >
      {loading ? '...' : inWishlist ? '❤️' : '🤍'} Wishlist
    </button>
  );
}
```

---

## Recently Viewed Component

### 1. Custom Hook
```javascript
// src/hooks/useRecentlyViewed.js
import { useState, useEffect } from 'react';
import { recentlyViewedAPI } from '../services/ecommerceAPI';

export const useRecentlyViewed = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const fetchItems = async (limit = 12) => {
    setLoading(true);
    try {
      const response = await recentlyViewedAPI.getRecentItems(limit);
      setItems(response.data.data.items);
    } catch (err) {
      console.error('Error fetching recently viewed:', err);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (productId, timeSpent = 0) => {
    try {
      await recentlyViewedAPI.trackView(productId, 'mobile', timeSpent);
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  const getAnalytics = async () => {
    try {
      const response = await recentlyViewedAPI.getAnalytics();
      setAnalytics(response.data.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    getAnalytics();
  }, []);

  return {
    items,
    loading,
    analytics,
    trackView,
    refetch: fetchItems,
  };
};
```

### 2. Recently Viewed Carousel
```javascript
// src/components/RecentlyViewed/RecentlyViewedCarousel.jsx
import React from 'react';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import ProductCard from '../ProductCard';
import './RecentlyViewedCarousel.css';

export default function RecentlyViewedCarousel() {
  const { items, loading } = useRecentlyViewed();

  if (loading || items.length === 0) return null;

  return (
    <div className="recently-viewed-carousel">
      <h2>👀 Recently Viewed</h2>
      <div className="carousel">
        {items.slice(0, 8).map((item) => (
          <ProductCard key={item.productId} product={item} />
        ))}
      </div>
    </div>
  );
}
```

---

## Address Manager Component

### 1. Custom Hook
```javascript
// src/hooks/useAddresses.js
import { useState, useEffect } from 'react';
import { addressAPI } from '../services/ecommerceAPI';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [primaryAddress, setPrimaryAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await addressAPI.getAddresses();
      setAddresses(response.data.data.addresses);
      const primary = response.data.data.addresses.find((a) => a.isPrimary);
      setPrimaryAddress(primary);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const addAddress = async (data) => {
    try {
      await addressAPI.addAddress(data);
      await fetchAddresses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const updateAddress = async (addressId, data) => {
    try {
      await addressAPI.updateAddress(addressId, data);
      await fetchAddresses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      await addressAPI.deleteAddress(addressId);
      await fetchAddresses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const setPrimaryAddr = async (addressId) => {
    try {
      await addressAPI.setPrimary(addressId);
      await fetchAddresses();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  return {
    addresses,
    primaryAddress,
    loading,
    error,
    addAddress,
    updateAddress,
    deleteAddress,
    setPrimaryAddr,
    refetch: fetchAddresses,
  };
};
```

### 2. Address Manager UI
```javascript
// src/components/Address/AddressManager.jsx
import React, { useState } from 'react';
import { useAddresses } from '../../hooks/useAddresses';
import AddressForm from './AddressForm';
import AddressList from './AddressList';
import './AddressManager.css';

export default function AddressManager() {
  const { addresses, loading, error, addAddress, updateAddress, deleteAddress, setPrimaryAddr } = 
    useAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (data) => {
    if (editingId) {
      const result = await updateAddress(editingId, data);
      if (result.success) setEditingId(null);
    } else {
      const result = await addAddress(data);
      if (result.success) setShowForm(false);
    }
  };

  return (
    <div className="address-manager">
      <h2>My Addresses</h2>
      
      {error && <div className="error-message">{error}</div>}

      <AddressList 
        addresses={addresses}
        onEdit={setEditingId}
        onDelete={deleteAddress}
        onSetPrimary={setPrimaryAddr}
      />

      {showForm ? (
        <AddressForm 
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      ) : (
        <button onClick={() => setShowForm(true)} className="add-address-btn">
          ➕ Add New Address
        </button>
      )}
    </div>
  );
}
```

---

## Payment Methods Component

### 1. Custom Hook
```javascript
// src/hooks/usePaymentMethods.js
import { useState, useEffect } from 'react';
import { paymentMethodAPI } from '../services/ecommerceAPI';

export const usePaymentMethods = () => {
  const [methods, setMethods] = useState([]);
  const [defaultMethod, setDefaultMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const response = await paymentMethodAPI.getMethods();
      setMethods(response.data.data.methods);
      
      const def = response.data.data.methods.find((m) => m.isDefault);
      setDefaultMethod(def);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const addMethod = async (data) => {
    try {
      await paymentMethodAPI.addMethod(data);
      await fetchMethods();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const setAsDefault = async (methodId) => {
    try {
      await paymentMethodAPI.setDefault(methodId);
      await fetchMethods();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  const deleteMethod = async (methodId) => {
    try {
      await paymentMethodAPI.deleteMethod(methodId);
      await fetchMethods();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  };

  return {
    methods,
    defaultMethod,
    loading,
    error,
    addMethod,
    setAsDefault,
    deleteMethod,
    refetch: fetchMethods,
  };
};
```

---

## Search History Component

### 1. Custom Hook
```javascript
// src/hooks/useSearchHistory.js
import { useState, useCallback } from 'react';
import { searchHistoryAPI } from '../services/ecommerceAPI';

export const useSearchHistory = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);

  const recordSearch = useCallback(async (query, filters = {}, resultsCount = 0) => {
    try {
      await searchHistoryAPI.recordSearch(query, filters, resultsCount);
    } catch (err) {
      console.error('Error recording search:', err);
    }
  }, []);

  const getSuggestions = useCallback(async (query) => {
    try {
      const response = await searchHistoryAPI.getSuggestions(query, 10);
      setSuggestions(response.data.data.suggestions);
    } catch (err) {
      console.error('Error getting suggestions:', err);
    }
  }, []);

  const getHistory = useCallback(async () => {
    try {
      const response = await searchHistoryAPI.getHistory();
      setHistory(response.data.data.recentSearches);
    } catch (err) {
      console.error('Error getting history:', err);
    }
  }, []);

  return {
    suggestions,
    history,
    recordSearch,
    getSuggestions,
    getHistory,
  };
};
```

### 2. Search Bar with Suggestions
```javascript
// src/components/Search/SearchBar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import './SearchBar.css';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, recordSearch, getSuggestions } = useSearchHistory();
  const debounceTimer = useRef(null);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    if (query.length > 2) {
      debounceTimer.current = setTimeout(() => {
        getSuggestions(query);
        setShowSuggestions(true);
      }, 300);
    }
  }, [query, getSuggestions]);

  const handleSearch = (searchTerm = query) => {
    if (searchTerm.trim()) {
      recordSearch(searchTerm);
      onSearch(searchTerm);
      setShowSuggestions(false);
    }
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Search products..."
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion, idx) => (
            <li 
              key={idx}
              onClick={() => handleSearch(suggestion)}
            >
              🔍 {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Hook Patterns

### Combined Hook for Multiple Features
```javascript
// src/hooks/useEcommerce.js
import { useWishlist } from './useWishlist';
import { useAddresses } from './useAddresses';
import { useRecentlyViewed } from './useRecentlyViewed';
import { usePaymentMethods } from './usePaymentMethods';
import { useSearchHistory } from './useSearchHistory';

export const useEcommerce = () => {
  const wishlist = useWishlist();
  const addresses = useAddresses();
  const recentlyViewed = useRecentlyViewed();
  const payments = usePaymentMethods();
  const search = useSearchHistory();

  return {
    wishlist,
    addresses,
    recentlyViewed,
    payments,
    search,
  };
};

// Usage in component:
// const { wishlist, addresses, recentlyViewed } = useEcommerce();
```

---

## Integration Points

### 1. Product Detail Page
```javascript
// Track view + Add to wishlist + Record search
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { useWishlist } from '../hooks/useWishlist';
import { useSearchHistory } from '../hooks/useSearchHistory';

export default function ProductDetail({ productId, productName }) {
  const { trackView } = useRecentlyViewed();
  const { addToWishlist, isInWishlist } = useWishlist();
  const { recordSearch } = useSearchHistory();

  useEffect(() => {
    // Track view after 2 seconds
    const timer = setTimeout(() => {
      trackView(productId, 2);
    }, 2000);
    return () => clearTimeout(timer);
  }, [productId, trackView]);

  return (
    <div>
      <h1>{productName}</h1>
      <button onClick={() => addToWishlist(productId)}>
        {isInWishlist(productId) ? '❤️' : '🤍'} Wishlist
      </button>
    </div>
  );
}
```

### 2. Checkout Page
```javascript
// Use saved addresses + payment methods
import { useAddresses } from '../hooks/useAddresses';
import { usePaymentMethods } from '../hooks/usePaymentMethods';

export default function Checkout() {
  const { addresses, primaryAddress } = useAddresses();
  const { methods, defaultMethod } = usePaymentMethods();

  return (
    <div className="checkout">
      <section className="delivery">
        <h3>Delivery Address</h3>
        <select defaultValue={primaryAddress?.addressId}>
          {addresses.map((addr) => (
            <option key={addr.addressId} value={addr.addressId}>
              {addr.name} - {addr.area}
            </option>
          ))}
        </select>
      </section>

      <section className="payment">
        <h3>Payment Method</h3>
        <select defaultValue={defaultMethod?.methodId}>
          {methods.map((method) => (
            <option key={method.methodId} value={method.methodId}>
              {method.name} ({method.type})
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
```

---

## Testing Scenarios

### 1. Wishlist Tests
- [ ] Add item to empty wishlist
- [ ] Add duplicate item (should increase quantity)
- [ ] Remove item
- [ ] Update notes
- [ ] Toggle notifications
- [ ] Share wishlist
- [ ] View shared wishlist
- [ ] Clear wishlist

### 2. Address Tests
- [ ] Add new address (first = primary)
- [ ] Add second address
- [ ] Update address
- [ ] Delete address
- [ ] Set as primary
- [ ] Verify address with GPS

### 3. Payment Methods Tests
- [ ] Add card
- [ ] Add UPI
- [ ] Add net banking
- [ ] Set default
- [ ] Delete method
- [ ] Record usage
- [ ] Lock/Unlock method

---

## Performance Tips

1. **Memoization:** Use `useMemo` for expensive calculations
2. **Lazy Loading:** Load recently viewed only when needed
3. **Pagination:** Paginate addresses/payment methods for large datasets
4. **Caching:** Cache API responses in Redux or Context
5. **Debouncing:** Debounce search suggestions

---

## Next Steps

1. Implement components in your React project
2. Connect to your existing product catalog
3. Add animations and polish UI
4. Test with real API endpoints
5. Deploy to staging environment

---

**Happy coding! 🚀**
