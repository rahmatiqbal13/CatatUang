'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DanaMasukWithSaldo, Pengeluaran } from '@/lib/types'
import { exportDanaMasuk, exportPengeluaran, exportLaporanLengkap } from '@/lib/export-excel'

interface ExcelExportButtonProps {
  danaList?: DanaMasukWithSaldo[]
  pengeluaranList?: Pengeluaran[]
  type: 'dana' | 'pengeluaran' | 'laporan'
  filename?: string
}

/**
 * Button component untuk export Excel
 * Mendukung export dana, pengeluaran, atau laporan lengkap
 */
export function ExcelExportButton({
  danaList = [],
  pengeluaranList = [],
  type,
  filename,
}: ExcelExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = useCallback(async () => {
    setIsLoading(true)
    
    try {
      switch (type) {
        case 'dana':
          if (danaList.length === 0) {
            toast.error('Tidak ada data dana untuk diexport')
            return
          }
          exportDanaMasuk(danaList, filename)
          toast.success(`Berhasil export ${danaList.length} data dana`)
          break

        case 'pengeluaran':
          if (pengeluaranList.length === 0) {
            toast.error('Tidak ada data pengeluaran untuk diexport')
            return
          }
          exportPengeluaran(pengeluaranList, filename)
          toast.success(`Berhasil export ${pengeluaranList.length} data pengeluaran`)
          break

        case 'laporan':
          if (danaList.length === 0 && pengeluaranList.length === 0) {
            toast.error('Tidak ada data untuk diexport')
            return
          }
          exportLaporanLengkap(danaList, pengeluaranList, filename)
          toast.success('Berhasil export laporan lengkap')
          break
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Gagal export data')
    } finally {
      setIsLoading(false)
    }
  }, [danaList, pengeluaranList, type, filename])

  const getLabel = () => {
    switch (type) {
      case 'dana': return 'Export Dana'
      case 'pengeluaran': return 'Export Pengeluaran'
      case 'laporan': return 'Export Laporan'
      default: return 'Export'
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleExport}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      {isLoading ? 'Mengeksport...' : getLabel()}
    </Button>
  )
}

/**
 * Dropdown button untuk export dengan multiple options
 */
export function ExcelExportDropdown({
  danaList = [],
  pengeluaranList = [],
  filename = 'export',
}: {
  danaList?: DanaMasukWithSaldo[]
  pengeluaranList?: Pengeluaran[]
  filename?: string
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleExport = useCallback(async (type: 'dana' | 'pengeluaran' | 'laporan') => {
    setIsLoading(type)
    
    try {
      switch (type) {
        case 'dana':
          exportDanaMasuk(danaList, filename)
          toast.success('Berhasil export data dana')
          break
        case 'pengeluaran':
          exportPengeluaran(pengeluaranList, filename)
          toast.success('Berhasil export data pengeluaran')
          break
        case 'laporan':
          exportLaporanLengkap(danaList, pengeluaranList, filename)
          toast.success('Berhasil export laporan lengkap')
          break
      }
    } catch (error) {
      toast.error('Gagal export data')
    } finally {
      setIsLoading(null)
    }
  }, [danaList, pengeluaranList, filename])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export Excel
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleExport('dana')}
          disabled={isLoading !== null}
          className="gap-2"
        >
          {isLoading === 'dana' && <Loader2 className="w-3 h-3 animate-spin" />}
          <FileText className="w-3 h-3" />
          Dana Masuk
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('pengeluaran')}
          disabled={isLoading !== null}
          className="gap-2"
        >
          {isLoading === 'pengeluaran' && <Loader2 className="w-3 h-3 animate-spin" />}
          <FileText className="w-3 h-3" />
          Pengeluaran
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('laporan')}
          disabled={isLoading !== null}
          className="gap-2"
        >
          {isLoading === 'laporan' && <Loader2 className="w-3 h-3 animate-spin" />}
          <FileSpreadsheet className="w-3 h-3" />
          Laporan Lengkap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
