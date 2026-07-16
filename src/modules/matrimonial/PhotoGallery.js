import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './PhotoGallery.css';

const PhotoGallery = ({ profileId, isOwnProfile = false, onPhotoUpdate }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();
  }, [profileId]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const endpoint = isOwnProfile 
        ? `${API_BASE_URL}/matrimonial/photos`
        : `${API_BASE_URL}/matrimonial/photos/profile/${profileId}`;
      
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      setPhotos(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    if (files.length + photos.length > 10) {
      alert('Maximum 10 photos allowed per profile');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('photos', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/photos/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setPhotos([...photos, ...response.data.data]);
      setShowUploadModal(false);
      onPhotoUpdate?.();
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert(error.response?.data?.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (photoId) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/matrimonial/photos/${photoId}/set-primary`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setPhotos(photos.map(p => ({
        ...p,
        isPrimary: p._id === photoId,
      })));
      
      onPhotoUpdate?.();
    } catch (error) {
      console.error('Failed to set primary photo:', error);
      alert('Failed to set primary photo');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/matrimonial/photos/${photoId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      setPhotos(photos.filter(p => p._id !== photoId));
      setSelectedPhoto(null);
      onPhotoUpdate?.();
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert(error.response?.data?.message || 'Failed to delete photo');
    }
  };

  if (loading) {
    return <div className="photo-gallery-loading">Loading photos...</div>;
  }

  return (
    <div className="photo-gallery">
      <div className="photo-gallery-header">
        <h3>Photo Gallery ({photos.length}/10)</h3>
        {isOwnProfile && photos.length < 10 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Add Photos'}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {photos.length === 0 ? (
        <div className="photo-gallery-empty">
          <p>No photos uploaded yet</p>
          {isOwnProfile && (
            <button
              className="btn btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Your First Photo
            </button>
          )}
        </div>
      ) : (
        <div className="photo-gallery-grid">
          {photos.map((photo) => (
            <div
              key={photo._id}
              className={`photo-gallery-item ${photo.isPrimary ? 'primary' : ''}`}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnailUrl || photo.photoUrl}
                alt={photo.caption || 'Profile photo'}
              />
              {photo.isPrimary && (
                <div className="photo-badge">Primary</div>
              )}
              {photo.verificationStatus === 'pending' && (
                <div className="photo-badge pending">Pending Verification</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="photo-viewer-modal" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="photo-viewer-close"
              onClick={() => setSelectedPhoto(null)}
            >
              ×
            </button>
            
            <img
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.caption || 'Photo'}
            />
            
            {selectedPhoto.caption && (
              <p className="photo-caption">{selectedPhoto.caption}</p>
            )}

            {isOwnProfile && (
              <div className="photo-actions">
                {!selectedPhoto.isPrimary && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSetPrimary(selectedPhoto._id)}
                  >
                    Set as Primary
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeletePhoto(selectedPhoto._id)}
                >
                  Delete Photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
