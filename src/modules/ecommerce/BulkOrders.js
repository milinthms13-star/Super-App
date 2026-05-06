import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import { getStoredAuthToken } from '../../utils/auth';
import '../../styles/Ecommerce.css';

const DEFAULT_ITEM_QUANTITY = 50;

const EMPTY_FORM_STATE = {
  items: [],
  companyName: '',
  gstNumber: '',
  deliveryAddress: '',
  notes: '',
};

const createAuthConfig = () => ({
  headers: { Authorization: `Bearer ${getStoredAuthToken()}` },
});

const normalizeCatalogProducts = (products = []) => {
  const uniqueProducts = new Map();

  (products || []).forEach((product) => {
    const productId = String(product?.productId || product?.id || '').trim();
    const sellerEmail = String(product?.sellerEmail || '').trim().toLowerCase();

    if (!productId || !sellerEmail || uniqueProducts.has(productId)) {
      return;
    }

    uniqueProducts.set(productId, {
      productId,
      productName: product?.name || 'Unnamed product',
      unitPrice: Number(product?.price || 0),
      category: product?.category || '',
      businessName: product?.businessName || '',
      sellerEmail,
      sellerName: product?.sellerName || '',
    });
  });

  return Array.from(uniqueProducts.values());
};

const BulkOrders = () => {
  const { currentUser, mockData } = useApp();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM_STATE);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(String(DEFAULT_ITEM_QUANTITY));
  const [loading, setLoading] = useState(false);

  const availableProducts = useMemo(
    () => normalizeCatalogProducts(mockData?.ecommerceProducts),
    [mockData?.ecommerceProducts]
  );

  const activeSellerEmail = useMemo(() => {
    const firstItemProductId = formData.items[0]?.productId;
    if (!firstItemProductId) {
      return '';
    }

    return (
      availableProducts.find((product) => product.productId === firstItemProductId)?.sellerEmail || ''
    );
  }, [availableProducts, formData.items]);

  const selectableProducts = useMemo(
    () =>
      availableProducts.filter(
        (product) => !activeSellerEmail || product.sellerEmail === activeSellerEmail
      ),
    [activeSellerEmail, availableProducts]
  );

  useEffect(() => {
    if (currentUser?.email) {
      fetchOrders();
    }
  }, [currentUser?.email]);

  const fetchOrders = async () => {
    if (!currentUser?.email) {
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/bulkorders/customer/${encodeURIComponent(currentUser.email)}`,
        createAuthConfig()
      );
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM_STATE);
    setSelectedProductId('');
    setSelectedQuantity(String(DEFAULT_ITEM_QUANTITY));
  };

  const handleAddItem = () => {
    const selectedProduct = availableProducts.find((product) => product.productId === selectedProductId);
    const parsedQuantity = Number.parseInt(selectedQuantity, 10);

    if (!selectedProduct) {
      window.alert('Select a product to add.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < DEFAULT_ITEM_QUANTITY) {
      window.alert(`Bulk quantity must be at least ${DEFAULT_ITEM_QUANTITY}.`);
      return;
    }

    if (activeSellerEmail && activeSellerEmail !== selectedProduct.sellerEmail) {
      window.alert('A bulk order can only contain products from one seller.');
      return;
    }

    setFormData((currentForm) => {
      const existingItemIndex = currentForm.items.findIndex(
        (item) => item.productId === selectedProduct.productId
      );

      if (existingItemIndex > -1) {
        const nextItems = [...currentForm.items];
        nextItems[existingItemIndex] = {
          ...nextItems[existingItemIndex],
          quantity: parsedQuantity,
        };

        return {
          ...currentForm,
          items: nextItems,
        };
      }

      return {
        ...currentForm,
        items: [
          ...currentForm.items,
          {
            productId: selectedProduct.productId,
            productName: selectedProduct.productName,
            quantity: parsedQuantity,
            unitPrice: selectedProduct.unitPrice,
          },
        ],
      };
    });

    setSelectedProductId('');
    setSelectedQuantity(String(DEFAULT_ITEM_QUANTITY));
  };

  const updateItemQuantity = (productId, value) => {
    const parsedQuantity = Number.parseInt(value, 10);

    setFormData((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Number.isFinite(parsedQuantity)
                ? Math.max(DEFAULT_ITEM_QUANTITY, parsedQuantity)
                : DEFAULT_ITEM_QUANTITY,
            }
          : item
      ),
    }));
  };

  const removeItem = (productId) => {
    setFormData((currentForm) => ({
      ...currentForm,
      items: currentForm.items.filter((item) => item.productId !== productId),
    }));
  };

  const handleCreateOrder = async () => {
    if (!formData.companyName.trim() || formData.items.length === 0) {
      window.alert('Please fill in the company name and add at least one item.');
      return;
    }

    if (formData.items.some((item) => Number(item.quantity || 0) < DEFAULT_ITEM_QUANTITY)) {
      window.alert(`Each bulk-order item needs at least ${DEFAULT_ITEM_QUANTITY} units.`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        companyName: formData.companyName.trim(),
        gstNumber: formData.gstNumber.trim(),
        deliveryAddress: formData.deliveryAddress.trim(),
        notes: formData.notes.trim(),
        items: formData.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
        })),
      };

      const response = await axios.post(
        `${API_BASE_URL}/bulkorders/create`,
        payload,
        createAuthConfig()
      );

      setOrders((currentOrders) => [response.data.data, ...currentOrders]);
      resetForm();
      setShowForm(false);
      window.alert('Bulk order created! Waiting for seller quote...');
    } catch (error) {
      window.alert(
        error?.response?.data?.error || error?.response?.data?.message || `Error creating order: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: '#FFA500',
      Quoted: '#4169E1',
      Confirmed: '#32CD32',
      Processing: '#FF6347',
      Shipped: '#87CEEB',
      Delivered: '#90EE90',
      Cancelled: '#DC143C',
    };
    return colors[status] || '#999';
  };

  if (!currentUser?.email) {
    return (
      <div className="ecommerce-feature">
        <h2>Bulk Orders (B2B)</h2>
        <p>Please sign in to manage bulk orders.</p>
      </div>
    );
  }

  return (
    <div className="ecommerce-feature">
      <h2>Bulk Orders (B2B)</h2>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Create Bulk Order
        </button>
      ) : (
        <div className="feature-form">
          <h3>Request Bulk Order</h3>

          <div className="form-group">
            <label htmlFor="bulk-company-name">Company Name:</label>
            <input
              id="bulk-company-name"
              type="text"
              value={formData.companyName}
              onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
              placeholder="Your company name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bulk-product-select">Select Product:</label>
            <div className="form-actions">
              <select
                id="bulk-product-select"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
              >
                <option value="">Choose a product</option>
                {selectableProducts.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.productName} - INR {product.unitPrice}
                    {product.businessName ? ` - ${product.businessName}` : ''}
                  </option>
                ))}
              </select>
              <input
                aria-label="Bulk quantity"
                type="number"
                min={DEFAULT_ITEM_QUANTITY}
                step="1"
                value={selectedQuantity}
                onChange={(event) => setSelectedQuantity(event.target.value)}
                placeholder="50"
              />
              <button type="button" className="btn btn-outline" onClick={handleAddItem}>
                Add Item
              </button>
            </div>
            {activeSellerEmail && (
              <p className="text-muted">This order is currently limited to one seller.</p>
            )}
            {availableProducts.length === 0 && (
              <p className="text-muted">No GlobeMart products are available for bulk ordering yet.</p>
            )}
          </div>

          <div className="form-group">
            <label>Selected Items:</label>
            {formData.items.length === 0 ? (
              <p className="text-muted">Add at least one product with a quantity of 50 or more.</p>
            ) : (
              <div className="orders-items">
                {formData.items.map((item) => (
                  <div key={item.productId} className="order-card">
                    <div className="order-header">
                      <h4>{item.productName}</h4>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => removeItem(item.productId)}
                      >
                        Remove
                      </button>
                    </div>
                    <p>Unit price: INR {item.unitPrice}</p>
                    <label className="form-group" htmlFor={`bulk-qty-${item.productId}`}>
                      Quantity:
                    </label>
                    <input
                      id={`bulk-qty-${item.productId}`}
                      type="number"
                      min={DEFAULT_ITEM_QUANTITY}
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateItemQuantity(item.productId, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="bulk-gst-number">GST Number:</label>
            <input
              id="bulk-gst-number"
              type="text"
              value={formData.gstNumber}
              onChange={(event) => setFormData({ ...formData, gstNumber: event.target.value })}
              placeholder="GST number (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bulk-delivery-address">Delivery Address:</label>
            <textarea
              id="bulk-delivery-address"
              value={formData.deliveryAddress}
              onChange={(event) => setFormData({ ...formData, deliveryAddress: event.target.value })}
              placeholder="Full delivery address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bulk-notes">Additional Notes:</label>
            <textarea
              id="bulk-notes"
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              placeholder="Any special requirements..."
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading}>
              {loading ? 'Creating...' : 'Request Quote'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="feature-list">
        <h3>Your Bulk Orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <p>No bulk orders yet</p>
        ) : (
          <div className="orders-items">
            {orders.map((order) => (
              <div key={order.bulkOrderId} className="order-card">
                <div className="order-header">
                  <h4>{order.companyName}</h4>
                  <span className="order-status" style={{ backgroundColor: getStatusColor(order.status) }}>
                    {order.status}
                  </span>
                </div>
                <p>Order ID: {order.bulkOrderId}</p>
                <p>Items: {order.items.length} | Total: INR {order.totalAmount}</p>
                <p>Discount: {order.discountPercentage}%</p>
                <p className="text-muted">Created: {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrders;
