import type { Metadata } from 'next'
import { Hanken_Grotesk, IBM_Plex_Mono, Newsreader } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const sans = Hanken_Grotesk({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const serif = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CatatUang — Buku Kas Direktorat',
  description: 'Buku kas digital: dana masuk, pengeluaran, peminjaman, dan bukti uang di satu tempat.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
