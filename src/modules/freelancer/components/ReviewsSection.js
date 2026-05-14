import React from "react";

const ReviewsSection = ({
  reviewDraft,
  setReviewDraft,
  canSubmitReview,
  onSubmitReview,
  reviews = [],
}) => (
  <div className="freelancer-dual-grid">
    <div className="freelancer-form">
      <h4>Write a Review</h4>
      <label>
        Name
        <input
          type="text"
          value={reviewDraft.reviewerName}
          onChange={(event) =>
            setReviewDraft((current) => ({ ...current, reviewerName: event.target.value }))
          }
        />
      </label>
      <label>
        Phone
        <input
          type="tel"
          value={reviewDraft.reviewerPhone}
          onChange={(event) =>
            setReviewDraft((current) => ({ ...current, reviewerPhone: event.target.value }))
          }
        />
      </label>
      <label>
        Rating
        <select
          value={reviewDraft.rating}
          onChange={(event) =>
            setReviewDraft((current) => ({ ...current, rating: event.target.value }))
          }
        >
          <option value="5">5</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </label>
      <label>
        Comment
        <textarea
          rows={3}
          value={reviewDraft.comment}
          onChange={(event) =>
            setReviewDraft((current) => ({ ...current, comment: event.target.value }))
          }
        />
      </label>
      <button type="button" onClick={onSubmitReview} disabled={!canSubmitReview}>
        Submit Review
      </button>
    </div>
    <div className="freelancer-list-grid">
      <h4>Recent Reviews</h4>
      {reviews.length === 0 ? (
        <p className="freelancer-note">No reviews yet.</p>
      ) : (
        reviews.map((review, index) => (
          <div key={`review-${index}`} className="freelancer-list-item">
            <strong>{review.reviewerName}</strong>
            <p>Rating: {review.rating} / 5</p>
            <p>{review.comment || "No comment provided."}</p>
            {review.createdAt ? <p>{new Date(review.createdAt).toLocaleDateString()}</p> : null}
          </div>
        ))
      )}
    </div>
  </div>
);

export default ReviewsSection;
