import { useState, useEffect, useCallback } from 'react'

/**
 * Debounce hook untuk delay execution
 * Berguna untuk search input, resize handlers, dll
 * 
 * Usage:
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 300)
 * 
 * useEffect(() => {
 *   fetchData(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce callback function
 * Delay execution of function
 * 
 * Usage:
 * const debouncedSearch = useDebounceCallback((query) => {
 *   fetchSearchResults(query)
 * }, 300)
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const newTimeoutId = setTimeout(() => {
        callback(...args)
      }, delay)

      setTimeoutId(newTimeoutId)
    },
    [callback, delay, timeoutId]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [timeoutId])

  return debouncedCallback
}

/**
 * Throttle hook
 * Limit execution to once per specified time
 * 
 * Usage:
 * const throttledScroll = useThrottle(() => {
 *   handleScroll()
 * }, 100)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  const [inThrottle, setInThrottle] = useState(false)

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle) {
        callback(...args)
        setInThrottle(true)
        setTimeout(() => setInThrottle(false), limit)
      }
    },
    [callback, inThrottle, limit]
  )
}
