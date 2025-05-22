import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/init';

const SearchingDrivers = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { packageDetails, courierDetails, selectedCourier, rideDetails, distance, duration } = route.params || {};
  
  const [searchTime, setSearchTime] = useState(0);
  const [searchStatus, setSearchStatus] = useState('Searching for nearby drivers...');
  const [rideRequestId, setRideRequestId] = useState(null);
  const [foundDriver, setFoundDriver] = useState(null);
  const [rideStatusListener, setRideStatusListener] = useState(null);
  const pulseAnim = new Animated.Value(1);

  // Start the pulsing animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Create ride request in Firestore
  useEffect(() => {
    const createRideRequest = async () => {
      try {
        console.log('Creating ride request with parameters:', { 
          selectedCourier, 
          vehicleType: rideDetails?.vehicleType,
          packageDetails: !!packageDetails,
          courierDetails: !!courierDetails 
        });

        // Create a new ride request document
        const requestData = {
          packageDetails,
          courierDetails,
          selectedCourier,
          rideDetails,
          distance,
          duration,
          status: 'searching',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        console.log('🚀 CREATING RIDE REQUEST with exact data:', {
          selectedCourier: requestData.selectedCourier,
          vehicleType: requestData.rideDetails?.vehicleType,
          status: requestData.status,
          fullRideDetails: requestData.rideDetails
        });
        
        const requestRef = await addDoc(collection(db, 'rideRequests'), requestData);
        const newRideRequestId = requestRef.id;
        console.log('✅ Ride request created with ID:', newRideRequestId);
        setRideRequestId(newRideRequestId);
        
        // Start searching for drivers
        searchForDrivers(newRideRequestId);
      } catch (error) {
        console.error('Error creating ride request:', error);
        setSearchStatus('Error finding drivers. Please try again.');
      }
    };

    if (packageDetails && courierDetails && selectedCourier && rideDetails) {
      createRideRequest();
    }
  }, [packageDetails, courierDetails, selectedCourier, rideDetails]);

  // Update search timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime(prev => {
        // If we've been searching for more than 60 seconds, give an option to cancel
        if (prev >= 60 && searchStatus === 'Searching for nearby drivers...') {
          setSearchStatus('Taking longer than usual. Keep waiting or cancel?');
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchStatus]);

  // Cleanup listeners when component unmounts
  useEffect(() => {
    return () => {
      if (rideStatusListener) {
        console.log('Cleaning up ride status listener');
        rideStatusListener();
      }
    };
  }, [rideStatusListener]);

  // Function to search for available drivers
  const searchForDrivers = async (requestId) => {
    try {
      // Validate required parameters
      if (!selectedCourier || !rideDetails?.vehicleType) {
        console.error('Missing required parameters for driver search:', { selectedCourier, vehicleType: rideDetails?.vehicleType });
        setSearchStatus('Error: Missing search parameters. Please try again.');
        return;
      }

      console.log('Searching for drivers with criteria:', { 
        courierId: selectedCourier, 
        vehicleType: rideDetails.vehicleType 
      });

      // Query for available drivers matching the criteria
      const driversQuery = query(
        collection(db, 'drivers'),
        where('courierId', '==', selectedCourier),
        where('vehicleType', '==', rideDetails.vehicleType),
        where('status', '==', 'approved'),
        where('isOnline', '==', true),
        where('isAvailable', '==', true)
      );
      
      const querySnapshot = await getDocs(driversQuery);
      
      if (querySnapshot.empty) {
        // No drivers available
        setSearchStatus('No drivers available right now. Please try again later.');
        return;
      }
      
      // Show that drivers are available and wait for one to accept
      const availableDriversCount = querySnapshot.docs.length;
      setSearchStatus(`Found ${availableDriversCount} available driver${availableDriversCount > 1 ? 's' : ''}. Waiting for acceptance...`);
      
      // Listen for ride request status changes (when a driver accepts)
      console.log('Setting up ride request listener for ID:', requestId);
      
      // Clean up any existing listener first
      if (rideStatusListener) {
        console.log('Cleaning up previous listener before creating a new one');
        rideStatusListener();
        setRideStatusListener(null);
      }
      
      const rideRequestRef = doc(db, 'rideRequests', requestId);
      const unsubscribe = onSnapshot(rideRequestRef, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.error('🚫 Ride request document does not exist anymore');
          return;
        }
        
        const data = docSnapshot.data();
        console.log('🚩 Ride request update received:', {
          id: docSnapshot.id,
          status: data.status,
          driverId: data.driverId || 'none',
          timestamp: new Date().toLocaleTimeString()
        });
        
        if (data.status === 'accepted' && data.driverId) {
          // A driver has accepted the request
          console.log('🎉 Driver accepted the ride request:', data.driverName || data.driverId);
          
          try {
            // Get fresh driver data directly from Firestore
            const driverDoc = await getDoc(doc(db, 'drivers', data.driverId));
            
            if (driverDoc.exists()) {
              const driverData = {
                id: data.driverId,
                ...driverDoc.data(),
                // Include additional data from the ride request
                phoneNumber: data.driverPhone,
                vehicleNumber: data.vehicleNumber
              };
              
              console.log('🚕 Found driver details:', driverData.fullName);
              setFoundDriver(driverData);
              setSearchStatus('Driver found! Redirecting...');
              
              // Navigate to RiderConfirmed with the accepted driver
              console.log('Navigating to RiderConfirmed screen with driver:', driverData.fullName);
              
              // Clean up the listener before navigation
              unsubscribe();
              setRideStatusListener(null);
              
              setTimeout(() => {
                navigation.replace('RiderConfirmed', {
                  packageDetails,
                  courierDetails,
                  rideDetails,
                  distance,
                  duration,
                  driver: driverData,
                  rideRequestId: requestId
                });
              }, 1000);
            } else {
              console.error('⚠️ Driver document not found despite acceptance');
              setSearchStatus('Driver found but details incomplete. Please wait...');
            }
          } catch (error) {
            console.error('❌ Error fetching driver details:', error);
            setSearchStatus('Connection issue. Please wait...');
          }
        } else {
          console.log('Waiting for driver acceptance, current status:', data.status);
        }
      }, (error) => {
        console.error('❌ Error listening to ride request updates:', error);
        setSearchStatus('Error monitoring request. Please try again.');
      });

      // Store the listener for cleanup
      setRideStatusListener(() => unsubscribe);
      
    } catch (error) {
      console.error('Error searching for drivers:', error);
      setSearchStatus('Error finding drivers. Please try again.');
    }
  };

  const handleCancel = () => {
    // Clean up any active listeners
    if (rideStatusListener) {
      console.log('Cancelling ride request - cleaning up listener');
      rideStatusListener();
      setRideStatusListener(null);
    }

    // If we have a ride request ID, update its status to cancelled
    if (rideRequestId) {
      try {
        const requestRef = doc(db, 'rideRequests', rideRequestId);
        updateDoc(requestRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp()
        });
        console.log('Ride request cancelled:', rideRequestId);
      } catch (error) {
        console.error('Error cancelling ride request:', error);
      }
    }
    
    navigation.goBack();
  };

  // Function to force check ride request status - useful for debugging stuck screens
  const forceCheckStatus = async () => {
    if (!rideRequestId) {
      console.log('No ride request ID to check');
      return;
    }
    
    try {
      console.log('🔍 Manually checking ride request status:', rideRequestId);
      const requestDoc = await getDoc(doc(db, 'rideRequests', rideRequestId));
      
      if (!requestDoc.exists()) {
        console.log('❌ Ride request document not found');
        return;
      }
      
      const data = requestDoc.data();
      console.log('📄 Current ride request status:', {
        id: rideRequestId,
        status: data.status,
        driverId: data.driverId || 'none',
      });
      
      if (data.status === 'accepted' && data.driverId) {
        console.log('🚨 Found accepted ride that wasn\'t processed! Handling now...');
        
        // Proceed as if this was detected by the listener
        const driverDoc = await getDoc(doc(db, 'drivers', data.driverId));
        
        if (driverDoc.exists()) {
          const driverData = {
            id: data.driverId,
            ...driverDoc.data(),
            phoneNumber: data.driverPhone,
            vehicleNumber: data.vehicleNumber
          };
          
          // Clean up the original listener
          if (rideStatusListener) {
            rideStatusListener();
            setRideStatusListener(null);
          }
          
          // Navigate to RiderConfirmed
          navigation.replace('RiderConfirmed', {
            packageDetails,
            courierDetails,
            rideDetails,
            distance,
            duration,
            driver: driverData,
            rideRequestId
          });
        }
      }
    } catch (error) {
      console.error('Error in manual status check:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Periodically check ride status in case listener fails
  useEffect(() => {
    let statusCheckInterval;
    
    if (rideRequestId) {
      statusCheckInterval = setInterval(() => {
        // Every 10 seconds, force a check of the ride status
        forceCheckStatus();
      }, 10000); // 10 seconds
    }
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [rideRequestId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finding Your Driver</Text>
      </View>
      
      <View style={styles.content}>
        <Animated.View style={[styles.pulseCircle, {
          transform: [{ scale: pulseAnim }]
        }]}>
          <Image 
            source={rideDetails.icon} 
            style={styles.vehicleIcon}
          />
        </Animated.View>
        
        <Text style={styles.searchTime}>{formatTime(searchTime)}</Text>
        <Text style={styles.searchStatus}>{searchStatus}</Text>
        
        <View style={styles.packageInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{packageDetails.packageName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{packageDetails.pickupLocation}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={20} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>{packageDetails.dropoffLocation}</Text>
          </View>
        </View>

        {/* Add a manual retry button for stuck screens */}
        <TouchableOpacity style={styles.retryButton} onPress={forceCheckStatus}>
          <Text style={styles.retryText}>Refresh Status</Text>
        </TouchableOpacity>
        
        {searchStatus.includes('Keep waiting') && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e6f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  vehicleIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  searchTime: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  searchStatus: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  packageInfo: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  retryButton: {
    backgroundColor: '#4a7aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 12,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  cancelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SearchingDrivers; 