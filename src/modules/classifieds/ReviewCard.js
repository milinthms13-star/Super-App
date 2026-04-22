import React, { useState } from 'react';

const ReviewCard = ({ review, onHelpful, onReport }) => {
  const [isHelpful, setIsHelpful] = useState(review?.userMarkedHelpful || false);
  const [helpfulCount, setHelpfulCount] = useState(review?.helpfulCount || 0);
  const [showMore, setShowMore] = useState(false);

  const handleHelpful = () => {
    if (isHelpful) {
      setIsHelpful(false);
      setHelpfulCount(prev => Math.max(0, prev - 1));
    } else {
      setIsHelpful(true);
      setHelpfulCount(prev => prev + 1);
    }
    if (onHelpful) {
      onHelpful(!isHelpful);
    }
  };

  // Format date
  const formatDate = (date) => {
    const reviewDate = new Date(date);
    const today = new Date();
    const diffMs = today - reviewDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return reviewDate.toLocaleDateString();
  };

  // Check if text is too long
  const isTruncated = review?.comment && review.comment.length > 300;
  const displayText = 
    isTruncated && !showMore 
      ? review.comment.substring(0, 300) + '...' 
      : review.comment;

  return (
    <div className={`review-card ${review?.verified ? 'verified' : ''}`}>
      {/* Review Header */}
      <div className="review-header">
        <div className="reviewer-info">
          <img
            src={review?.buyerAvatar || '/default-avatar.png'}
            alt={review?.buyerName}
            className="reviewer-avatar"
          />
          <div className="reviewer-details">
            <div className="reviewer-name-row">
              <span className="reviewer-name">{review?.buyerName}</span>
              {review?.verified && (
                <span className="verified-purchase-badge">
                  ✓ Verified Purchase
                </span>
              )}
            </div>
            <span className="review-date">{formatDate(review?.date)}</span>
          </div>
        </div>

        {/* Rating Stars */}
        <div className="review-rating">
          <div className="stars">
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={`star ${star <= review?.rating ? 'filled' : 'empty'}`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="rating-text">{review?.rating}.0</span>
        </div>
      </div>

      {/* Review Title */}
      {review?.title && (
        <h4 className="review-title">{review.title}</h4>
      )}

      {/* Review Comment */}
      {review?.comment && (
        <div className="review-comment">
          <p>{displayText}</p>
          {isTruncated && (
            <button
              className="read-more-btn"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? 'Show Less' : 'Read More'}
            </button>
          )}
        </div>
      )}

      {/* Review Pros/Cons */}
      {(review?.pros || review?.cons) && (
        <div className="review-feedback">
          {review?.pros && (
            <div className="pros-section">
              <span className="feedback-label">✓ Pros:</span>
              <ul className="feedback-list">
                {review.pros.map((pro, idx) => (
                  <li key={idx}>{pro}</li>
                ))}
              </ul>
            </div>
          )}
          {review?.cons && (
            <div className="cons-section">
              <span className="feedback-label">✗ Cons:</span>
              <ul className="feedback-list">
                {review.cons.map((con, idx) => (
                  <li key={idx}>{con}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Review Media */}
      {review?.images && review.images.length > 0 && (
        <div className="review-media">
          <div className="media-gallery">
            {review.images.slice(0, 3).map((img, idx) => (
              <div key={idx} className="media-thumb">
                <img src={img} alt={`Review ${idx + 1}`} />
              </div>
            ))}
            {review.images.length > 3 && (
              <div className="media-thumb more">
                +{review.images.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Footer */}
      <div className="review-footer">
        <div className="review-actions">
          <button
            className={`action-btn helpful-btn ${isHelpful ? 'active' : ''}`}
            onClick={handleHelpful}
          >
            👍 Helpful ({helpfulCount})
          </button>
          <button
            className="action-btn report-btn"
            onClick={() => onReport && onReport(review?.id)}
          >
            🚩 Report
          </button>
        </div>

        {review?.sellerResponse && (
          <div className="seller-response">
            <div className="response-header">
              <span className="response-label">Seller Response</span>
              <span className="response-date">
                {formatDate(review.sellerResponse.date)}
              </span>
            </div>
            <p className="response-text">{review.sellerResponse.comment}</p>
          </div>
        )}
      </div>

      {/* Review Tags */}
      {review?.tags && review.tags.length > 0 && (
        <div className="review-tags">
          {review.tags.map(tag => (
            <span key={tag} className="review-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
