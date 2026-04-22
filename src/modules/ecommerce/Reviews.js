import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/Ecommerce.css';

const Reviews = ({ productId, productName }) => {
  const { currentUser } = useApp();
  const [reviews, setReviews] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: '',
    images: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductReviews();
    }
    if (currentUser) {
      fetchUserReviews();
    }
  }, [productId, currentUser]);

  const fetchProductReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews/product/${productId}?page=1&limit=10`);
      setReviews(response.data.data || []);
      setAverageRating(response.data.averageRating || 0);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reviews/user/reviews`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setUserReviews(response.data.data || []);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const handleCreateReview = async () => {
    if (!formData.title || !formData.comment) {
      alert('Please fill in title and comment');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/reviews/create`,
        {
          productId,
          productName,
          ...formData,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        }
      );

      setUserReviews([response.data.data, ...userReviews]);
      setFormData({
        rating: 5,
        title: '',
        comment: '',
        images: [],
      });
      setShowForm(false);
      alert('Review submitted! Pending approval...');
      fetchProductReviews();
    } catch (error) {
      alert('Error submitting review: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/reviews/${reviewId}/helpful`);
      fetchProductReviews();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Delete this review?')) {
      try {
        await axios.delete(`${API_BASE_URL}/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        setUserReviews(userReviews.filter((r) => r.reviewId !== reviewId));
        alert('Review deleted');
      } catch (error) {
        alert('Error deleting review: ' + error.message);
      }
    }
  };

  return (
    <div className="ecommerce-feature">
      <h2>⭐ Customer Reviews & Ratings</h2>

      {productId && (
        <div className="review-stats">
          <div className="rating-display">
            <div className="stars">{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}</div>
            <span className="rating-value">{averageRating.toFixed(1)}/5</span>
          </div>
          <p className="total-reviews">Based on {reviews.length} verified reviews</p>
        </div>
      )}

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Write a Review
        </button>
      ) : (
        <div className="review-form">
          <h3>Share Your Experience</h3>

          <div className="form-group">
            <label>Rating:</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`star ${formData.rating >= star ? 'selected' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title of your review"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Your Review:</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Describe your experience..."
              maxLength={1000}
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreateReview} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="reviews-list">
        <h3>Verified Reviews</h3>
        {reviews.length === 0 ? (
          <p>No reviews yet</p>
        ) : (
          reviews.map((review) => (
            <div key={review.reviewId} className="review-item">
              <div className="review-header">
                <div>
                  <p className="review-title">{review.title}</p>
                  <p className="review-author">by {review.reviewerName}</p>
                </div>
                <div className="review-rating">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
              </div>
              <p className="review-comment">{review.comment}</p>
              <div className="review-footer">
                <button className="btn btn-sm" onClick={() => handleMarkHelpful(review.reviewId)}>
                  👍 Helpful ({review.helpful})
                </button>
                {review.verified && <span className="verified-badge">✓ Verified</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {userReviews.length > 0 && (
        <div className="my-reviews">
          <h3>My Reviews ({userReviews.length})</h3>
          {userReviews.map((review) => (
            <div key={review.reviewId} className="my-review-item">
              <div className="review-content">
                <h4>{review.title}</h4>
                <p>{review.comment}</p>
                <span className={`status ${review.status.toLowerCase()}`}>{review.status}</span>
              </div>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDeleteReview(review.reviewId)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reviews;
