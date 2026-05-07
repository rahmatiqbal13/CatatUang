'use client'

import { useState, useCallback } from 'react'

interface UseSupabaseMutationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  onSettled?: () => void
}

interface UseSupabaseMutationReturn<T, V> {
  mutate: (operation: () => Promise<T>, options?: UseSupabaseMutationOptions<T>) => Promise<T | undefined>
  mutateAsync: (operation: () => Promise<T>) => Promise<T>
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: any
  data: T | undefined
  reset: () => void
}

/**
 * Custom hook untuk handling Supabase mutations
 * dengan loading state, error handling, dan callbacks
 * 
 * Usage:
 * const { mutate, isLoading } = useSupabaseMutation()
 * 
 * const handleSave = async () => {
 *   await mutate(
 *     () => supabase.from('dana_masuk').insert(data),
 *     {
 *       onSuccess: () => toast.success('Berhasil!'),
 *       onError: (err) => toast.error(err.message)
 *     }
 *   )
 * }
 */
export function useSupabaseMutation<T = any, V = any>(): UseSupabaseMutationReturn<T, V> {
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<any>(null)
  const [data, setData] = useState<T | undefined>(undefined)

  const reset = useCallback(() => {
    setIsLoading(false)
    setIsError(false)
    setIsSuccess(false)
    setError(null)
    setData(undefined)
  }, [])

  const mutateAsync = useCallback(async (operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    setIsError(false)
    setIsSuccess(false)
    setError(null)

    try {
      const result = await operation()
      setData(result)
      setIsSuccess(true)
      return result
    } catch (err) {
      setError(err)
      setIsError(true)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const mutate = useCallback(async (
    operation: () => Promise<T>,
    options?: UseSupabaseMutationOptions<T>
  ): Promise<T | undefined> => {
    try {
      const result = await mutateAsync(operation)
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      options?.onError?.(err)
      return undefined
    } finally {
      options?.onSettled?.()
    }
  }, [mutateAsync])

  return {
    mutate,
    mutateAsync,
    isLoading,
    isError,
    isSuccess,
    error,
    data,
    reset,
  }
}

/**
 * Hook untuk batch mutations
 */
export function useBatchMutation<T = any>() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ success: T[]; failed: any[] }>({ success: [], failed: [] })

  const executeBatch = useCallback(async (
    operations: (() => Promise<T>)[],
    options?: {
      stopOnError?: boolean
      onProgress?: (completed: number, total: number) => void
    }
  ) => {
    setIsLoading(true)
    setProgress(0)
    const success: T[] = []
    const failed: any[] = []

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]()
        success.push(result)
      } catch (err) {
        failed.push({ index: i, error: err })
        if (options?.stopOnError) break
      }
      
      setProgress(((i + 1) / operations.length) * 100)
      options?.onProgress?.(i + 1, operations.length)
    }

    setResults({ success, failed })
    setIsLoading(false)
    return { success, failed }
  }, [])

  return {
    executeBatch,
    isLoading,
    progress,
    results,
  }
}
