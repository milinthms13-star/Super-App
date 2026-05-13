import React from "react";

function ReviewModal({ reviewForm, onReviewFormChange, onClose, onSubmit, submitting }) {
  return (
    <div className="lm-modal-overlay" onClick={onClose}>
      <div className="lm-modal" onClick={(event) => event.stopPropagation()}>
        <h2>Leave Review</h2>
        <div className="lm-form">
          <label htmlFor="review-rating">Rating</label>
          <select
            id="review-rating"
            value={reviewForm.rating}
            onChange={(event) => onReviewFormChange("rating", Number(event.target.value))}
          >
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>
                {rating} Star
              </option>
            ))}
          </select>
          <textarea
            placeholder="Share your experience"
            value={reviewForm.comment}
            onChange={(event) => onReviewFormChange("comment", event.target.value)}
          />
          <button className="lm-btn lm-btn-primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewModal;
