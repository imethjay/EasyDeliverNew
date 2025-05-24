/**
 * Safely convert various date formats to JavaScript Date object
 * @param {*} dateInput - Date, Timestamp, string, or number
 * @returns {Date|null} Valid Date object or null if invalid
 */
export const safeConvertToDate = (dateInput) => {
  try {
    if (!dateInput) return null;
    
    // Handle Firestore Timestamp
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      const converted = dateInput.toDate();
      return isNaN(converted.getTime()) ? null : converted;
    }
    
    // Handle JavaScript Date
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    
    // Handle timestamp numbers or strings
    let date;
    if (typeof dateInput === 'number') {
      // If it's a very large number, it might be in milliseconds
      if (dateInput > 9999999999) {
        date = new Date(dateInput);
      } else {
        // If it's a smaller number, it might be in seconds
        date = new Date(dateInput * 1000);
      }
    } else {
      date = new Date(dateInput);
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Check for reasonable year range to catch obvious errors
    const year = date.getFullYear();
    if (year < 2020 || year > 2030) {
      console.warn(`Date year ${year} seems unreasonable, might be a conversion error`);
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Error converting date:', error);
    return null;
  }
};

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
  try {
    if (!date) return 'Date not available';
    
    let dateObj;
    if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firestore Timestamp
      dateObj = date.toDate();
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const defaultOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Date not available';
  }
};

/**
 * Format scheduled delivery time for display
 * @param {Date|string|number} scheduledDateTime - Scheduled date and time
 * @returns {string} Human-readable scheduled time
 */
export const formatScheduledTime = (scheduledDateTime) => {
  try {
    if (!scheduledDateTime) return 'Not scheduled';
    
    const scheduledDate = safeConvertToDate(scheduledDateTime);
    
    if (!scheduledDate) {
      return 'Invalid scheduled date';
    }
    
    const now = new Date();
    const diffMs = scheduledDate.getTime() - now.getTime();
    
    // Format the scheduled date nicely
    const formatScheduledDate = (date) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();
      
      if (isToday) {
        return `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } else if (isTomorrow) {
        return `Tomorrow at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };
    
    const formattedDate = formatScheduledDate(scheduledDate);
    
    // Calculate time remaining
    if (diffMs <= 0) {
      return `${formattedDate} (Ready for pickup)`;
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${formattedDate} (in ${diffDays} day${diffDays > 1 ? 's' : ''})`;
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes > 0) {
        return `${formattedDate} (in ${diffHours}h ${remainingMinutes}m)`;
      } else {
        return `${formattedDate} (in ${diffHours} hour${diffHours > 1 ? 's' : ''})`;
      }
    } else if (diffMinutes > 0) {
      return `${formattedDate} (in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''})`;
    } else {
      return `${formattedDate} (Starting soon)`;
    }
  } catch (error) {
    console.warn('Error formatting scheduled time:', error);
    return 'Scheduled delivery';
  }
};

/**
 * Check if a scheduled delivery is ready for activation
 * @param {Date|string|number} scheduledDateTime - Scheduled date and time
 * @param {number} bufferMinutes - Minutes before scheduled time to activate (default: 30)
 * @returns {boolean} Whether the delivery should be activated
 */
export const isScheduledDeliveryReady = (scheduledDateTime, bufferMinutes = 30) => {
  try {
    if (!scheduledDateTime) return false;
    
    const scheduledDate = safeConvertToDate(scheduledDateTime);
    
    if (!scheduledDate) {
      return false;
    }
    
    const now = new Date();
    const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
    
    // Activate if current time is within buffer time of scheduled time
    return now.getTime() >= (scheduledDate.getTime() - bufferTime);
  } catch (error) {
    console.warn('Error checking if scheduled delivery is ready:', error);
    return false;
  }
};

/**
 * Validate scheduling constraints
 * @param {Date|string|number} proposedDateTime - Proposed scheduling date/time
 * @returns {object} Validation result with isValid boolean and error message
 */
export const validateScheduleTime = (proposedDateTime) => {
  const proposedDate = new Date(proposedDateTime);
  const now = new Date();
  const minScheduleTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const maxScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  if (proposedDate <= minScheduleTime) {
    return {
      isValid: false,
      error: 'Delivery must be scheduled at least 1 hour from now'
    };
  }
  
  if (proposedDate >= maxScheduleTime) {
    return {
      isValid: false,
      error: 'Delivery cannot be scheduled more than 7 days in advance'
    };
  }
  
  // Check if it's during business hours (6 AM to 10 PM)
  const hours = proposedDate.getHours();
  if (hours < 6 || hours >= 22) {
    return {
      isValid: false,
      error: 'Deliveries can only be scheduled between 6:00 AM and 10:00 PM'
    };
  }
  
  return {
    isValid: true,
    error: null
  };
};

/**
 * Get delivery status display information
 * @param {string} status - Delivery status
 * @param {string} deliveryStatus - More specific delivery status
 * @param {Date|string|number} scheduledDateTime - Scheduled date/time for scheduled deliveries
 * @returns {object} Status display information
 */
export const getDeliveryStatusDisplay = (status, deliveryStatus, scheduledDateTime = null) => {
  // Handle scheduled deliveries
  if (status === 'scheduled' || deliveryStatus === 'scheduled') {
    const isReady = isScheduledDeliveryReady(scheduledDateTime);
    return {
      text: isReady ? 'Ready for pickup - Searching for driver' : formatScheduledTime(scheduledDateTime),
      color: isReady ? '#F59E0B' : '#3B82F6',
      icon: isReady ? 'search' : 'clock',
      isScheduled: true,
      isReady: isReady
    };
  }
  
  // Handle other statuses
  switch (deliveryStatus || status) {
    case 'accepted':
      return { text: 'Driver assigned - Coming to pickup', color: '#3B82F6', icon: 'car' };
    case 'collecting':
      return { text: 'Driver collecting package', color: '#F59E0B', icon: 'package' };
    case 'in_transit':
      return { text: 'Package in transit', color: '#10B981', icon: 'truck' };
    case 'delivered':
      return { text: 'Delivered', color: '#059669', icon: 'check-circle' };
    case 'cancelled':
      return { text: 'Cancelled', color: '#EF4444', icon: 'x-circle' };
    case 'searching':
      return { text: 'Searching for driver', color: '#F59E0B', icon: 'search' };
    default:
      return { text: 'Pending', color: '#6B7280', icon: 'clock' };
  }
}; 