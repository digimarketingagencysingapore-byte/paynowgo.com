/**
 * Money utility functions for handling SGD currency
 * Stores prices as cents (integers) to avoid floating point precision issues
 */

/**
 * Parse price string to cents
 * @param input - Price string like "12.34" or "12"
 * @returns Price in cents (1234)
 */
export function parsePriceToCents(input: string): number {
  if (!input || input.trim() === '') return 0;
  
  const cleaned = input.trim().replace(/[^\d.]/g, ''); // Remove non-numeric except decimal
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  
  // Round to 2 decimal places and convert to cents
  return Math.round(parsed * 100);
}

/**
 * Format cents to SGD display string
 * @param cents - Price in cents (1234)
 * @returns Formatted string like "SGD 12.34"
 */
export function formatCentsToSGD(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents)) return 'SGD 0.00';
  
  const dollars = cents / 100;
  return `SGD ${dollars.toFixed(2)}`;
}

/**
 * Format cents to price string without currency symbol
 * @param cents - Price in cents (1234)
 * @returns Formatted string like "12.34"
 */
export function formatCentsToPrice(cents: number): string {
  if (typeof cents !== 'number' || isNaN(cents)) return '0.00';
  
  const dollars = cents / 100;
  return dollars.toFixed(2);
}

/**
 * Validate price input string
 * @param input - Price string to validate
 * @returns True if valid price format
 */
export function isValidPrice(input: string): boolean {
  if (!input || input.trim() === '') return false;
  
  const cleaned = input.trim();
  const priceRegex = /^\d+(\.\d{1,2})?$/;
  
  if (!priceRegex.test(cleaned)) return false;
  
  const parsed = parseFloat(cleaned);
  return !isNaN(parsed) && parsed >= 0 && parsed <= 999999.99;
}

/**
 * Calculate total from array of line items
 * @param lines - Array of items with qty and unitPriceCents
 * @returns Total in cents
 */
export function calculateCartTotal(lines: Array<{ qty: number; unitPriceCents: number }>): number {
  return lines.reduce((total, line) => {
    return total + (line.qty * line.unitPriceCents);
  }, 0);
}