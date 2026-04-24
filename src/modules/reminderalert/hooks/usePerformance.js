import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Custom hook for lazy loading with intersection observer
 * Useful for voice call panels, expandable sections, etc.
 * 
 * @hook
 * @param {Object} options - Configuration options
 * @param {number} [options.threshold=0.1] - Intersection threshold
 * @param {string} [options.rootMargin='0px'] - Root margin
 * @param {function} [options.onVisible] - Callback when element becomes visible
 * 
 * @returns {Object} Lazy loading interface
 * @returns {React.RefObject} returns.ref - Ref to attach to element
 * @returns {boolean} returns.isVisible - Current visibility state
 * @returns {function} returns.reset - Reset visibility state
 * 
 * @example
 * const { ref, isVisible } = useLazyLoad({
 *   onVisible: () => fetchVoiceCallStatus(),
 *   threshold: 0.5
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible && <VoiceCallPanel />}
 *   </div>
 * );
 */
export const useLazyLoad = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    onVisible = null,
  } = options;

  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          onVisible?.();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current = observer;

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current && observer) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, onVisible, isVisible]);

  const reset = useCallback(() => {
    setIsVisible(false);
    if (ref.current && observerRef.current) {
      observerRef.current.observe(ref.current);
    }
  }, []);

  return { ref, isVisible, reset };
};

/**
 * Custom hook for simple in-memory caching with TTL
 * Useful for caching API responses, computed values, etc.
 * 
 * @hook
 * @param {function} fetchFn - Async function to fetch data
 * @param {Array} dependencies - Dependency array for refetching
 * @param {Object} options - Configuration options
 * @param {number} [options.ttl=5*60*1000] - Time to live in milliseconds (default: 5 mins)
 * @param {boolean} [options.skipInitialFetch=false] - Skip fetching on mount
 * 
 * @returns {Object} Cache interface
 * @returns {*} returns.data - Cached data
 * @returns {boolean} returns.loading - Loading state
 * @returns {Error} returns.error - Error object
 * @returns {function} returns.refetch - Force refetch data
 * @returns {function} returns.clear - Clear cache
 * 
 * @example
 * const { data: callStatus, refetch } = useCache(
 *   () => getVoiceCallStatus(reminderId),
 *   [reminderId],
 *   { ttl: 30000 } // 30 seconds
 * );
 */
export const useCache = (fetchFn, dependencies = [], options = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    skipInitialFetch = false,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({ data: null, timestamp: null });

  const isCacheValid = useCallback(() => {
    if (!cacheRef.current.timestamp) return false;
    return Date.now() - cacheRef.current.timestamp < ttl;
  }, [ttl]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      cacheRef.current = { data: result, timestamp: Date.now() };
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const clear = useCallback(() => {
    cacheRef.current = { data: null, timestamp: null };
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (skipInitialFetch) return;

    if (isCacheValid() && cacheRef.current.data) {
      setData(cacheRef.current.data);
    } else {
      refetch();
    }
  }, dependencies);

  return { data, loading, error, refetch, clear };
};

/**
 * Custom hook for debounced search/filter with caching
 * Optimizes performance for search-heavy operations
 * 
 * @hook
 * @param {function} searchFn - Search function returning results
 * @param {number} [delay=300] - Debounce delay in ms
 * @param {Object} [options={}] - Additional options
 * 
 * @returns {Object} Search interface
 * @returns {string} returns.query - Current search query
 * @returns {function} returns.setQuery - Update search query
 * @returns {Array} returns.results - Search results
 * @returns {boolean} returns.loading - Loading state
 * @returns {function} returns.reset - Clear search
 * 
 * @example
 * const { query, setQuery, results } = useDebouncedSearch(
 *   (q) => searchReminders(q),
 *   300
 * );
 */
export const useDebouncedSearch = (searchFn, delay = 300, options = {}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const cacheRef = useRef(new Map());

  const search = useCallback(
    async (searchQuery) => {
      if (!searchQuery) {
        setResults([]);
        return;
      }

      // Check cache first
      if (cacheRef.current.has(searchQuery)) {
        setResults(cacheRef.current.get(searchQuery));
        return;
      }

      try {
        setLoading(true);
        const searchResults = await searchFn(searchQuery);
        cacheRef.current.set(searchQuery, searchResults);
        setResults(searchResults);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchFn]
  );

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query) {
      setResults([]);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      search(query);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, search, delay]);

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    cacheRef.current.clear();
  }, []);

  return { query, setQuery, results, loading, reset };
};

/**
 * Custom hook for efficient list virtualization awareness
 * Helps optimize rendering of long reminder lists
 * 
 * @hook
 * @param {Array} items - Items to virtualize
 * @param {number} [itemHeight=80] - Height of each item in pixels
 * @param {number} [containerHeight=600] - Container height in pixels
 * @param {number} [overscan=3] - Number of items to render outside viewport
 * 
 * @returns {Object} Virtualization interface
 * @returns {Array} returns.visibleItems - Items currently visible
 * @returns {number} returns.startIndex - Start index of visible items
 * @returns {number} returns.endIndex - End index of visible items
 * @returns {number} returns.offsetY - Vertical offset in pixels
 * @returns {function} returns.onScroll - Scroll handler
 * 
 * @example
 * const { visibleItems, onScroll } = useVirtualization(reminders, 80, 600);
 * 
 * return (
 *   <div onScroll={onScroll} style={{ height: 600, overflow: 'auto' }}>
 *     {visibleItems.map(item => <ReminderCard key={item._id} {...item} />)}
 *   </div>
 * );
 */
export const useVirtualization = (
  items = [],
  itemHeight = 80,
  containerHeight = 600,
  overscan = 3
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    onScroll,
    totalHeight: items.length * itemHeight,
  };
};

/**
 * Custom hook for performance monitoring
 * Useful for identifying performance bottlenecks
 * 
 * @hook
 * @param {string} componentName - Name of component being monitored
 * @param {Object} [options={}] - Configuration
 * @param {boolean} [options.enabled=true] - Enable/disable monitoring
 * @param {number} [options.warnThreshold=16] - Warn if render time exceeds ms
 * 
 * @returns {Object} Performance metrics
 * @returns {number} returns.renderTime - Time taken for render
 * @returns {function} returns.mark - Mark a performance point
 * @returns {function} returns.measure - Measure time between marks
 * 
 * @example
 * const { renderTime, mark } = usePerformanceMonitor('ReminderList');
 * 
 * mark('data-fetch-start');
 * // ... fetch data
 * measure('data-fetch');
 */
export const usePerformanceMonitor = (componentName, options = {}) => {
  const { enabled = true, warnThreshold = 16 } = options;
  const marksRef = useRef(new Map());
  const renderTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      renderTimeRef.current = renderTime;

      if (renderTime > warnThreshold) {
        console.warn(
          `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`
        );
      }
    };
  });

  const mark = useCallback(
    (name) => {
      if (!enabled) return;
      marksRef.current.set(name, performance.now());
    },
    [enabled]
  );

  const measure = useCallback(
    (name, startMark, endMark = `${startMark}-end`) => {
      if (!enabled) return 0;
      const startTime = marksRef.current.get(startMark);
      const endTime = marksRef.current.get(endMark) || performance.now();
      const duration = endTime - startTime;

      if (duration > warnThreshold) {
        console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
      }

      return duration;
    },
    [enabled, warnThreshold]
  );

  return {
    renderTime: renderTimeRef.current,
    mark,
    measure,
  };
};
