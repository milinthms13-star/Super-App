import React, { useState, useEffect } from "react";
import { getTrash, recoverFromTrash, permanentlyDeleteEntry } from "../../services/diaryService";
import "./TrashBin.css";

const TrashBin = ({ onClose }) => {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [operating, setOperating] = useState(false);

  useEffect(() => {
    fetchTrash();
  }, [page]);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const result = await getTrash({ limit: 20, skip: page * 20 });
      
      if (page === 0) {
        setTrashItems(result.data || []);
      } else {
        setTrashItems([...trashItems, ...(result.data || [])]);
      }
      
      setHasMore(result.pagination?.hasMore || false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (entryId) => {
    try {
      setOperating(true);
      await recoverFromTrash(entryId);
      setTrashItems(trashItems.filter(item => item._id !== entryId));
      alert("Entry recovered from trash");
    } catch (err) {
      alert(`Failed to recover: ${err.message}`);
    } finally {
      setOperating(false);
    }
  };

  const handlePermanentlyDelete = async (entryId) => {
    if (!window.confirm("This action cannot be undone. Permanently delete this entry?")) {
      return;
    }

    try {
      setOperating(true);
      await permanentlyDeleteEntry(entryId);
      setTrashItems(trashItems.filter(item => item._id !== entryId));
      alert("Entry permanently deleted");
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setOperating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDaysUntilPermanent = (deletedAt, permanentlyDeleteAt) => {
    const days = Math.ceil((new Date(permanentlyDeleteAt) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="trash-bin-modal">
      <div className="trash-bin-content">
        <div className="trash-bin-header">
          <h2>🗑️ Trash Bin</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && page === 0 ? (
          <div className="trash-loading">Loading trash...</div>
        ) : error ? (
          <div className="trash-error">Error: {error}</div>
        ) : trashItems.length === 0 ? (
          <div className="trash-empty">
            <p>No deleted entries</p>
            <small>Deleted entries appear here and are permanently removed after 30 days</small>
          </div>
        ) : (
          <div className="trash-list">
            {trashItems.map((item) => {
              const daysRemaining = getDaysUntilPermanent(item.deletedAt, item.permanentlyDeleteAt);
              return (
                <div key={item._id} className="trash-item">
                  <div className="trash-item-info">
                    <h3>{item.title}</h3>
                    <p className="trash-content-preview">{item.content.substring(0, 100)}...</p>
                    <div className="trash-metadata">
                      <span className="deleted-date">
                        🗑️ Deleted: {formatDate(item.deletedAt)}
                      </span>
                      <span className="days-remaining">
                        ⏱️ Auto-delete in {daysRemaining} days
                      </span>
                      <span className="entry-category">
                        📁 {item.category || 'Other'}
                      </span>
                    </div>
                  </div>
                  <div className="trash-actions">
                    <button
                      className="recover-btn"
                      onClick={() => handleRecover(item._id)}
                      disabled={operating}
                      title="Restore this entry"
                    >
                      ↩️ Recover
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handlePermanentlyDelete(item._id)}
                      disabled={operating}
                      title="Permanently delete now"
                    >
                      🔥 Delete Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <button
            className="load-more-btn"
            onClick={() => setPage(page + 1)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
};

export default TrashBin;
