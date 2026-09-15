import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const archivo = Archivo({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CatatUang — Keuangan Direktorat',
  description: 'Sistem Manajemen Keuangan Direktorat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${archivo.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
