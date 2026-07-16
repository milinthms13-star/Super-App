import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './SuccessStories.css';

const SuccessStories = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStories();
  }, [featured, page]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/success-stories/public`,
        {
          params: {
            page,
            limit: 12,
            featured: featured ? 'true' : undefined,
          },
        }
      );

      setStories(response.data.data || []);
      setTotalPages(response.data.meta?.pages || 1);
    } catch (error) {
      console.error('Failed to fetch success stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementView = async (storyId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/matrimonial/success-stories/${storyId}/view`
      );
    } catch (error) {
      console.error('Failed to increment view:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && stories.length === 0) {
    return <div className="success-stories-loading">Loading success stories...</div>;
  }

  return (
    <div className="success-stories">
      <div className="success-stories-header">
        <h1>Success Stories 💕</h1>
        <p>Real couples, real love stories that began on SoulMatch</p>
        
        <div className="success-stories-filter">
          <button
            className={`filter-btn ${featured ? 'active' : ''}`}
            onClick={() => setFeatured(true)}
          >
            Featured
          </button>
          <button
            className={`filter-btn ${!featured ? 'active' : ''}`}
            onClick={() => setFeatured(false)}
          >
            All Stories
          </button>
        </div>
      </div>

      <div className="success-stories-grid">
        {stories.map((story) => (
          <div key={story._id} className="success-story-card">
            {story.photos && story.photos.length > 0 && (
              <div className="story-image">
                <img
                  src={story.photos[0].url}
                  alt={`${story.groomName} & ${story.brideName}`}
                  onClick={() => incrementView(story._id)}
                />
                {story.isFeatured && (
                  <div className="featured-badge">⭐ Featured</div>
                )}
              </div>
            )}
            
            <div className="story-content">
              <h3>{story.title}</h3>
              <p className="story-couple-names">
                {story.groomName} & {story.brideName}
              </p>
              
              <p className="story-excerpt">
                {story.story.substring(0, 150)}
                {story.story.length > 150 ? '...' : ''}
              </p>
              
              <div className="story-meta">
                <span className="story-date">
                  💒 Married: {formatDate(story.marriageDate)}
                </span>
                {story.location && (
                  <span className="story-location">📍 {story.location}</span>
                )}
              </div>

              {story.testimonial && (
                <blockquote className="story-testimonial">
                  "{story.testimonial}"
                </blockquote>
              )}

              <div className="story-stats">
                <span>👁️ {story.views || 0} views</span>
                <span>❤️ {story.likes || 0} likes</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="success-stories-pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          
          <span>
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SuccessStories;
