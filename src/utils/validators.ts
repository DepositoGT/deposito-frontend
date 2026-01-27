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
 * Utility functions for validation across the application
 */

/**
 * Validates if a value is a valid number
 * @param value - The value to validate
 * @returns true if valid number, false otherwise
 */
export const isValidNumber = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(num) && !isNaN(num)
}

/**
 * Validates if a string is not empty
 * @param value - The string to validate
 * @returns true if not empty, false otherwise
 */
export const isNotEmpty = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0
}

/**
 * Validates if a number is positive
 * @param value - The number to validate
 * @returns true if positive, false otherwise
 */
export const isPositive = (value: number): boolean => {
  return isValidNumber(value) && value > 0
}

/**
 * Validates if a number is non-negative (>= 0)
 * @param value - The number to validate
 * @returns true if non-negative, false otherwise
 */
export const isNonNegative = (value: number): boolean => {
  return isValidNumber(value) && value >= 0
}

/**
 * Validates if a value is within a range
 * @param value - The value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns true if within range, false otherwise
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return isValidNumber(value) && value >= min && value <= max
}

/**
 * Validates if a date string is valid
 * @param dateStr - The date string to validate
 * @returns true if valid date, false otherwise
 */
export const isValidDate = (dateStr: string | Date | null | undefined): boolean => {
  if (!dateStr) return false
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return !isNaN(date.getTime())
}

/**
 * Validates barcode format (alphanumeric, 8-20 chars)
 * @param barcode - The barcode to validate
 * @returns true if valid barcode, false otherwise
 */
export const isValidBarcode = (barcode: string): boolean => {
  if (!isNotEmpty(barcode)) return false
  const regex = /^[A-Za-z0-9-_]{8,20}$/
  return regex.test(barcode.trim())
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns true if valid email, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!isNotEmpty(email)) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email.trim())
}
