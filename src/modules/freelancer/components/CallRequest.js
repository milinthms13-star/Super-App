import React from "react";

const CallRequest = ({ callRequestNote = "", setCallRequestNote, onSubmit }) => (
  <div className="freelancer-form">
    <p className="freelancer-note">
      Contact is masked. You can request a callback without exposing direct numbers.
    </p>
    <label>
      Call Request Note
      <textarea
        rows={3}
        value={callRequestNote}
        onChange={(event) => setCallRequestNote(event.target.value)}
        placeholder="Please call after 6 PM IST to discuss milestones."
      />
    </label>
    <button type="button" onClick={onSubmit}>
      Send Call Request
    </button>
  </div>
);

export default CallRequest;
