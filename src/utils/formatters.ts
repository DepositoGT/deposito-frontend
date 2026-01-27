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

  let date: Date;

  if (typeof dateStr === 'string') {

    const cleanDateStr = dateStr.replace('Z', '').replace(/\.\d{3}$/, '');

 
    const isoMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)

    if (isoMatch) {
      // Create date with local interpretation of the components
      const [, year, month, day, hour, minute, second] = isoMatch
      date = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      )
    } else {
      // Fallback for simpler date formats (e.g., "2026-01-26")
      const simpleMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (simpleMatch) {
        const [, year, month, day] = simpleMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      } else {
        // Last resort: let JavaScript parse it
        date = new Date(dateStr)
      }
    }
  } else {
    date = dateStr
  }

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
