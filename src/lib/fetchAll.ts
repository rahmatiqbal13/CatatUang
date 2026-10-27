const PAGE_SIZE = 1000 // Supabase's default max rows per request

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>

/**
 * Runs a query page by page until every row is loaded. Plain selects stop at
 * 1000 rows, which would silently cut off totals once a book grows past that.
 * `page` must apply `.range(from, to)` and a deterministic order (end with `.order('id')`).
 * On any error returns `data: null` rather than a partial list.
 */
export async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>) {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}
