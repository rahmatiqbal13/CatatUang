import { useOptimistic, useTransition, useCallback } from 'react'

/**
 * Hook untuk optimistic updates
 * Update UI sebelum API call selesai, rollback jika error
 * 
 * Usage:
 * const { optimisticData, updateOptimistically } = useOptimisticUpdate(
 *   initialData,
 *   (state, newItem) => [...state, newItem]
 * )
 * 
 * const handleAdd = async (newItem) => {
 *   const rollback = updateOptimistically(newItem)
 *   try {
 *     await api.add(newItem)
 *   } catch (error) {
 *     rollback()
 *   }
 * }
 */

export function useOptimisticUpdate<T, A>(
  initialData: T,
  updateFn: (state: T, arg: A) => T
) {
  const [isPending, startTransition] = useTransition()
  const [optimisticData, setOptimisticData] = useOptimistic<T, A>(
    initialData,
    updateFn
  )

  const updateOptimistically = useCallback((arg: A): (() => void) => {
    const previousData = optimisticData
    
    startTransition(() => {
      setOptimisticData(arg)
    })

    // Return rollback function
    return () => {
      startTransition(() => {
        setOptimisticData(previousData as unknown as A)
      })
    }
  }, [optimisticData, setOptimisticData, startTransition])

  return {
    optimisticData,
    updateOptimistically,
    isPending,
  }
}

/**
 * Hook untuk optimistic list operations
 * Helper spesifik untuk array/list operations
 */
export function useOptimisticList<T extends { id: number | string }>(
  initialList: T[]
) {
  const [isPending, startTransition] = useTransition()
  const [optimisticList, setOptimisticList] = useOptimistic<T[], { type: string; payload: any }>(
    initialList,
    (state, action) => {
      switch (action.type) {
        case 'add':
          return [...state, action.payload]
        case 'update':
          return state.map(item => 
            item.id === action.payload.id ? { ...item, ...action.payload } : item
          )
        case 'delete':
          return state.filter(item => item.id !== action.payload)
        case 'replace':
          return action.payload
        default:
          return state
      }
    }
  )

  const addOptimistically = useCallback((item: T): (() => void) => {
    const previousList = optimisticList
    startTransition(() => {
      setOptimisticList({ type: 'add', payload: item })
    })
    return () => {
      startTransition(() => {
        setOptimisticList({ type: 'replace', payload: previousList })
      })
    }
  }, [optimisticList, setOptimisticList])

  const updateOptimistically = useCallback((id: number | string, updates: Partial<T>): (() => void) => {
    const previousList = optimisticList
    startTransition(() => {
      setOptimisticList({ type: 'update', payload: { id, ...updates } })
    })
    return () => {
      startTransition(() => {
        setOptimisticList({ type: 'replace', payload: previousList })
      })
    }
  }, [optimisticList, setOptimisticList])

  const deleteOptimistically = useCallback((id: number | string): (() => void) => {
    const previousList = optimisticList
    startTransition(() => {
      setOptimisticList({ type: 'delete', payload: id })
    })
    return () => {
      startTransition(() => {
        setOptimisticList({ type: 'replace', payload: previousList })
      })
    }
  }, [optimisticList, setOptimisticList])

  return {
    optimisticList,
    addOptimistically,
    updateOptimistically,
    deleteOptimistically,
    isPending,
  }
}
