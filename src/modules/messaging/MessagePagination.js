import React from 'react';

const MessagePagination = ({ 
  currentPage, 
  totalPages, 
  onPreviousPage, 
  onNextPage,
  messagesPerPage = 20,
  totalMessages = 0
}) => {
  const startMessage = currentPage * messagesPerPage + 1;
  const endMessage = Math.min((currentPage + 1) * messagesPerPage, totalMessages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="message-pagination">
      <div className="pagination-info">
        <span className="message-count">
          {totalMessages > 0 
            ? `${startMessage}-${endMessage} of ${totalMessages}` 
            : 'No messages'}
        </span>
      </div>
      <div className="pagination-controls">
        <button 
          className="btn-pagination"
          onClick={onPreviousPage}
          disabled={currentPage === 0}
          title="Previous page"
          type="button"
        >
          ← Previous
        </button>
        <span className="page-indicator">
          Page {currentPage + 1} of {totalPages}
        </span>
        <button 
          className="btn-pagination"
          onClick={onNextPage}
          disabled={currentPage >= totalPages - 1}
          title="Next page"
          type="button"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default MessagePagination;
