'use client'

import { useState, useCallback } from 'react'

interface UseSupabaseMutationOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: unknown) => void
  onSettled?: () => void
}

interface UseSupabaseMutationReturn<T> {
  mutate: (operation: () => Promise<T>, options?: UseSupabaseMutationOptions<T>) => Promise<T | undefined>
  mutateAsync: (operation: () => Promise<T>) => Promise<T>
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: unknown
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
export function useSupabaseMutation<T = unknown>(): UseSupabaseMutationReturn<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<unknown>(null)
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
