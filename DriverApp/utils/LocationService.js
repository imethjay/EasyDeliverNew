import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase/init';

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.currentRideId = null;
    this.driverId = null;
  }

  // Request location permissions
  async requestPermissions() {
    try {
      console.log('Requesting location permissions...');
      
      // Request foreground permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Foreground permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permission to track your position for deliveries. This allows customers to see your real-time location during delivery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Grant Permission', 
              onPress: async () => {
                const retryStatus = await Location.requestForegroundPermissionsAsync();
                console.log('Retry permission status:', retryStatus.status);
              }
            }
          ]
        );
        return false;
      }

      // Request background permissions for continued tracking
      console.log('Requesting background location permission...');
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      console.log('Background permission status:', backgroundStatus.status);
      
      if (backgroundStatus.status !== 'granted') {
        Alert.alert(
          'Background Location Permission',
          'For the best customer experience, please allow location access "Always" in your device settings. This ensures customers can track your delivery progress even when the app is in the background.',
          [
            { text: 'Maybe Later' },
            { text: 'Open Settings', onPress: () => Location.requestBackgroundPermissionsAsync() }
          ]
        );
        // Continue with foreground permission only
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      Alert.alert('Permission Error', 'Failed to request location permissions. Please enable location services in your device settings.');
      return false;
    }
  }

  // Start tracking driver location
  async startTracking(rideId, driverId) {
    if (this.isTracking) {
      console.log('⚠️ Location tracking already active');
      return;
    }

    console.log('🚀 Starting location tracking process...', { rideId, driverId });

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('❌ Location permissions not granted');
      return;
    }

    try {
      this.currentRideId = rideId;
      this.driverId = driverId;
      this.isTracking = true;

      console.log('✅ Location tracking initiated for:', { rideId, driverId });

      // Start watching position with high accuracy
      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
          mayShowUserSettingsDialog: true, // Show settings dialog if needed
        },
        (location) => {
          console.log('📍 New location received:', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy
          });
          this.updateDriverLocation(location);
        }
      );

      // Set up automatic cleanup on disconnect
      const locationRef = ref(rtdb, `driverLocations/${rideId}/${driverId}`);
      onDisconnect(locationRef).remove();
      
      console.log('✅ Location tracking successfully started');

      // Test initial location update
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      this.updateDriverLocation(currentLocation);

    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Failed to start location tracking. Please ensure location services are enabled.');
      this.isTracking = false;
    }
  }

  // Update driver location in Firebase Realtime Database
  async updateDriverLocation(location) {
    if (!this.currentRideId || !this.driverId || !location) {
      console.log('Missing required data for location update:', {
        rideId: this.currentRideId,
        driverId: this.driverId,
        hasLocation: !!location
      });
      return;
    }

    try {
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || 0,
        speed: location.coords.speed || 0,
        accuracy: location.coords.accuracy || 0,
        timestamp: Date.now(),
        lastUpdated: serverTimestamp()
      };

      const locationRef = ref(rtdb, `driverLocations/${this.currentRideId}/${this.driverId}`);
      await set(locationRef, locationData);

      console.log('✅ Driver location updated successfully:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        rideId: this.currentRideId,
        driverId: this.driverId,
        accuracy: location.coords.accuracy
      });
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
      // Try to reconnect or handle Firebase issues
      if (error.code === 'permission-denied') {
        console.error('Firebase permission denied - check database rules');
        // Add useful warning
        console.warn('⚠️ Firebase realtime database rules need to be updated. Go to Firebase Console and set:');
        console.warn('"driverLocations": {');
        console.warn('  ".read": "auth != null",');
        console.warn('  ".write": "auth != null"');
        console.warn('}');
        
        // Try alternative - store in Firestore instead as fallback
        try {
          const { db } = require('../firebase/init');
          const { doc, updateDoc } = require('firebase/firestore');
          console.log('🔄 Trying alternative Firestore update as fallback');
          
          // Update the rideRequest with location
          const rideRequestRef = doc(db, 'rideRequests', this.currentRideId);
          await updateDoc(rideRequestRef, {
            currentDriverLocation: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              heading: location.coords.heading || 0,
              updatedAt: new Date().toISOString()
            }
          });
          console.log('✅ Driver location updated via Firestore instead');
        } catch (fbError) {
          console.error('❌ Firestore fallback failed:', fbError);
        }
      }
    }
  }

  // Stop tracking driver location
  async stopTracking() {
    if (!this.isTracking) {
      return;
    }

    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }

      // Remove location data from Firebase
      if (this.currentRideId && this.driverId) {
        const locationRef = ref(rtdb, `driverLocations/${this.currentRideId}/${this.driverId}`);
        await set(locationRef, null);
        console.log('Driver location tracking stopped and data cleared');
      }

      this.isTracking = false;
      this.currentRideId = null;
      this.driverId = null;
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  // Get current tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      rideId: this.currentRideId,
      driverId: this.driverId
    };
  }
}

// Export a singleton instance
export default new LocationService(); 