/**
 * StatusBadge - Reusable badge component for status display
 */
import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS } from '@/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export const StatusBadge = ({ status, variant }: StatusBadgeProps) => {
  const getStatusStyle = (statusName: string) => {
    const colorMap: Record<string, string> = {
      Pendiente: 'bg-yellow-500 text-white hover:bg-yellow-600',
      Aprobada: 'bg-blue-500 text-white hover:bg-blue-600',
      Rechazada: 'bg-red-500 text-white hover:bg-red-600',
      Completada: 'bg-green-500 text-white hover:bg-green-600',
      Pagado: 'bg-green-500 text-white hover:bg-green-600',
      Cancelada: 'bg-red-500 text-white hover:bg-red-600',
      'En proceso': 'bg-blue-500 text-white hover:bg-blue-600',
    }

    return colorMap[statusName] || ''
  }

  if (variant === 'destructive') {
    return <Badge variant="destructive">{status}</Badge>
  }

  if (variant === 'outline') {
    return <Badge variant="outline">{status}</Badge>
  }

  const customClass = getStatusStyle(status)
  
  if (customClass) {
    return <Badge className={customClass}>{status}</Badge>
  }

  return <Badge variant={variant || 'default'}>{status}</Badge>
}
