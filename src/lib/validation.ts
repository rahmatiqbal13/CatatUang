import { z } from 'zod'

/**
 * Zod validation schemas untuk form validation
 * Memastikan data yang masuk ke database valid
 */

// ============================================================================
// DANA MASUK SCHEMAS
// ============================================================================

const danaMasukBaseSchema = z.object({
  nama_dana: z
    .string()
    .min(3, 'Nama dana minimal 3 karakter')
    .max(100, 'Nama dana maksimal 100 karakter')
    .trim(),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .refine((val) => {
      const date = new Date(val)
      return !isNaN(date.getTime()) && date <= new Date()
    }, 'Tanggal tidak valid atau di masa depan'),
  sumber: z
    .string()
    .min(1, 'Sumber dana wajib dipilih'),
  keterangan: z
    .string()
    .max(500, 'Keterangan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
})

// Dipakai saat membuat wallet baru — jumlah adalah saldo awal opsional (0 = wallet kosong)
export const danaMasukSchema = danaMasukBaseSchema.extend({
  jumlah: z
    .number()
    .min(0, 'Jumlah tidak boleh negatif')
    .max(999999999999.99, 'Jumlah terlalu besar'),
})

// Dipakai saat mengedit wallet — total saldo dihitung dari pemasukan, bukan field ini
export const danaMasukEditSchema = danaMasukBaseSchema

export type DanaMasukFormData = z.infer<typeof danaMasukSchema>

// ============================================================================
// PENGELUARAN SCHEMAS
// ============================================================================

export const pengeluaranSchema = z.object({
  dana_id: z
    .number()
    .positive('Dana harus dipilih'),
  nama_dana: z
    .string()
    .min(1, 'Nama dana tidak valid'),
  uraian: z
    .string()
    .min(3, 'Uraian minimal 3 karakter')
    .max(255, 'Uraian maksimal 255 karakter')
    .trim(),
  kategori: z
    .string()
    .min(1, 'Kategori wajib dipilih'),
  jumlah: z
    .number()
    .positive('Jumlah harus lebih dari 0')
    .max(999999999999.99, 'Jumlah terlalu besar'),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .refine((val) => {
      const date = new Date(val)
      return !isNaN(date.getTime())
    }, 'Tanggal tidak valid'),
  keterangan: z
    .string()
    .max(500, 'Keterangan maksimal 500 karakter')
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['pending', 'approved', 'rejected'])
    .default('pending'),
})

export type PengeluaranFormData = z.infer<typeof pengeluaranSchema>

// ============================================================================
// KATEGORI & SUMBER DANA SCHEMAS
// ============================================================================

export const kategoriSchema = z.object({
  nama: z
    .string()
    .min(2, 'Nama kategori minimal 2 karakter')
    .max(50, 'Nama kategori maksimal 50 karakter')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Nama kategori hanya boleh huruf, angka, spasi, -, &'),
})

export const sumberDanaSchema = z.object({
  nama: z
    .string()
    .min(2, 'Nama sumber dana minimal 2 karakter')
    .max(50, 'Nama sumber dana maksimal 50 karakter')
    .trim()
    .regex(/^[a-zA-Z0-9\s]+$/, 'Nama sumber dana hanya boleh huruf, angka, dan spasi'),
})

export type KategoriFormData = z.infer<typeof kategoriSchema>
export type SumberDanaFormData = z.infer<typeof sumberDanaSchema>

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const settingsSchema = z.object({
  nama_direktorat: z
    .string()
    .min(3, 'Nama direktorat minimal 3 karakter')
    .max(100, 'Nama direktorat maksimal 100 karakter')
    .trim(),
  nama_kepala: z
    .string()
    .max(100, 'Nama kepala maksimal 100 karakter')
    .trim()
    .optional()
    .or(z.literal('')),
  nama_bendahara: z
    .string()
    .max(100, 'Nama bendahara maksimal 100 karakter')
    .trim()
    .optional()
    .or(z.literal('')),
  currency: z
    .enum(['IDR', 'USD'])
    .default('IDR'),
})

export type SettingsFormData = z.infer<typeof settingsSchema>

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const filterSchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
  dana_id: z.string().optional(),
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
})

export type FilterFormData = z.infer<typeof filterSchema>

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate form data dengan Zod schema
 * Returns object dengan format yang sesuai untuk toast/error handling
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map((err) => err.message)
  return { success: false, errors }
}

/**
 * Validate single field
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { valid: true; value: T } | { valid: false; error: string } {
  const result = schema.safeParse(value)

  if (result.success) {
    return { valid: true, value: result.data }
  }

  return { valid: false, error: result.error.issues[0]?.message || 'Invalid' }
}

/**
 * Format Zod error untuk display
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
}
