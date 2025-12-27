/**
 * Utility functions for formatting data across the application
 */

/**
 * Formats a number or string as Guatemalan Quetzales currency
 * @param value - The value to format
 * @returns Formatted currency string (e.g., "Q 123.45")
 */
export const formatMoney = (value: number | string | unknown): string => {
  if (value === null || value === undefined) return 'Q 0.00'
  
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))
  
  if (!Number.isFinite(numValue) || isNaN(numValue)) {
    return 'Q 0.00'
  }
  
  return `Q ${numValue.toFixed(2)}`
}

/**
 * Formats a date string or Date object to Guatemala locale format
 * @param dateStr - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 */
export const formatDateTime = (
  dateStr?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateStr) return 'N/A'
  
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  
  if (isNaN(date.getTime())) return 'N/A'
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  }
  
  return new Intl.DateTimeFormat('es-GT', defaultOptions).format(date)
}

/**
 * Formats a date to short format (date only, no time)
 * @param dateStr - ISO date string or Date object
 * @returns Formatted date string
 */
export const formatDate = (dateStr?: string | Date | null): string => {
  return formatDateTime(dateStr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Formats a date to time only
 * @param dateStr - ISO date string or Date object
 * @returns Formatted time string
 */
export const formatTime = (dateStr?: string | Date | null): string => {
  return formatDateTime(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Formats a number with thousand separators
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | string): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))
  
  if (!Number.isFinite(numValue) || isNaN(numValue)) {
    return '0'
  }
  
  return numValue.toLocaleString('es-GT')
}

/**
 * Formats a percentage
 * @param value - The value (0-100 or 0-1 depending on normalize)
 * @param decimals - Number of decimal places
 * @param normalize - If true, expects value in 0-1 range and multiplies by 100
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  decimals: number = 1,
  normalize: boolean = false
): string => {
  const percentage = normalize ? value * 100 : value
  return `${percentage.toFixed(decimals)}%`
}

/**
 * Truncates a string to a maximum length and adds ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export const truncate = (str: string, maxLength: number = 50): string => {
  if (str.length <= maxLength) return str
  return `${str.substring(0, maxLength)}...`
}
