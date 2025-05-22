/**
 * Generate a unique ID for package tracking
 * Format: 2 letters + 6 numbers (e.g., AB123456)
 * @returns {string} Unique tracking ID
 */
export const generateUniqueId = () => {
  // Generate 2 random uppercase letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letterPart = Array(2)
    .fill()
    .map(() => letters.charAt(Math.floor(Math.random() * letters.length)))
    .join('');
  
  // Generate 6 random numbers
  const numberPart = Array(6)
    .fill()
    .map(() => Math.floor(Math.random() * 10))
    .join('');
  
  return `${letterPart}${numberPart}`;
};

/**
 * Format currency values
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'LKR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date to a human-readable string
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  const dateObj = new Date(date);
  const defaultOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}; 