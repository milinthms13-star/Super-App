import React from 'react';

const RequestsDashboard = ({ requests = [], onRequestAction }) => {
  if (!requests.length) {
    return <p className="gulf-services-empty-state">No request records available.</p>;
  }

  return (
    <div className="gulf-services-app-list">
      {requests.map((request, index) => {
        const id = request?._id || request?.requestId || request?.applicationId || request?.serviceId || `${index}`;
        const title = request?.fullName || request?.name || request?.jobTitle || request?.serviceType || 'Service request';
        const status = request?.status || request?.visaStatus || 'pending';
        const timestamp = request?.updatedAt || request?.createdAt;

        return (
          <article key={id} className="gulf-services-app-item">
            <div>
              <strong>{title}</strong>
              <p>Status: {status}</p>
              {timestamp ? <small>{new Date(timestamp).toLocaleString()}</small> : null}
            </div>
            {onRequestAction ? (
              <button type="button" className="btn btn-secondary" onClick={() => onRequestAction(request)}>
                Open
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

export default RequestsDashboard;
