/**
 * Storage Manager for Dance Duet Projects
 * Uses localStorage for metadata and IndexedDB for large video files
 */

const DB_NAME = 'DanceDuetDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const MAX_PROJECTS = 20; // Limit to prevent storage overflow

/**
 * Initialize IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('layoutMode', 'layoutMode', { unique: false });
      }
    };
  });
}

/**
 * Save project to IndexedDB
 */
export async function saveProject(projectData) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const project = {
      ...projectData,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = objectStore.add(project);
      request.onsuccess = () => {
        cleanupOldProjects(); // Remove old projects if limit exceeded
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save project:', error);
    throw error;
  }
}

/**
 * Get all projects from IndexedDB
 */
export async function getAllProjects() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get projects:', error);
    return [];
  }
}

/**
 * Get project by ID
 */
export async function getProject(id) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}

/**
 * Delete project from IndexedDB
 */
export async function deleteProject(id) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = objectStore.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
    throw error;
  }
}

/**
 * Clean up old projects if limit exceeded
 */
export async function cleanupOldProjects() {
  try {
    const projects = await getAllProjects();
    
    if (projects.length > MAX_PROJECTS) {
      // Sort by timestamp (oldest first)
      const sorted = projects.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      // Delete oldest projects
      const toDelete = sorted.slice(0, projects.length - MAX_PROJECTS);
      
      for (const project of toDelete) {
        await deleteProject(project.id);
      }
      
      console.log(`Cleaned up ${toDelete.length} old projects`);
    }
  } catch (error) {
    console.error('Failed to cleanup old projects:', error);
  }
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(2);
      
      return {
        used: estimate.usage,
        quota: estimate.quota,
        usedMB,
        quotaMB,
        percentUsed,
        available: estimate.quota - estimate.usage,
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
    }
  }
  
  return null;
}

/**
 * Clear all storage
 */
export async function clearAllStorage() {
  try {
    // Clear IndexedDB
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = objectStore.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
    
    // Clear localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('danceDuet')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('All storage cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
}

/**
 * Export project data as JSON
 */
export async function exportProject(id) {
  try {
    const project = await getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dance-duet-project-${id}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export project:', error);
    throw error;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem('danceDuetSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Load settings from localStorage
 */
export function loadSettings() {
  try {
    const saved = localStorage.getItem('danceDuetSettings');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

/**
 * Check if storage is available
 */
export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable() {
  return 'indexedDB' in window;
}
