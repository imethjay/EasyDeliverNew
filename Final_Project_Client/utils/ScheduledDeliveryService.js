import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/init';
import { isScheduledDeliveryReady } from './helpers';

class ScheduledDeliveryService {
  constructor() {
    this.activeListeners = new Map();
    this.isRunning = false;
  }

  /**
   * Start monitoring scheduled deliveries for automatic activation
   * @param {string} customerId - User ID to monitor deliveries for
   */
  startMonitoring(customerId) {
    if (this.isRunning) {
      console.log('⚠️ Scheduled delivery monitoring already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting scheduled delivery monitoring for user:', customerId);

    // Query for scheduled deliveries for this customer
    const scheduledQuery = query(
      collection(db, 'rideRequests'),
      where('customerId', '==', customerId),
      where('status', '==', 'scheduled')
    );

    const unsubscribe = onSnapshot(scheduledQuery, (snapshot) => {
      console.log(`📋 Found ${snapshot.docs.length} scheduled deliveries`);
      
      snapshot.docs.forEach(docSnapshot => {
        const deliveryData = docSnapshot.data();
        const deliveryId = docSnapshot.id;
        
        if (deliveryData.scheduledDateTime) {
          this.checkAndActivateDelivery(deliveryId, deliveryData);
        }
      });
    });

    this.activeListeners.set(customerId, unsubscribe);
  }

  /**
   * Stop monitoring scheduled deliveries
   * @param {string} customerId - User ID to stop monitoring for
   */
  stopMonitoring(customerId) {
    const listener = this.activeListeners.get(customerId);
    if (listener) {
      listener();
      this.activeListeners.delete(customerId);
      console.log('🛑 Stopped scheduled delivery monitoring for user:', customerId);
    }
    
    if (this.activeListeners.size === 0) {
      this.isRunning = false;
    }
  }

  /**
   * Check if a scheduled delivery should be activated and activate it
   * @param {string} deliveryId - Delivery document ID
   * @param {object} deliveryData - Delivery data from Firestore
   */
  async checkAndActivateDelivery(deliveryId, deliveryData) {
    try {
      const { scheduledDateTime, scheduledTimestamp } = deliveryData;
      
      // Safely convert the scheduled time
      let scheduledTime = null;
      if (scheduledDateTime) {
        if (scheduledDateTime.toDate && typeof scheduledDateTime.toDate === 'function') {
          // Handle Firestore Timestamp
          scheduledTime = scheduledDateTime.toDate();
        } else {
          // Handle JavaScript Date or timestamp
          scheduledTime = new Date(scheduledDateTime);
        }
      } else if (scheduledTimestamp) {
        scheduledTime = new Date(scheduledTimestamp);
      }
      
      // Validate the scheduled time
      if (!scheduledTime || isNaN(scheduledTime.getTime())) {
        console.warn('Invalid scheduled time for delivery:', deliveryId);
        return;
      }
      
      if (isScheduledDeliveryReady(scheduledTime)) {
        console.log('⏰ Activating scheduled delivery:', deliveryId);
        await this.activateScheduledDelivery(deliveryId, deliveryData);
      } else {
        // Log when the delivery will be ready
        const now = new Date();
        const timeUntilActivation = Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`⏳ Delivery ${deliveryId} will be activated in ${timeUntilActivation} minutes`);
      }
    } catch (error) {
      console.error('❌ Error checking delivery activation:', deliveryId, error);
    }
  }

  /**
   * Activate a scheduled delivery by changing its status to searching
   * @param {string} deliveryId - Delivery document ID
   * @param {object} deliveryData - Delivery data from Firestore
   */
  async activateScheduledDelivery(deliveryId, deliveryData) {
    try {
      const deliveryRef = doc(db, 'rideRequests', deliveryId);
      
      const updateData = {
        status: 'searching',
        deliveryStatus: 'searching',
        activatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(deliveryRef, updateData);
      
      console.log('✅ Successfully activated scheduled delivery:', deliveryId);
      
      // TODO: Send notification to customer
      this.notifyCustomerOfActivation(deliveryData);
      
    } catch (error) {
      console.error('❌ Error activating scheduled delivery:', deliveryId, error);
    }
  }

  /**
   * Send notification to customer when their scheduled delivery is activated
   * @param {object} deliveryData - Delivery data
   */
  notifyCustomerOfActivation(deliveryData) {
    // This could integrate with push notifications, SMS, or email
    console.log('📢 Should notify customer that delivery is now active:', {
      packageName: deliveryData.packageDetails?.packageName,
      trackingId: deliveryData.packageDetails?.trackingId,
      scheduledTime: deliveryData.scheduledDateTime
    });
    
    // TODO: Implement actual notification system
    // Examples:
    // - Push notification: "Your scheduled delivery is now active and we're searching for a driver"
    // - SMS: "Your package [trackingId] pickup is starting now"
    // - Email: Send pickup notification email
  }

  /**
   * Get all scheduled deliveries for a customer
   * @param {string} customerId - User ID
   * @returns {Promise<Array>} Array of scheduled deliveries
   */
  async getScheduledDeliveries(customerId) {
    try {
      const scheduledQuery = query(
        collection(db, 'rideRequests'),
        where('customerId', '==', customerId),
        where('status', '==', 'scheduled')
      );
      
      const snapshot = await getDocs(scheduledQuery);
      const scheduledDeliveries = [];
      
      snapshot.forEach(doc => {
        scheduledDeliveries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return scheduledDeliveries;
    } catch (error) {
      console.error('❌ Error fetching scheduled deliveries:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled delivery
   * @param {string} deliveryId - Delivery document ID
   * @param {string} reason - Cancellation reason
   */
  async cancelScheduledDelivery(deliveryId, reason = 'Customer cancelled') {
    try {
      const deliveryRef = doc(db, 'rideRequests', deliveryId);
      
      await updateDoc(deliveryRef, {
        status: 'cancelled',
        deliveryStatus: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: reason,
        cancelledBy: 'customer',
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Successfully cancelled scheduled delivery:', deliveryId);
    } catch (error) {
      console.error('❌ Error cancelling scheduled delivery:', deliveryId, error);
      throw error;
    }
  }

  /**
   * Reschedule a delivery to a new time
   * @param {string} deliveryId - Delivery document ID
   * @param {Date} newDateTime - New scheduled date and time
   */
  async rescheduleDelivery(deliveryId, newDateTime) {
    try {
      const deliveryRef = doc(db, 'rideRequests', deliveryId);
      
      // First, get the current delivery data to check if it has a PIN
      const deliveryDoc = await getDoc(deliveryRef);
      const currentData = deliveryDoc.data();
      
      const updateData = {
        scheduledDateTime: newDateTime,
        scheduledTimestamp: newDateTime.getTime(),
        status: 'scheduled',
        deliveryStatus: 'scheduled',
        rescheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Ensure the delivery has a PIN - preserve existing or generate new one
      if (!currentData?.deliveryPin) {
        const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
        updateData.deliveryPin = deliveryPin;
        console.log('🔐 Generated new PIN for rescheduled delivery:', deliveryPin);
      } else {
        console.log('🔐 Preserving existing PIN for rescheduled delivery:', currentData.deliveryPin);
      }
      
      await updateDoc(deliveryRef, updateData);
      
      console.log('✅ Successfully rescheduled delivery:', deliveryId, 'to:', newDateTime);
    } catch (error) {
      console.error('❌ Error rescheduling delivery:', deliveryId, error);
      throw error;
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    this.activeListeners.forEach((unsubscribe, customerId) => {
      unsubscribe();
      console.log('🧹 Cleaned up listener for:', customerId);
    });
    
    this.activeListeners.clear();
    this.isRunning = false;
    console.log('🧹 Scheduled delivery service cleaned up');
  }
}

// Export a singleton instance
export default new ScheduledDeliveryService(); 