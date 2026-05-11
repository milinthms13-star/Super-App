import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

class LocationSharingService {
  constructor() {
    this.activeSessions = new Map();
    this.watchIds = new Map();
    this.backgroundSyncSupported = 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
    this.periodicSyncSupported = 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype;
  }

  // Start location sharing session
  async startLocationSharing(recipientId, duration = 3600000, periodic = false) {
    try {
      const response = await axios.post(`${API_BASE_URL}/messaging/location/start-session`, {
        recipientId,
        duration,
        periodic
      });

      const session = response.data;
      this.activeSessions.set(session.sessionId, {
        ...session,
        recipientId,
        periodic,
        startTime: new Date(),
        endTime: new Date(session.endTime)
      });

      // Start location tracking
      await this.startLocationTracking(session.sessionId);

      return session;
    } catch (error) {
      console.error('Failed to start location sharing:', error);
      throw error;
    }
  }

  // Stop location sharing session
  async stopLocationSharing(sessionId) {
    try {
      await axios.post(`${API_BASE_URL}/messaging/location/end-session`, {
        sessionId
      });

      // Stop location tracking
      this.stopLocationTracking(sessionId);

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Remove from service worker cache
      if ('serviceWorker' in navigator) {
        const cache = await caches.open('location-sessions');
        await cache.delete(`/session/${sessionId}`);
      }

    } catch (error) {
      console.error('Failed to stop location sharing:', error);
      throw error;
    }
  }

  // Start location tracking for a session
  async startLocationTracking(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(sessionId, position),
      (error) => this.handleLocationError(sessionId, error),
      options
    );

    this.watchIds.set(sessionId, watchId);

    // Register background sync if supported
    if (this.backgroundSyncSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('location-share-sync');
      } catch (error) {
        console.log('Background sync registration failed:', error);
      }
    }

    // Register periodic sync for continuous sharing
    if (this.periodicSyncSupported && session.periodic) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.periodicSync.register('location-share-periodic', {
          minInterval: 5 * 60 * 1000 // 5 minutes
        });
      } catch (error) {
        console.log('Periodic sync registration failed:', error);
      }
    }
  }

  // Stop location tracking for a session
  stopLocationTracking(sessionId) {
    const watchId = this.watchIds.get(sessionId);
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      this.watchIds.delete(sessionId);
    }
  }

  // Handle location updates
  async handleLocationUpdate(sessionId, position) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      // Check if session is still active
      if (new Date() > session.endTime) {
        await this.stopLocationSharing(sessionId);
        return;
      }

      const locationData = {
        sessionId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: Date.now(),
        accuracy: position.coords.accuracy
      };

      // Send to backend
      await axios.post(`${API_BASE_URL}/messaging/location/update`, locationData);

      // Cache in service worker for offline sync
      if ('serviceWorker' in navigator) {
        const cache = await caches.open('location-sessions');
        await cache.put(
          `/session/${sessionId}`,
          new Response(JSON.stringify({
            ...session,
            lastUpdate: Date.now()
          }), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }

    } catch (error) {
      console.error('Failed to handle location update:', error);
    }
  }

  // Handle location errors
  handleLocationError(sessionId, error) {
    console.error(`Location error for session ${sessionId}:`, error);

    // Could implement retry logic or user notification here
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.error('Location permission denied');
        break;
      case error.POSITION_UNAVAILABLE:
        console.error('Location information unavailable');
        break;
      case error.TIMEOUT:
        console.error('Location request timed out');
        break;
      default:
        console.error('Unknown location error');
        break;
    }
  }

  // Get active location sessions
  async getActiveSessions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/messaging/location/sessions`);
      return response.data.sessions || [];
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  // Get location history for a session
  async getLocationHistory(sessionId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/messaging/location/history/${sessionId}`);
      return response.data.updates || [];
    } catch (error) {
      console.error('Failed to get location history:', error);
      return [];
    }
  }

  // Request background location permission
  async requestBackgroundLocationPermission() {
    if (!('permissions' in navigator)) {
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted';
    } catch (error) {
      console.error('Failed to check location permission:', error);
      return false;
    }
  }

  // Initialize service worker message listener
  initializeServiceWorkerListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type) {
          switch (event.data.type) {
            case 'LOCATION_UPDATE_SUCCESS':
              console.log('Background location update successful');
              break;
            case 'LOCATION_UPDATE_FAILED':
              console.error('Background location update failed:', event.data.error);
              break;
            default:
              break;
          }
        }
      });
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.activeSessions) {
      if (now > session.endTime) {
        this.stopLocationSharing(sessionId);
      }
    }
  }

  // Initialize the service
  initialize() {
    this.initializeServiceWorkerListener();

    // Clean up expired sessions every minute
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }
}

// Create singleton instance
const locationSharingService = new LocationSharingService();
locationSharingService.initialize();

export default locationSharingService;