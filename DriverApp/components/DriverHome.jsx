import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { auth, db } from '../firebase/init';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import DeliveryRequestModal from "./DeliveryRequestModal";
import LocationService from '../utils/LocationService';
import DeliveryRequestManager from '../utils/DeliveryRequestManager';

const DriverHome = () => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [trackingID, setTrackingID] = useState("");
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [currentShipment, setCurrentShipment] = useState(null);

  useEffect(() => {
    fetchDriverData();
    return () => {
      // Clean up the delivery request manager when component unmounts
      DeliveryRequestManager.stopListening();
    };
  }, []);

  // Handle new delivery request from the manager
  const handleNewDeliveryRequest = (requestData) => {
    console.log('🔔 New delivery request received in DriverHome:', requestData.id);
    
    // Only show modal if no modal is currently visible
    if (!showRequestModal) {
      setIncomingRequest(requestData);
      setShowRequestModal(true);
    } else {
      console.log('📱 Modal already visible, skipping request:', requestData.id);
    }
  };

  // Toggle driver availability and manage request listening
  useEffect(() => {
    if (!driver) return;

    const updateDriverStatus = async () => {
      try {
        // If going online, request location permissions first
        if (isOnline) {
          console.log('🟢 Driver going online - checking permissions...');
          const hasPermission = await LocationService.requestPermissions();
          if (!hasPermission) {
            Alert.alert(
              'Location Required', 
              'Location permission is required to go online and accept deliveries.',
              [{ text: 'OK' }]
            );
            setIsOnline(false);
            return;
          }
        }

        // Update driver status in Firebase
        const driverRef = doc(db, 'drivers', driver.id);
        const updatedDriver = {
          ...driver,
          isOnline,
          isAvailable: isOnline && !driver.currentRideId,
          lastUpdated: serverTimestamp()
        };

        await updateDoc(driverRef, {
          isOnline,
          isAvailable: isOnline && !driver.currentRideId,
          lastUpdated: serverTimestamp()
        });
        
        // Update local driver state
        setDriver(updatedDriver);
        
        // Manage delivery request listening based on driver status
        if (isOnline) {
          console.log('🔄 Driver is now online - starting request manager');
          DeliveryRequestManager.initialize(updatedDriver, handleNewDeliveryRequest);
          DeliveryRequestManager.startListening();

          // NEW: Auto-recovery for active deliveries without location tracking
          if (updatedDriver.currentRideId && !LocationService.getTrackingStatus().isTracking) {
            console.log('🔧 Auto-recovery: Driver has active delivery but no location tracking');
            console.log('📍 Starting location tracking for existing delivery:', updatedDriver.currentRideId);
            
            try {
              await LocationService.startTracking(updatedDriver.currentRideId, updatedDriver.id);
              console.log('✅ Auto-recovery successful: Location tracking started');
            } catch (error) {
              console.error('❌ Auto-recovery failed:', error);
              Alert.alert(
                'Location Tracking Issue',
                'Unable to start location tracking for your active delivery. Please check your location permissions and restart the app.',
                [{ text: 'OK' }]
              );
            }
          }
        } else {
          console.log('🔴 Driver going offline - stopping request manager');
          DeliveryRequestManager.stopListening();
          // Stop any active location tracking
          if (LocationService.getTrackingStatus().isTracking) {
            LocationService.stopTracking();
          }
        }
      } catch (error) {
        console.error('❌ Error updating driver status:', error);
        Alert.alert('Error', 'Failed to update your availability status');
      }
    };

    updateDriverStatus();
  }, [isOnline, driver?.id]);

  // Update delivery request manager when driver state changes
  useEffect(() => {
    if (driver && DeliveryRequestManager.getStatus().isListening) {
      DeliveryRequestManager.updateDriver(driver);
    }
  }, [driver]);

  const fetchDriverData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }

      // Query Firestore for driver data
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No driver record found');
        setDriver(null);
      } else {
        const driverData = querySnapshot.docs[0].data();
        const fullDriverData = {
          id: querySnapshot.docs[0].id,
          ...driverData
        };
        setDriver(fullDriverData);
        
        // Set online status based on stored value
        setIsOnline(driverData.isOnline || false);
        
        // Fetch real tracking history for this driver
        await fetchDriverDeliveryHistory(fullDriverData.id);
      }
    } catch (error) {
      console.error('❌ Error fetching driver data:', error);
      Alert.alert('Error', 'Failed to load your profile data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch driver's delivery history from Firebase
  const fetchDriverDeliveryHistory = async (driverId) => {
    try {
      console.log('📊 Fetching delivery history for driver:', driverId);
      
      // Query for completed and accepted deliveries for this driver
      const deliveriesQuery = query(
        collection(db, 'rideRequests'),
        where('driverId', '==', driverId)
      );
      
      const querySnapshot = await getDocs(deliveriesQuery);
      const deliveries = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        deliveries.push({
          id: doc.id,
          ...data,
          item: data.packageDetails?.packageName || 'Package',
          from: data.packageDetails?.pickupLocation || 'Unknown',
          to: data.packageDetails?.dropoffLocation || 'Unknown',
          trackingId: data.packageDetails?.trackingId || doc.id.substring(0, 8),
          status: getDeliveryStatusLabel(data.status),
          image: require("../assets/icon/package.png"),
          timestamp: data.acceptedAt || data.createdAt
        });
      });
      
      // Sort by timestamp (most recent first)
      deliveries.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });
      
      // Take only the last 5 deliveries for history
      setTrackingHistory(deliveries.slice(0, 5));
      
      console.log('✅ Loaded', deliveries.length, 'delivery records');
      
    } catch (error) {
      console.error('❌ Error fetching delivery history:', error);
      // Set empty array on error
      setTrackingHistory([]);
    }
  };

  // Helper function to get user-friendly status labels
  const getDeliveryStatusLabel = (status) => {
    switch (status) {
      case 'searching':
        return 'Searching for Driver';
      case 'accepted':
        return 'In Transit';
      case 'completed':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  // Fetch current active shipment details with validation
  const getCurrentShipment = async () => {
    if (!driver || !driver.currentRideId) {
      return null;
    }

    try {
      // First, try to find the current ride in tracking history
      const currentRide = trackingHistory.find(item => item.id === driver.currentRideId);
      
      if (currentRide) {
        return {
          item: currentRide.item,
          trackingId: currentRide.trackingId,
          from: currentRide.from,
          to: currentRide.to,
          status: 'In Transit',
          rideData: {
            id: currentRide.id,
            ...currentRide
          }
        };
      }

      // If not found in history, check if the ride request actually exists in the database
      console.log('🔍 Checking if current ride request exists:', driver.currentRideId);
      const requestQuery = query(
        collection(db, 'rideRequests'),
        where('__name__', '==', driver.currentRideId)
      );
      
      const requestSnapshot = await getDocs(requestQuery);
      
      if (requestSnapshot.empty) {
        // The ride request doesn't exist anymore, clear the currentRideId
        console.log('🚫 Current ride request not found in database, clearing currentRideId');
        const driverRef = doc(db, 'drivers', driver.id);
        await updateDoc(driverRef, {
          currentRideId: null,
          isAvailable: true,
          updatedAt: serverTimestamp()
        });
        
        // Update local state
        setDriver(prevDriver => ({
          ...prevDriver,
          currentRideId: null,
          isAvailable: true
        }));
        
        return null;
      }

      // If the request exists but not in history yet, return the real data
      const requestData = requestSnapshot.docs[0].data();
      
      // Validate that this request is actually assigned to this driver and still active
      if (requestData.driverId !== driver.id || !['accepted', 'searching'].includes(requestData.status)) {
        console.log('🚫 Ride request is not assigned to this driver or not active, clearing currentRideId');
        const driverRef = doc(db, 'drivers', driver.id);
        await updateDoc(driverRef, {
          currentRideId: null,
          isAvailable: true,
          updatedAt: serverTimestamp()
        });
        
        setDriver(prevDriver => ({
          ...prevDriver,
          currentRideId: null,
          isAvailable: true
        }));
        
        return null;
      }

      return {
        item: requestData.packageDetails?.packageName || 'Package',
        trackingId: requestData.packageDetails?.trackingId || driver.currentRideId.substring(0, 8),
        from: requestData.packageDetails?.pickupLocation || 'Pickup Location',
        to: requestData.packageDetails?.dropoffLocation || 'Delivery Location',
        status: 'In Transit',
        rideData: {
          id: driver.currentRideId,
          ...requestData
        }
      };
    } catch (error) {
      console.error('❌ Error checking current ride request:', error);
      // On error, clear the currentRideId to avoid showing invalid data
      try {
        const driverRef = doc(db, 'drivers', driver.id);
        await updateDoc(driverRef, {
          currentRideId: null,
          isAvailable: true,
          updatedAt: serverTimestamp()
        });
        
        setDriver(prevDriver => ({
          ...prevDriver,
          currentRideId: null,
          isAvailable: true
        }));
      } catch (updateError) {
        console.error('❌ Error clearing currentRideId:', updateError);
      }
      
      return null;
    }
  };

  // Update current shipment when driver or tracking history changes
  useEffect(() => {
    const updateCurrentShipment = async () => {
      if (driver) {
        const shipment = await getCurrentShipment();
        setCurrentShipment(shipment);
      } else {
        setCurrentShipment(null);
      }
    };

    updateCurrentShipment();
  }, [driver, trackingHistory]);

  const handleLogout = async () => {
    try {
      // Stop listening for requests before logout
      DeliveryRequestManager.stopListening();
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const clearSearch = () => {
    setTrackingID("");
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      console.log('🤝 Driver accepting request:', incomingRequest.id);
      
      // Mark request as accepted in the manager first
      DeliveryRequestManager.markRequestAccepted(incomingRequest.id);
      
      // Check if the request is still available (not already accepted by another driver)
      const requestSnapshot = await getDocs(query(
        collection(db, 'rideRequests'),
        where('__name__', '==', incomingRequest.id),
        where('status', '==', 'searching')
      ));
      
      if (requestSnapshot.empty) {
        Alert.alert('Request Unavailable', 'This delivery request has already been accepted by another driver.');
        setShowRequestModal(false);
        setIncomingRequest(null);
        return;
      }
      
      // Update the ride request status to accepted
      const requestRef = doc(db, 'rideRequests', incomingRequest.id);
      await updateDoc(requestRef, {
        status: 'accepted',
        driverId: driver.id,
        driverName: driver.fullName,
        driverPhone: driver.phoneNumber || '',
        vehicleNumber: driver.vehicleNumber,
        acceptedAt: serverTimestamp(),
        deliveryStatus: 'accepted', // Initialize delivery status
        updatedAt: serverTimestamp()
      });
      
      // Update driver availability - mark as busy with current ride
      const driverRef = doc(db, 'drivers', driver.id);
      const updatedDriverData = {
        isAvailable: false,
        currentRideId: incomingRequest.id,
        lastRideAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(driverRef, updatedDriverData);
      
      // Update local driver state
      const newDriverState = {
        ...driver,
        isAvailable: false,
        currentRideId: incomingRequest.id
      };
      setDriver(newDriverState);
      
      // Update the delivery request manager with new driver state
      DeliveryRequestManager.updateDriver(newDriverState);
      
      // Start location tracking for real-time driver tracking
      console.log('🗺️ Starting location tracking for accepted trip');
      await LocationService.startTracking(incomingRequest.id, driver.id);
      
      // Capture the request data before clearing state
      const requestDataForNavigation = { ...incomingRequest };
      
      // Close the modal first
      setShowRequestModal(false);
      setIncomingRequest(null);
      
      // Navigate to PackageCollection screen first (NEW FLOW)
      setTimeout(() => {
        navigation.navigate('PackageCollection', { rideRequest: requestDataForNavigation });
      }, 500);
      
      console.log('✅ Request accepted successfully:', incomingRequest.id);
      
    } catch (error) {
      console.error('❌ Error accepting ride request:', error);
      Alert.alert('Error', 'Failed to accept the delivery request. Please try again.');
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      console.log('❌ Driver declining request:', incomingRequest.id);
      
      // Mark request as declined in the manager first
      DeliveryRequestManager.markRequestDeclined(incomingRequest.id);
      
      // Update the ride request with decline info
      const requestRef = doc(db, 'rideRequests', incomingRequest.id);
      await updateDoc(requestRef, {
        declinedDrivers: arrayUnion({
          driverId: driver.id,
          driverName: driver.fullName,
          declinedAt: new Date()
        }),
        updatedAt: serverTimestamp()
      });
      
      // Update driver's last decline time for rate limiting
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        lastDeclineAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Close the modal and clear the request
      setShowRequestModal(false);
      setIncomingRequest(null);
      
      console.log('✅ Request declined successfully:', incomingRequest.id);
      
    } catch (error) {
      console.error('❌ Error declining ride request:', error);
      Alert.alert('Error', 'Failed to decline the request. Please try again.');
    }
  };

  const menuItems = [
    { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
    { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
    { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
    { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
  ];

  // Handle navigation for bottom nav items
  const handleNavigation = (screenName) => {
    setActiveTab(screenName);
    
    switch (screenName) {
      case "Home":
        // Already on home, do nothing
        break;
      case "Delivery":
        navigation.navigate("MyOrder");
        break;
      case "Notifications":
        navigation.navigate("ChatList");
        break;
      case "Account":
        navigation.navigate("Profile");
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="mt-4 text-gray-600">Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 w-full bg-gray-100">
      {/* Delivery Request Modal */}
      <DeliveryRequestModal 
        visible={showRequestModal}
        rideRequest={incomingRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />
      
      {/* Header Section */}
      <View
        className="rounded-b-3xl px-6"
        style={{
          backgroundColor: "#1E40AF",
          paddingBottom: hp("5%"),
        }}
      >
        <View className="flex-row justify-between items-center" style={{ marginTop: hp("5%") }}>
          <View>
            <Text
              className="text-white font-bold"
              style={{
                fontSize: width < 400 ? wp("6%") : wp("5%"),
              }}
            >
              {driver ? `Hello, ${driver.fullName.split(' ')[0]}!` : 'Welcome!'}
            </Text>
            <Text
              className="text-white"
              style={{
                fontSize: wp("4%"),
                marginTop: hp("1%"),
              }}
            >
              {driver && driver.status === 'pending' 
                ? '⏳ Account pending approval' 
                : driver && driver.status === 'approved'
                ? '✅ Account approved' 
                : driver && driver.status === 'suspended'
                ? '⚠️ Account suspended'
                : ''}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white font-bold">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-full px-4 py-2 mt-4">
          <Image
            source={require("../assets/icon/search.png")}
            style={{ width: 25, height: 25, tintColor: "gray" }}
            resizeMode="contain"
          />
          <TextInput
            placeholder="Enter Tracking ID"
            className="flex-1 text-base outline-none"
            style={{ fontSize: wp("4%") }}
            value={trackingID}
            onChangeText={setTrackingID}
          />
        
          <TouchableOpacity onPress={clearSearch} className="p-2">
            <Image source={require("../assets/icon/close.png")} style={{ width: 25, height: 25, tintColor: "gray" }} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: hp("10%") }}>
        {/* Online Status Toggle */}
        {driver && driver.status === 'approved' && (
          <View className="mx-6 mt-6 bg-white rounded-xl p-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-lg font-semibold">Available for Deliveries</Text>
                <Text className="text-gray-500">
                  {isOnline ? 'You are online and can receive delivery requests' : 'Go online to receive delivery requests'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#4ade80" }}
                thumbColor={isOnline ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setIsOnline}
                value={isOnline}
              />
            </View>

            {/* Location Tracking Status */}
            {isOnline && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className={`w-2 h-2 rounded-full mr-2 ${
                      LocationService.getTrackingStatus().isTracking ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <Text className="text-sm text-gray-600">
                      Location Tracking: {LocationService.getTrackingStatus().isTracking ? 'Active' : 'Waiting for delivery'}
                    </Text>
                  </View>
                  
                  {/* Manual Recovery Button */}
                  {driver?.currentRideId && !LocationService.getTrackingStatus().isTracking && (
                    <TouchableOpacity 
                      className="bg-orange-500 px-3 py-1 rounded-lg"
                      onPress={async () => {
                        console.log('🔧 Manual location tracking restart requested');
                        try {
                          await LocationService.startTracking(driver.currentRideId, driver.id);
                          Alert.alert('Success', 'Location tracking has been restarted');
                        } catch (error) {
                          console.error('❌ Manual restart failed:', error);
                          Alert.alert('Error', 'Failed to restart location tracking. Please check your location permissions.');
                        }
                      }}
                    >
                      <Text className="text-white text-xs font-medium">Fix Tracking</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {LocationService.getTrackingStatus().isTracking && (
                  <Text className="text-xs text-green-600 mt-1">
                    📍 Your location is being shared with customers
                  </Text>
                )}
                
                {driver?.currentRideId && !LocationService.getTrackingStatus().isTracking && (
                  <Text className="text-xs text-orange-600 mt-1">
                    ⚠️ Active delivery detected but location tracking is off
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
        
        {/* Debug section removed */}

        {/* Driver Info Card */}
        {driver && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2">Driver Information</Text>
              <View className="flex-row items-center mb-2">
                <Text className="font-medium w-24">Vehicle:</Text>
                <Text>{driver.vehicleType} ({driver.vehicleNumber})</Text>
              </View>
              {driver.courierName && (
                <View className="flex-row items-center mb-2">
                  <Text className="font-medium w-24">Company:</Text>
                  <Text>{driver.courierName}</Text>
                </View>
              )}
              <View className="flex-row items-center">
                <Text className="font-medium w-24">Status:</Text>
                <View className={`px-2 py-1 rounded-full ${
                  driver.status === 'approved' ? 'bg-green-100' : 
                  driver.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Text className={`${
                    driver.status === 'approved' ? 'text-green-800' : 
                    driver.status === 'pending' ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {driver.status === 'approved' ? 'Approved' : 
                     driver.status === 'pending' ? 'Pending Approval' : 'Suspended'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row justify-around mt-6">
          <TouchableOpacity className="items-center" onPress={() => navigation.navigate("MyOrder")}>
            <View
              className="p-4"
              style={{
                backgroundColor: "#1e40af",
                borderRadius: wp("50%"),
                width: wp("16%"),
                height: wp("16%"),
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/icon/orders.png")}
                style={{ width: 30, height: 30, tintColor: "white" }}
                resizeMode="contain"
              />
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              My Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={() => navigation.navigate("StatsPage")}>
            <View
              className="p-4"
              style={{
                backgroundColor: "#1e40af",
                borderRadius: wp("50%"),
                width: wp("16%"),
                height: wp("16%"),
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/icon/history.png")}
                style={{ width: 30, height: 30, tintColor: "white" }}
                resizeMode="contain"
              />
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>

        {/* Only show if driver is approved */}
        {driver && driver.status === 'approved' && (
          <>
            {/* Current Shipment Section */}
            <View className="px-6 mt-8">
              <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>
                Current Shipment
              </Text>
              {(() => {
                if (currentShipment) {
                  return (
                    <View className="bg-white rounded-xl p-4 shadow-sm">
                      <View className="flex-row items-center mb-4">
                        <View
                          className="bg-blue-100 rounded-full"
                          style={{
                            width: wp("14%"),
                            height: wp("14%"),
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Image
                            source={require("../assets/icon/package.png")}
                            style={{ width: 35, height: 35, tintColor: "#1E40AF" }}
                            resizeMode="contain"
                          />
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="font-semibold text-base" style={{ fontSize: wp("4%") }}>
                            {currentShipment.item}
                          </Text>
                          <Text className="text-gray-500 text-sm" style={{ fontSize: wp("3.5%") }}>
                            #Tracking ID: {currentShipment.trackingId}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          className="bg-blue-600 px-3 py-2 rounded-lg"
                          onPress={() => navigation.navigate('OrderPreview', { 
                            rideRequest: currentShipment.rideData 
                          })}
                        >
                          <Text className="text-white text-sm font-medium">View</Text>
                        </TouchableOpacity>
                      </View>
                      <Text className="text-gray-600" style={{ fontSize: wp("3.8%") }}>
                        <Text className="font-semibold">From: </Text>
                        {currentShipment.from.length > 30 ? 
                          `${currentShipment.from.substring(0, 30)}...` : 
                          currentShipment.from}
                      </Text>
                      <Text className="text-gray-600 mb-2" style={{ fontSize: wp("3.8%") }}>
                        <Text className="font-semibold">To: </Text>
                        {currentShipment.to.length > 30 ? 
                          `${currentShipment.to.substring(0, 30)}...` : 
                          currentShipment.to}
                      </Text>
                      <View className="flex-row justify-between items-center">
                        <Text className="text-blue-600 font-medium" style={{ fontSize: wp("4%") }}>
                          Status: {currentShipment.status}
                        </Text>
                        <TouchableOpacity 
                          className="bg-red-100 px-3 py-1 rounded-lg"
                          onPress={() => navigation.navigate('OrderPreview', { 
                            rideRequest: currentShipment.rideData 
                          })}
                        >
                          <Text className="text-red-600 text-xs font-medium">Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                } else {
                  return (
                    <View className="bg-gray-50 rounded-xl p-4 shadow-sm">
                      <View className="flex-row items-center mb-2">
                        <View
                          className="bg-gray-200 rounded-full"
                          style={{
                            width: wp("14%"),
                            height: wp("14%"),
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Image
                            source={require("../assets/icon/package.png")}
                            style={{ width: 35, height: 35, tintColor: "#9CA3AF" }}
                            resizeMode="contain"
                          />
                        </View>
                        <View className="ml-4">
                          <Text className="font-semibold text-base text-gray-600" style={{ fontSize: wp("4%") }}>
                            No Active Deliveries
                          </Text>
                          <Text className="text-gray-500 text-sm" style={{ fontSize: wp("3.5%") }}>
                            You're available for new deliveries
                          </Text>
                        </View>
                      </View>
                      <Text className="text-gray-500 text-center mt-2" style={{ fontSize: wp("3.8%") }}>
                        {isOnline ? 
                          'Waiting for delivery requests...' : 
                          'Go online to start receiving delivery requests'
                        }
                      </Text>
                    </View>
                  );
                }
              })()}
            </View>

            {/* Tracking History */}
            <View className="px-6 mt-8">
              <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>
                Recent Deliveries
              </Text>
              {trackingHistory.length > 0 ? (
                trackingHistory.map((item, index) => (
                  <TouchableOpacity 
                    key={item.id} 
                    className="bg-white rounded-xl p-4 shadow-sm mb-4 flex-row items-center"
                    onPress={() => {
                      // Navigate to delivery details if it's current active delivery
                      if (driver.currentRideId === item.id) {
                        navigation.navigate('OrderPreview', { rideRequest: item });
                      }
                    }}
                  >
                    <View className="bg-gray-100 rounded-full p-2 mr-3">
                      <Image 
                        source={item.image} 
                        style={{ width: 25, height: 25 }} 
                        resizeMode="contain" 
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-base">{item.item}</Text>
                      <Text className="text-gray-500 text-sm">#{item.trackingId}</Text>
                      <Text className="text-gray-400 text-xs">
                        {item.from.substring(0, 20)}... → {item.to.substring(0, 20)}...
                      </Text>
                    </View>
                    <View className="items-end">
                      <View className={`px-2 py-1 rounded-full ${
                        item.status === 'Delivered' ? 'bg-green-100' : 
                        item.status === 'In Transit' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Text className={`text-xs font-medium ${
                          item.status === 'Delivered' ? 'text-green-800' : 
                          item.status === 'In Transit' ? 'text-blue-800' : 'text-gray-800'
                        }`}>
                          {item.status}
                        </Text>
                      </View>
                      {driver.currentRideId === item.id && (
                        <Text className="text-blue-600 text-xs mt-1 font-medium">Active</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className="bg-gray-50 rounded-xl p-4 shadow-sm">
                  <Text className="text-gray-500 text-center">
                    No delivery history yet
                  </Text>
                  <Text className="text-gray-400 text-center text-sm mt-1">
                    Complete your first delivery to see it here
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
        
        {/* Message for pending or suspended drivers */}
        {driver && driver.status === 'pending' && (
          <View className="px-6 mt-8">
            <View className="bg-yellow-50 rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2 text-yellow-800">Account Pending Approval</Text>
              <Text className="text-yellow-700">
                Your account is currently under review. You'll be able to accept deliveries once your account is approved.
                This typically takes 1-2 business days.
              </Text>
            </View>
          </View>
        )}
        
        {driver && driver.status === 'suspended' && (
          <View className="px-6 mt-8">
            <View className="bg-red-50 rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2 text-red-800">Account Suspended</Text>
              <Text className="text-red-700">
                Your account has been suspended. Please contact customer support or your courier company for more information.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        className="flex-row justify-between bg-white px-8 py-4 border-t border-gray-200"
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          backgroundColor: "white",
        }}
      >
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            className="items-center"
            onPress={() => handleNavigation(item.screen)}
          >
            <Image
              source={item.icon}
              style={{
                width: 24,
                height: 24,
                tintColor: activeTab === item.screen ? "blue" : "gray",
              }}
              resizeMode="contain"
            />
            <Text
              className={`text-sm ${
                activeTab === item.screen ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default DriverHome;
