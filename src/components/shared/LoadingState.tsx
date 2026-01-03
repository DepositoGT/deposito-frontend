/**
 * LoadingState - Reusable loading state component
 */
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export const LoadingState = ({ message = 'Cargando...', size = 'md' }: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Loader2 className={`${sizeClasses[size]} animate-spin mb-2`} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
