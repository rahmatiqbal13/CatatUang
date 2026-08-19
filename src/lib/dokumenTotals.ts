import type { InvoiceItem, RabItem } from './types'

export function computeInvoiceTotals(items: InvoiceItem[], diskonPersen: number, pajakPersen: number) {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.harga_satuan, 0)
  const diskonNominal = subtotal * diskonPersen / 100
  const dpp = subtotal - diskonNominal
  const pajakNominal = dpp * pajakPersen / 100
  const total = dpp + pajakNominal
  return { subtotal, diskonNominal, dpp, pajakNominal, total }
}

export function groupRabByKategori(items: RabItem[]) {
  const map = new Map<string, RabItem[]>()
  for (const it of items) {
    const key = it.kategori || 'Lainnya'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return Array.from(map.entries()).map(([kategori, items]) => ({
    kategori,
    items,
    subtotal: items.reduce((sum, it) => sum + it.volume * it.harga_satuan, 0),
  }))
}

export function computeRabGrandTotal(items: RabItem[]) {
  return items.reduce((sum, it) => sum + it.volume * it.harga_satuan, 0)
}
