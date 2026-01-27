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
 * Utility functions for array and object operations
 */

/**
 * Groups array items by a key
 * @param array - The array to group
 * @param keyFn - Function to extract the grouping key from each item
 * @returns Object with grouped items
 */
export const groupBy = <T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const key = keyFn(item)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(item)
    return result
  }, {} as Record<K, T[]>)
}

/**
 * Sums numeric values from array items
 * @param array - The array to sum
 * @param keyFn - Function to extract the numeric value from each item
 * @returns Sum of all values
 */
export const sumBy = <T>(array: T[], keyFn: (item: T) => number): number => {
  return array.reduce((sum, item) => sum + keyFn(item), 0)
}

/**
 * Finds unique items in an array
 * @param array - The array to process
 * @param keyFn - Optional function to extract comparison key
 * @returns Array with unique items
 */
export const uniqueBy = <T, K>(
  array: T[],
  keyFn: (item: T) => K = (item) => item as unknown as K
): T[] => {
  const seen = new Set<K>()
  return array.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Sorts array by a key in ascending or descending order
 * @param array - The array to sort
 * @param keyFn - Function to extract the sort key
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted array
 */
export const sortBy = <T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aKey = keyFn(a)
    const bKey = keyFn(b)
    
    if (aKey < bKey) return order === 'asc' ? -1 : 1
    if (aKey > bKey) return order === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Chunks array into smaller arrays of specified size
 * @param array - The array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Deep clones an object or array
 * @param obj - The object to clone
 * @returns Deep cloned object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Omits specified keys from an object
 * @param obj - The object to process
 * @param keys - Keys to omit
 * @returns New object without specified keys
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach((key) => delete result[key])
  return result
}

/**
 * Picks specified keys from an object
 * @param obj - The object to process
 * @param keys - Keys to pick
 * @returns New object with only specified keys
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}
