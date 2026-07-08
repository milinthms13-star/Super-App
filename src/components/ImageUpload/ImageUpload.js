import React, { useState, useCallback } from 'react';
import './ImageUpload.css';

const ImageUpload = ({
  onUpload,
  acceptedFileTypes = 'image/jpeg,image/png,image/gif,image/webp',
  maxSizeMB = 5,
  label = 'Upload Image',
  previewUrl = null,
  disabled = false,
  aspectRatio = null, // e.g., "16:9" or "1:1"
  showPreview = true,
  className = ''
}) => {
  const [preview, setPreview] = useState(previewUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file) => {
    setError('');

    // Check file type
    const acceptedTypes = acceptedFileTypes.split(',').map(t => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      setError(`Please upload a valid image file (${acceptedTypes.join(', ')})`);
      return false;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file) => {
    if (!file || !validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    if (onUpload) {
      setUploading(true);
      setUploadProgress(0);

      try {
        // Simulate progress for demo
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        await onUpload(file);

        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setTimeout(() => {
          setUploadProgress(0);
          setUploading(false);
        }, 500);
      } catch (err) {
        setError(err.message || 'Upload failed');
        setUploading(false);
        setUploadProgress(0);
      }
    }
  }, [onUpload, maxSizeMB, acceptedFileTypes]);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    setUploadProgress(0);
  };

  return (
    <div className={`image-upload-container ${className}`}>
      {label && <label className="image-upload-label">{label}</label>}
      
      <div
        className={`image-upload-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {showPreview && preview ? (
          <div className="image-upload-preview">
            <img 
              src={preview} 
              alt="Preview" 
              className={aspectRatio ? `aspect-${aspectRatio.replace(':', '-')}` : ''}
            />
            {!disabled && (
              <button
                type="button"
                className="image-upload-remove"
                onClick={handleRemove}
                aria-label="Remove image"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <>
            <input
              type="file"
              accept={acceptedFileTypes}
              onChange={handleChange}
              disabled={disabled || uploading}
              className="image-upload-input"
              id={`image-upload-${label.replace(/\s+/g, '-')}`}
            />
            <label
              htmlFor={`image-upload-${label.replace(/\s+/g, '-')}`}
              className="image-upload-prompt"
            >
              <svg
                className="image-upload-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="image-upload-text-primary">
                {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
              </span>
              <span className="image-upload-text-secondary">
                {acceptedFileTypes.split(',').map(t => t.split('/')[1]).join(', ').toUpperCase()} up to {maxSizeMB}MB
              </span>
            </label>
          </>
        )}
      </div>

      {uploading && uploadProgress > 0 && (
        <div className="image-upload-progress">
          <div className="image-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
          <span className="image-upload-progress-text">{uploadProgress}%</span>
        </div>
      )}

      {error && (
        <div className="image-upload-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
