/**
 * Format currency values
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: LKR)
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

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {Object} point1 - First coordinate with latitude and longitude
 * @param {Object} point2 - Second coordinate with latitude and longitude
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return distance;
};

/**
 * Estimate travel time based on distance
 * @param {number} distance - Distance in kilometers
 * @param {number} speedKmh - Average speed in km/h (default: 30)
 * @returns {number} Estimated time in minutes
 */
export const estimateTravelTime = (distance, speedKmh = 30) => {
  if (!distance) return 0;
  
  // Time in hours = distance / speed
  const timeHours = distance / speedKmh;
  // Convert to minutes
  return Math.round(timeHours * 60);
};

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}; 