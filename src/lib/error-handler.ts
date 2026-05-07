/**
 * Error handler utility untuk Supabase errors
 * Mengkonversi error code menjadi pesan yang user-friendly
 */

export type ErrorCode = 
  | '23503' // foreign_key_violation
  | '23505' // unique_violation
  | '23502' // not_null_violation
  | '23514' // check_violation
  | 'PGRST116' // not_found
  | 'PGRST301' // timeout
  | 'auth/invalid-credentials'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/email-already-in-use'
  | 'network'
  | 'timeout'
  | 'unknown'

const errorMessages: Record<string, string> = {
  // Database errors
  '23503': 'Data tidak dapat dihapus karena masih digunakan oleh data lain',
  '23505': 'Data sudah ada (duplicate entry)',
  '23502': 'Field wajib diisi tidak boleh kosong',
  '23514': 'Nilai tidak memenuhi kriteria validasi',
  
  // PostgREST errors
  'PGRST116': 'Data tidak ditemukan',
  'PGRST301': 'Request timeout, silakan coba lagi',
  
  // Auth errors
  'auth/invalid-credentials': 'Email atau password salah',
  'auth/user-not-found': 'Akun tidak ditemukan',
  'auth/wrong-password': 'Password salah',
  'auth/email-already-in-use': 'Email sudah terdaftar',
  'auth/weak-password': 'Password terlalu lemah, minimal 6 karakter',
  
  // Network errors
  'network': 'Koneksi bermasalah, periksa internet Anda',
  'timeout': 'Waktu habis, silakan coba lagi',
}

/**
 * Extract error code dari Supabase error object
 */
function extractErrorCode(error: any): string {
  if (!error) return 'unknown'
  
  // PostgreSQL error code
  if (error.code) return error.code
  
  // Supabase/PostgREST error
  if (error.error?.code) return error.error.code
  
  // Message based detection
  const message = (error.message || error.error?.message || '').toLowerCase()
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('timeout')) {
    return 'timeout'
  }
  if (message.includes('invalid login credentials')) {
    return 'auth/invalid-credentials'
  }
  if (message.includes('user not found')) {
    return 'auth/user-not-found'
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'auth/email-already-in-use'
  }
  
  return 'unknown'
}

/**
 * Handle Supabase error dan return user-friendly message
 */
export function handleSupabaseError(error: any): string {
  const code = extractErrorCode(error)
  return errorMessages[code] || error?.message || 'Terjadi kesalahan, silakan coba lagi'
}

/**
 * Handle error untuk toast notification
 */
export function handleErrorToast(error: any, fallbackMessage = 'Terjadi kesalahan'): string {
  const message = handleSupabaseError(error)
  console.error('[Error]', error)
  return message || fallbackMessage
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error: any, code: ErrorCode): boolean {
  return extractErrorCode(error) === code
}

/**
 * Format validation errors dari Zod
 */
export function formatZodError(error: any): string {
  if (error?.errors && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => e.message).join(', ')
  }
  return error?.message || 'Validasi gagal'
}
