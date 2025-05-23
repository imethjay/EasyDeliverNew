import { collection, doc, updateDoc, onSnapshot, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/init';

class DeliveryRequestManager {
  constructor() {
    this.notifiedRequests = new Set();
    this.activeListener = null;
    this.driver = null;
    this.onNewRequest = null;
    this.isListening = false;
  }

  // Initialize the manager with driver data
  initialize(driver, onNewRequestCallback) {
    this.driver = driver;
    this.onNewRequest = onNewRequestCallback;
    console.log('🎯 DeliveryRequestManager initialized for driver:', driver.id);
  }

  // Start listening for new requests
  startListening() {
    if (!this.driver || this.isListening) {
      console.log('❌ Cannot start listening - driver not set or already listening');
      return;
    }

    this.isListening = true;
    this.notifiedRequests.clear(); // Clear previous notifications
    
    console.log('🔄 Starting delivery request listener for driver:', {
      driverId: this.driver.id,
      courierId: this.driver.courierId,
      vehicleType: this.driver.vehicleType,
      isAvailable: this.driver.isAvailable
    });

    // Query for ride requests matching this driver's criteria
    const q = query(
      collection(db, 'rideRequests'),
      where('status', '==', 'searching'),
      where('selectedCourier', '==', this.driver.courierId),
      where('rideDetails.vehicleType', '==', this.driver.vehicleType)
    );

    this.activeListener = onSnapshot(q, (querySnapshot) => {
      console.log('📨 Received', querySnapshot.docs.length, 'matching requests');
      
      querySnapshot.docs.forEach(docSnapshot => {
        const requestData = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };

        this.processIncomingRequest(requestData);
      });
    }, (error) => {
      console.error('❌ Error in delivery requests listener:', error);
    });
  }

  // Stop listening for requests
  stopListening() {
    if (this.activeListener) {
      this.activeListener();
      this.activeListener = null;
    }
    this.isListening = false;
    this.notifiedRequests.clear();
    console.log('🛑 Stopped listening for delivery requests');
  }

  // Process an incoming request
  processIncomingRequest(requestData) {
    const requestId = requestData.id;

    // Check if we should show this request
    if (this.shouldNotifyDriver(requestData)) {
      console.log('🚨 NEW ELIGIBLE REQUEST:', {
        id: requestId,
        pickup: requestData.packageDetails?.pickupLocation,
        dropoff: requestData.packageDetails?.dropoffLocation
      });

      // Mark as notified to prevent duplicates
      this.notifiedRequests.add(requestId);
      
      // Trigger the callback to show the modal
      if (this.onNewRequest) {
        this.onNewRequest(requestData);
      }
    }
  }

  // Check if driver should be notified about this request
  shouldNotifyDriver(requestData) {
    const requestId = requestData.id;

    // 1. Already notified?
    if (this.notifiedRequests.has(requestId)) {
      console.log('🚫 Already notified:', requestId);
      return false;
    }

    // 2. Driver has active ride?
    if (this.driver.currentRideId) {
      console.log('🚫 Driver busy with ride:', this.driver.currentRideId);
      return false;
    }

    // 3. Driver available and online?
    if (!this.driver.isAvailable || !this.driver.isOnline) {
      console.log('🚫 Driver not available:', {
        isAvailable: this.driver.isAvailable,
        isOnline: this.driver.isOnline
      });
      return false;
    }

    // 4. Already declined by this driver?
    const declinedDrivers = requestData.declinedDrivers || [];
    const hasDeclined = declinedDrivers.some(decline => decline.driverId === this.driver.id);
    if (hasDeclined) {
      console.log('🚫 Driver already declined:', requestId);
      return false;
    }

    // 5. Request still searching?
    if (requestData.status !== 'searching') {
      console.log('🚫 Request not searching:', requestData.status);
      return false;
    }

    // 6. Request too old?
    const requestAge = Date.now() - (requestData.createdAt?.toMillis() || Date.now());
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    if (requestAge > maxAge) {
      console.log('🚫 Request too old:', requestId);
      return false;
    }

    // 7. Check distance feasibility (if location data available)
    if (this.driver.currentLocation && requestData.packageDetails?.pickupLocation) {
      // Could add distance checks here in the future
    }

    console.log('✅ Request eligible for notification:', requestId);
    return true;
  }

  // Update driver data (when driver state changes)
  updateDriver(updatedDriver) {
    this.driver = { ...this.driver, ...updatedDriver };
    console.log('🔄 Driver data updated:', {
      isAvailable: this.driver.isAvailable,
      isOnline: this.driver.isOnline,
      currentRideId: this.driver.currentRideId
    });
  }

  // Mark request as accepted (to prevent re-notification)
  markRequestAccepted(requestId) {
    this.notifiedRequests.add(requestId);
    console.log('✅ Request marked as accepted:', requestId);
  }

  // Mark request as declined (to prevent re-notification)
  markRequestDeclined(requestId) {
    this.notifiedRequests.add(requestId);
    console.log('❌ Request marked as declined:', requestId);
  }

  // Get current status
  getStatus() {
    return {
      isListening: this.isListening,
      notifiedCount: this.notifiedRequests.size,
      driverId: this.driver?.id,
      isAvailable: this.driver?.isAvailable
    };
  }

  // Reset all notifications (useful when going online/offline)
  resetNotifications() {
    this.notifiedRequests.clear();
    console.log('🔄 Notification history cleared');
  }
}

// Export a singleton instance
export default new DeliveryRequestManager(); 