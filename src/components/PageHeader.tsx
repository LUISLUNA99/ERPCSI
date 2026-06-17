'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function PageHeader({ title, description, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-accent-500 hover:bg-accent-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
