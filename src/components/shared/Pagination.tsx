/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

/**
 * Pagination - Reusable pagination component
 */
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage?: boolean
  hasPrevPage?: boolean
  loading?: boolean
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  loading = false,
}: PaginationProps) => {
  const canGoPrev = hasPrevPage !== undefined ? hasPrevPage : currentPage > 1
  const canGoNext = hasNextPage !== undefined ? hasNextPage : currentPage < totalPages

  return (
    <div className="flex justify-end items-center gap-2 mt-4">
      <span className="text-sm text-muted-foreground mr-2">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev || loading}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext || loading}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
