// Global fetch interceptor to cache Google Sheets API requests across all pages
// This solves the issue of re-loading data every time a user switches pages or reloads.

const originalFetch = window.fetch;
const fetchCache = new Map();

// Helper to determine if we should bypass the cache (e.g. user clicked "Refresh")
let isBypassCache = false;

// Listen for clicks on any "Refresh" button globally
window.addEventListener('mousedown', (e) => {
  const btn = e.target.closest('button');
  if (btn && (
    (btn.innerText && btn.innerText.toLowerCase().includes('refresh')) || 
    (btn.title && btn.title.toLowerCase().includes('refresh'))
  )) {
    isBypassCache = true;
    // Reset bypass flag after 1.5 seconds (enough time for the fetch call to be triggered)
    setTimeout(() => {
      isBypassCache = false;
    }, 1500);
  }
}, true);

// --- IndexedDB Cache Implementation for Persistent Caching ---
const DB_NAME = 'HRMS_CacheDB';
const STORE_NAME = 'fetch_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour TTL

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getCacheIDB = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
};

const setCacheIDB = async (key, value) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // ignore
  }
};

const deleteCacheIDB = async (key) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // ignore
  }
};

const clearCacheIDB = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    // ignore
  }
};
// -----------------------------------------------------------

export const initGlobalCache = () => {
  window.fetch = async (input, init) => {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    }

    const isGoogleScript = url.includes('script.google.com') || url.includes('script.googleusercontent.com');
    const isPost = init?.method === 'POST' || (input instanceof Request && input.method === 'POST');

    if (isGoogleScript) {
      if (isPost) {
        // Clear entire cache on any POST mutation to ensure fresh data across the system
        fetchCache.clear();
        clearCacheIDB(); // Clear persistent cache too
        return originalFetch(input, init);
      }

      try {
        const urlObj = new URL(url);
        
        // Remove the `_` cache buster parameter to create a stable cache key
        if (urlObj.searchParams.has('_')) {
          urlObj.searchParams.delete('_');
        }
        
        const cacheKey = urlObj.toString();

        // If the user clicked "Refresh", we bypass the cache and clear it for this key
        if (isBypassCache) {
          fetchCache.delete(cacheKey);
          deleteCacheIDB(cacheKey); // Clear from persistent cache
        }

        // 1. Check Memory Cache
        if (fetchCache.has(cacheKey)) {
          const cachedPromise = fetchCache.get(cacheKey);
          try {
            const res = await cachedPromise;
            // Return a clone so the body can be read multiple times by different components
            return res.clone();
          } catch (e) {
            // If the cached promise failed, we will just proceed to fetch again
            fetchCache.delete(cacheKey);
          }
        }

        // 2. Check Persistent IndexedDB Cache
        if (!isBypassCache) {
          const idbData = await getCacheIDB(cacheKey);
          if (idbData && (Date.now() - idbData.timestamp < CACHE_TTL)) {
            // We have valid persistent cache! Return synthetic response immediately
            const synthRes = new Response(idbData.body, {
              status: 200,
              headers: new Headers({ 'Content-Type': 'application/json' })
            });
            // Store it in memory cache so subsequent calls in this session are instant
            fetchCache.set(cacheKey, Promise.resolve(synthRes.clone()));
            return synthRes;
          }
        }

        // 3. Fallback: Network Fetch
        // Create the promise and store it immediately to prevent race conditions (duplicate fetches)
        const promise = originalFetch(input, init).then(async res => {
          if (!res.ok) {
            fetchCache.delete(cacheKey);
            return res;
          }
          
          // Clone and save to persistent cache
          const resCloneForIDB = res.clone();
          try {
            const text = await resCloneForIDB.text();
            await setCacheIDB(cacheKey, {
              body: text,
              timestamp: Date.now()
            });
          } catch (e) {
            console.error("IDB Save error", e);
          }

          return res;
        }).catch(err => {
          fetchCache.delete(cacheKey);
          throw err;
        });

        fetchCache.set(cacheKey, promise);
        
        const res = await promise;
        return res.clone();
      } catch (e) {
        // Fallback if URL parsing fails
        return originalFetch(input, init);
      }
    }

    return originalFetch(input, init);
  };
};

// Expose a way to clear cache manually if needed
window.clearAppCache = () => {
  fetchCache.clear();
  clearCacheIDB();
};
