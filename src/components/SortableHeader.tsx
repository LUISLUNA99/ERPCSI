'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { type SortConfig } from '@/hooks/useSort'
import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  label: string
  sortKey: string
  sortConfig: SortConfig | null
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({ label, sortKey, sortConfig, onSort, className }: SortableHeaderProps) {
  const isActive = sortConfig?.key === sortKey

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-gray-50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortConfig.direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-primary-500" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-primary-500" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </div>
    </TableHead>
  )
}
