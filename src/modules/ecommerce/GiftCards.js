import React, { useState, useEffect } from 'react';
import './GiftCards.css';

const GiftCards = ({ userEmail, userName }) => {
  const [giftCards, setGiftCards] = useState({
    sent: [],
    received: [],
  });
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    denomination: 1000,
    recipientEmail: '',
    recipientName: '',
    giftMessage: '',
    designTemplate: 'Classic',
  });
  const [redeemCode, setRedeemCode] = useState('');
  const [showRedeemForm, setShowRedeemForm] = useState(false);
  const [message, setMessage] = useState('');

  const denominations = [500, 1000, 2500, 5000, 10000];

  useEffect(() => {
    fetchGiftCards();
  }, [userEmail]);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [sentRes, receivedRes] = await Promise.all([
        fetch('/api/gift-cards/sent', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/gift-cards/received', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sentRes.ok) {
        const data = await sentRes.json();
        setGiftCards((prev) => ({ ...prev, sent: data.data }));
      }

      if (receivedRes.ok) {
        const data = await receivedRes.json();
        setGiftCards((prev) => ({ ...prev, received: data.data }));
      }
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      setMessage('Error loading gift cards');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateGiftCard = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gift-cards/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Gift card created successfully!');
        setFormData({
          denomination: 1000,
          recipientEmail: '',
          recipientName: '',
          giftMessage: '',
          designTemplate: 'Classic',
        });
        fetchGiftCards();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.message || 'Error creating gift card');
      }
    } catch (error) {
      console.error('Error creating gift card:', error);
      setMessage('Error creating gift card');
    }
  };

  const handleRedeemGiftCard = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cardCode: redeemCode }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Gift card redeemed! ₹${data.data.amount} added to wallet`);
        setRedeemCode('');
        setShowRedeemForm(false);
        fetchGiftCards();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.message || 'Error redeeming gift card');
      }
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      setMessage('Error redeeming gift card');
    }
  };

  if (loading) {
    return <div className="loading">Loading gift cards...</div>;
  }

  return (
    <div className="gift-cards-container">
      <div className="gift-cards-header">
        <h1>🎁 Digital Gift Cards</h1>
        <p>Send and receive digital gift cards instantly</p>
      </div>

      {message && <div className="message-alert">{message}</div>}

      <div className="gift-cards-tabs">
        <button
          className={`tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          Send Gift Card
        </button>
        <button
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received ({giftCards.received.length})
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent ({giftCards.sent.length})
        </button>
      </div>

      {activeTab === 'send' && (
        <div className="send-tab">
          <form onSubmit={handleCreateGiftCard} className="gift-card-form">
            <div className="form-group">
              <label>Denomination *</label>
              <div className="denomination-selector">
                {denominations.map((denom) => (
                  <button
                    key={denom}
                    type="button"
                    className={`denom-btn ${
                      formData.denomination === denom ? 'selected' : ''
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        denomination: denom,
                      }))
                    }
                  >
                    ₹{denom}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Recipient Email *</label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Recipient Name *</label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Gift Message</label>
              <textarea
                name="giftMessage"
                value={formData.giftMessage}
                onChange={handleInputChange}
                placeholder="Add a personal message..."
                maxLength="500"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Design Template</label>
              <select
                name="designTemplate"
                value={formData.designTemplate}
                onChange={handleInputChange}
              >
                <option value="Classic">Classic</option>
                <option value="Festive">Festive</option>
                <option value="Birthday">Birthday</option>
                <option value="Anniversary">Anniversary</option>
                <option value="Congratulations">Congratulations</option>
              </select>
            </div>

            <button type="submit" className="submit-btn">
              Create Gift Card
            </button>
          </form>
        </div>
      )}

      {activeTab === 'received' && (
        <div className="received-tab">
          <div className="tab-actions">
            {!showRedeemForm ? (
              <button
                className="redeem-btn"
                onClick={() => setShowRedeemForm(true)}
              >
                + Redeem Gift Card
              </button>
            ) : (
              <form onSubmit={handleRedeemGiftCard} className="redeem-form">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Enter gift card code"
                  maxLength="16"
                  required
                />
                <button type="submit">Redeem</button>
                <button
                  type="button"
                  onClick={() => setShowRedeemForm(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>

          {giftCards.received.length > 0 ? (
            <div className="gift-cards-list">
              {giftCards.received.map((card) => (
                <div key={card._id} className="gift-card-item">
                  <div className="card-design">
                    <div className={`design-template ${card.designTemplate}`}>
                      🎁
                    </div>
                  </div>
                  <div className="card-details">
                    <p className="from">From: {card.senderName}</p>
                    <p className="message">{card.giftMessage}</p>
                    <p className="amount">₹{card.balance}</p>
                    <p className="status">Status: {card.status}</p>
                    {card.status === 'Active' && (
                      <p className="expires">
                        Expires: {new Date(card.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No received gift cards yet</p>
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="sent-tab">
          {giftCards.sent.length > 0 ? (
            <div className="gift-cards-list">
              {giftCards.sent.map((card) => (
                <div key={card._id} className="gift-card-item">
                  <div className="card-design">
                    <div className={`design-template ${card.designTemplate}`}>
                      🎁
                    </div>
                  </div>
                  <div className="card-details">
                    <p className="to">To: {card.recipientName}</p>
                    <p className="email">{card.recipientEmail}</p>
                    <p className="amount">₹{card.originalBalance}</p>
                    <p className="remaining">
                      Balance: ₹{card.balance}
                    </p>
                    <p className="status">Status: {card.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No sent gift cards yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GiftCards;
