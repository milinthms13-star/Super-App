/**
 * OrderConfirmation.jsx
 * Phase 5D - Order confirmation and receipt display
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderConfirmation.css';

const OrderConfirmation = ({ order }) => {
  const [receipt, setReceipt] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('receipt');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (order?.orderId) {
      fetchReceiptAndInvoice();
    }
  }, [order]);

  /**
   * Fetch receipt and invoice
   */
  const fetchReceiptAndInvoice = async () => {
    try {
      setLoading(true);

      // Fetch receipt
      const receiptRes = await axios.get(`/api/checkout/${order.orderId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch invoice
      const invoiceRes = await axios.get(`/api/checkout/${order.orderId}/invoice?format=json`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReceipt(receiptRes.data.data);
      setInvoice(invoiceRes.data.data);
    } catch (err) {
      console.error('Error fetching receipt/invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download invoice as PDF
   */
  const downloadInvoice = async () => {
    try {
      const response = await axios.get(`/api/checkout/${order.orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${order.orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Error downloading invoice:', err);
    }
  };

  /**
   * Share order details
   */
  const shareOrder = async () => {
    const shareText = `I just ordered from Malabarbazaar! Order ID: ${order.orderId}. Total: ₹${order.amount.toFixed(2)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Malabarbazaar Order',
          text: shareText,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Order details copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="order-confirmation">
        <div className="loading">
          <p>Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-confirmation">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase</p>
      </div>

      {/* Order Summary */}
      <div className="order-summary-card">
        <div className="order-info-grid">
          <div className="info-item">
            <span className="label">Order ID</span>
            <span className="value">{order.orderId}</span>
          </div>
          <div className="info-item">
            <span className="label">Total Amount</span>
            <span className="value">₹{order.amount.toFixed(2)}</span>
          </div>
          <div className="info-item">
            <span className="label">Items Count</span>
            <span className="value">{order.items?.length || 0}</span>
          </div>
          <div className="info-item">
            <span className="label">Status</span>
            <span className="value status-badge">Confirmed</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="confirmation-tabs">
        <button
          className={`tab ${activeTab === 'receipt' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipt')}
        >
          Receipt
        </button>
        <button
          className={`tab ${activeTab === 'invoice' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoice')}
        >
          Invoice
        </button>
        <button
          className={`tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          Items
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Receipt Tab */}
        {activeTab === 'receipt' && receipt && (
          <div className="receipt-section">
            <div className="receipt-card">
              <h3>Payment Receipt</h3>
              <div className="receipt-details">
                <div className="detail-row">
                  <span className="label">Receipt ID:</span>
                  <span className="value">{receipt.receiptId}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date & Time:</span>
                  <span className="value">{new Date(receipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Payment Method:</span>
                  <span className="value">{receipt.paymentMethod}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Gateway:</span>
                  <span className="value">{receipt.gateway}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Transaction ID:</span>
                  <span className="value">{receipt.transactionId}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className="value status-badge">{receipt.status}</span>
                </div>
              </div>

              <div className="breakdown-section">
                <h4>Amount Breakdown</h4>
                <div className="breakdown-items">
                  <div className="breakdown-row">
                    <span>Subtotal</span>
                    <span>₹{receipt.breakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Taxes</span>
                    <span>₹{receipt.breakdown.taxes.toFixed(2)}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Delivery</span>
                    <span>₹{receipt.breakdown.delivery.toFixed(2)}</span>
                  </div>
                  {receipt.breakdown.discount > 0 && (
                    <div className="breakdown-row discount">
                      <span>Discount</span>
                      <span>-₹{receipt.breakdown.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="breakdown-row total">
                    <span>Total</span>
                    <span>₹{receipt.breakdown.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === 'invoice' && invoice && (
          <div className="invoice-section">
            <div className="invoice-card">
              <h3>Tax Invoice</h3>
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="label">Invoice Number:</span>
                  <span className="value">{invoice.invoiceNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Invoice Date:</span>
                  <span className="value">{new Date(invoice.issuedDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Due Date:</span>
                  <span className="value">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Seller Name:</span>
                  <span className="value">{invoice.seller.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">GST Number:</span>
                  <span className="value">{invoice.seller.gstNumber}</span>
                </div>
              </div>

              <div className="invoice-summary">
                <h4>Invoice Summary</h4>
                <div className="summary-items">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{invoice.breakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (GST)</span>
                    <span>₹{invoice.breakdown.tax.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Delivery Charges</span>
                    <span>₹{invoice.breakdown.delivery.toFixed(2)}</span>
                  </div>
                  {invoice.breakdown.discount > 0 && (
                    <div className="summary-row discount">
                      <span>Discount</span>
                      <span>-₹{invoice.breakdown.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total Amount</span>
                    <span>₹{invoice.breakdown.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button onClick={downloadInvoice} className="btn-download">
                📥 Download Invoice (PDF)
              </button>
            </div>
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && order.items && (
          <div className="items-section">
            <h3>Order Items</h3>
            <div className="items-list">
              {order.items.map((item, idx) => (
                <div key={idx} className="item-card">
                  <div className="item-image">
                    {item.image && <img src={item.image} alt={item.name} />}
                  </div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p className="category">{item.category}</p>
                    <div className="item-pricing">
                      <span className="price">₹{item.price.toFixed(2)}</span>
                      <span className="quantity">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-total">
                      Total: ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="confirmation-actions">
        <button onClick={shareOrder} className="btn-secondary">
          📤 Share Order
        </button>
        <button onClick={() => window.location.href = '/orders'} className="btn-primary">
          📦 Track Order
        </button>
        <button onClick={() => window.location.href = '/'} className="btn-secondary">
          🏠 Continue Shopping
        </button>
      </div>

      {/* Tracking Info */}
      <div className="tracking-info">
        <h4>What's Next?</h4>
        <ol>
          <li><strong>Order Confirmed:</strong> Your order has been placed successfully</li>
          <li><strong>Processing:</strong> We're preparing your order (24-48 hours)</li>
          <li><strong>Shipping:</strong> Your package will be dispatched soon</li>
          <li><strong>Delivery:</strong> Track your shipment and get delivery updates</li>
        </ol>
      </div>
    </div>
  );
};

export default OrderConfirmation;
