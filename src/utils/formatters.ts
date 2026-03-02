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
 * Formats a number or string as currency.
 * @param value - The value to format
 * @param locale - Optional locale (e.g. 'es-GT', 'en-GB'). If not provided uses 'es-GT'
 * @param currencyCode - Optional currency code (e.g. 'GTQ', 'USD'). If not provided uses 'Q 0.00' fallback
 */
export const formatMoney = (
  value: number | string | unknown,
  locale?: string,
  currencyCode?: string
): string => {
  if (value === null || value === undefined) {
    if (locale && currencyCode) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(0)
    }
    return 'Q 0.00'
  }

  const numValue = typeof value === 'number' ? value : parseFloat(String(value))

  if (!Number.isFinite(numValue) || isNaN(numValue)) {
    if (locale && currencyCode) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(0)
    }
    return 'Q 0.00'
  }

  if (locale && currencyCode) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(numValue)
  }
  return `Q ${numValue.toFixed(2)}`
}

/**
 * Formats a date string or Date object.
 * @param dateStr - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param locale - Optional locale (e.g. 'es-GT', 'en-GB'). If not provided uses 'es-GT'
 */
export const formatDateTime = (
  dateStr?: string | Date | null,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  if (!dateStr) return 'N/A'

  let date: Date;

  if (typeof dateStr === 'string') {

    const cleanDateStr = dateStr.replace('Z', '').replace(/\.\d{3}$/, '');

 
    const isoMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)

    if (isoMatch) {
      const [, year, month, day, hour, minute, second] = isoMatch
      date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      )
    } else {
      const simpleMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (simpleMatch) {
        const [, year, month, day] = simpleMatch
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      } else {
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

  const loc = (locale && locale.trim()) || 'es-GT'
  return new Intl.DateTimeFormat(loc, defaultOptions).format(date)
}

/**
 * Formats a date to short format (date only, no time)
 */
export const formatDate = (dateStr?: string | Date | null, locale?: string): string => {
  return formatDateTime(dateStr, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }, locale)
}

/**
 * Formats a date to time only
 */
export const formatTime = (dateStr?: string | Date | null, locale?: string): string => {
  return formatDateTime(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }, locale)
}

/**
 * Formats a number with thousand separators
 * @param locale - Optional locale (e.g. 'es-GT'). If not provided uses 'es-GT'
 */
export const formatNumber = (value: number | string, locale?: string): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value))

  if (!Number.isFinite(numValue) || isNaN(numValue)) {
    return '0'
  }

  return numValue.toLocaleString((locale && locale.trim()) || 'es-GT')
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
