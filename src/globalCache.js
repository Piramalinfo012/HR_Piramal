// Global fetch interceptor to cache Google Sheets API requests across all pages
// This solves the issue of re-loading data every time a user switches pages.

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
          // Don't set isBypassCache = false here because one click might trigger multiple fetches
        }

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

        // Create the promise and store it immediately to prevent race conditions (duplicate fetches)
        const promise = originalFetch(input, init).then(res => {
          if (!res.ok) {
            fetchCache.delete(cacheKey);
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
};
