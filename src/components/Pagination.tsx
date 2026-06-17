'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalItems, pageSize = 25, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Mostrando {start}-{end} de {totalItems}
      </p>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let page: number
          if (totalPages <= 5) {
            page = i + 1
          } else if (currentPage <= 3) {
            page = i + 1
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i
          } else {
            page = currentPage - 2 + i
          }
          return (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className={page === currentPage ? 'bg-accent-500 text-white' : ''}
            >
              {page}
            </Button>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export function usePagination<T>(items: T[], pageSize: number = 25) {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)

  function getPageItems(page: number): T[] {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }

  return { totalItems, totalPages, getPageItems }
}
