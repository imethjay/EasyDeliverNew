import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/init';

const SearchingDrivers = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { packageDetails, courierDetails, selectedCourier, rideDetails, distance, duration } = route.params || {};
  
  const [searchTime, setSearchTime] = useState(0);
  const [searchStatus, setSearchStatus] = useState('Searching for nearby drivers...');
  const [rideRequestId, setRideRequestId] = useState(null);
  const [foundDriver, setFoundDriver] = useState(null);
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
        
        const requestRef = await addDoc(collection(db, 'rideRequests'), requestData);
        setRideRequestId(requestRef.id);
        
        // Start searching for drivers
        searchForDrivers(requestRef.id);
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
      
      // For demo purposes, we'll simulate finding a driver after a delay
      setTimeout(() => {
        // Select a random driver from the available ones
        const drivers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const selectedDriver = drivers[Math.floor(Math.random() * drivers.length)];
        setFoundDriver(selectedDriver);
        
        // Navigate to the RiderConfirmed screen
        navigation.replace('RiderConfirmed', {
          packageDetails,
          courierDetails,
          rideDetails,
          distance,
          duration,
          driver: selectedDriver
        });
      }, 5000); // Simulate 5 seconds of searching
      
    } catch (error) {
      console.error('Error searching for drivers:', error);
      setSearchStatus('Error finding drivers. Please try again.');
    }
  };

  const handleCancel = () => {
    // If we have a ride request ID, update its status to cancelled
    if (rideRequestId) {
      try {
        const requestRef = doc(db, 'rideRequests', rideRequestId);
        updateDoc(requestRef, {
          status: 'cancelled',
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error cancelling ride request:', error);
      }
    }
    
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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