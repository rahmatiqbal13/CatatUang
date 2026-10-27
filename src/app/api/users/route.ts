import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const body = await request.json()
  const { nama, email, password, role } = body
  if (!nama || !email || !password || !role) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'Gagal membuat user' }, { status: 400 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id, nama, role, is_active: true,
  })
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'Gagal menyimpan profil: ' + profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, id: created.user.id })
}

// Deactivation must also ban the auth user: the profile flag alone is only checked by
// proxy.ts, while an existing session token keeps working against Supabase directly.
export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { id, is_active } = await request.json()
  if (!id || typeof is_active !== 'boolean') {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }
  if (id === auth.user!.id && !is_active) {
    return NextResponse.json({ error: 'Tidak bisa menonaktifkan akun sendiri' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: is_active ? 'none' : '876000h',
  })
  if (banError) return NextResponse.json({ error: banError.message }, { status: 400 })

  const { error } = await admin.from('profiles').update({ is_active }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Gagal menyimpan status: ' + error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })
  if (id === auth.user!.id) return NextResponse.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('profiles').delete().eq('id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
