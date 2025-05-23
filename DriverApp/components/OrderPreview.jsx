import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/init';
import { formatCurrency } from '../utils/helpers';
import LocationService from '../utils/LocationService';

const OrderPreview = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideRequest } = route.params || {};
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(rideRequest?.deliveryStatus || 'accepted');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [componentError, setComponentError] = useState(null);

  // Component mount logging
  useEffect(() => {
    console.log('🚛 OrderPreview component mounted');
    console.log('📦 Route params:', route.params);
    return () => {
      console.log('🚛 OrderPreview component unmounted');
    };
  }, []);

  // Debug logging to check packageDetails data
  useEffect(() => {
    try {
      if (rideRequest) {
        console.log('🔍 OrderPreview received rideRequest:', {
          id: rideRequest.id,
          packageDetails: rideRequest.packageDetails,
          pickupLocation: rideRequest.packageDetails?.pickupLocation,
          dropoffLocation: rideRequest.packageDetails?.dropoffLocation,
          deliveryStatus: rideRequest.deliveryStatus
        });
      } else {
        console.warn('⚠️ OrderPreview: No rideRequest data received');
      }
    } catch (error) {
      console.error('❌ Error in OrderPreview logging:', error);
      setComponentError(error.message);
    }
  }, [rideRequest]);

  // Error boundary for component
  useEffect(() => {
    if (componentError) {
      Alert.alert(
        'Component Error',
        'There was an issue loading the order details. Returning to home.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('DriverHome')
          }
        ]
      );
    }
  }, [componentError, navigation]);

  // Geocoding function
  const getGeocodingFromAddress = async (address) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      }
      return null;
    } catch (error) {
      console.error("Error in geocoding:", error);
      return null;
    }
  };

  // Update map location based on delivery status
  useEffect(() => {
    const updateMapLocation = async () => {
      const { packageDetails } = rideRequest || {};
      
      let targetAddress = null;
      
      // Determine which location to show based on delivery status
      if (deliveryStatus === 'accepted' || deliveryStatus === 'collecting') {
        // Show pickup location before package is collected
        targetAddress = packageDetails?.pickupLocation;
      } else if (deliveryStatus === 'in_transit') {
        // Show dropoff location after package is collected
        targetAddress = packageDetails?.dropoffLocation;
      }
      
      if (targetAddress) {
        console.log('🗺️ Getting coordinates for:', targetAddress);
        const coords = await getGeocodingFromAddress(targetAddress);
        if (coords) {
          setCurrentLocation(coords);
          console.log('✅ Map coordinates set:', coords);
        } else {
          // Fallback to default location
          setCurrentLocation({ latitude: 6.9271, longitude: 79.8612 });
          console.log('⚠️ Using fallback coordinates');
        }
      }
    };

    if (rideRequest) {
      updateMapLocation();
    }
  }, [rideRequest, deliveryStatus]);

  // Listen for delivery status changes
  useEffect(() => {
    if (!rideRequest?.id) return;

    let unsubscribe = null;
    
    try {
      const rideRequestRef = doc(db, 'rideRequests', rideRequest.id);
      unsubscribe = onSnapshot(rideRequestRef, (doc) => {
        try {
          if (doc.exists()) {
            const data = doc.data();
            if (data.deliveryStatus) {
              setDeliveryStatus(data.deliveryStatus);
              console.log('📦 Delivery status updated in OrderPreview:', data.deliveryStatus);
            }
          }
        } catch (snapshotError) {
          console.error('❌ Error processing Firestore snapshot:', snapshotError);
        }
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
        setComponentError('Failed to listen for delivery updates');
      });
    } catch (error) {
      console.error('❌ Error setting up Firestore listener:', error);
      setComponentError('Failed to setup delivery tracking');
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('❌ Error unsubscribing from Firestore:', error);
        }
      }
    };
  }, [rideRequest?.id]);

  // If no ride request data, show error state
  if (!rideRequest) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Ionicons name="alert-circle-outline" size={64} color="gray" />
        <Text className="text-gray-600 text-lg mt-4">No delivery data found</Text>
        <TouchableOpacity 
          className="bg-blue-600 px-6 py-3 rounded-lg mt-4"
          onPress={() => navigation.navigate("DriverHome")}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { packageDetails, rideDetails, courierDetails } = rideRequest;

  // Get status display info
  const getStatusInfo = () => {
    switch (deliveryStatus) {
      case 'accepted':
        return {
          title: 'Proceed to Package Collection',
          message: 'Navigate to pickup location and collect the package',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: 'cube-outline'
        };
      case 'collecting':
        return {
          title: 'Collecting Package',
          message: 'Verify PIN with customer to collect package',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          icon: 'hand-left-outline'
        };
      case 'in_transit':
        return {
          title: 'Package Collected - In Transit',
          message: 'Proceed to delivery location to complete the delivery',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: 'car-outline'
        };
      default:
        return {
          title: 'Delivery Details',
          message: 'Review delivery information',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: 'information-circle-outline'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Calculate driver earnings (80% of ride price)
  const ridePrice = rideDetails?.price || 0;
  const driverEarnings = ridePrice * 0.8;

  // Handle delivery cancellation
  const handleCancelDelivery = () => {
    Alert.alert(
      "Cancel Delivery",
      "Are you sure you want to cancel this delivery? This action cannot be undone.",
      [
        {
          text: "No, Keep Delivery",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: showCancellationReasons
        }
      ]
    );
  };

  // Show cancellation reason options
  const showCancellationReasons = () => {
    Alert.alert(
      "Cancellation Reason",
      "Please select a reason for cancelling this delivery:",
      [
        { text: "Customer not available", onPress: () => cancelDeliveryWithReason("Customer not available") },
        { text: "Incorrect address", onPress: () => cancelDeliveryWithReason("Incorrect address") },
        { text: "Package damaged", onPress: () => cancelDeliveryWithReason("Package damaged") },
        { text: "Vehicle breakdown", onPress: () => cancelDeliveryWithReason("Vehicle breakdown") },
        { text: "Other issue", onPress: () => cancelDeliveryWithReason("Other issue") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // Handle package collection navigation
  const handleGoToCollection = () => {
    try {
      if (!rideRequest || !rideRequest.id) {
        Alert.alert('Error', 'Unable to navigate to collection. Missing delivery data.');
        return;
      }
      
      console.log('🚚 Navigating to PackageCollection for order:', rideRequest.id);
      navigation.navigate('PackageCollection', { rideRequest });
    } catch (error) {
      console.error('❌ Error navigating to PackageCollection:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to open package collection screen. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('DriverHome')
          }
        ]
      );
    }
  };

  // Cancel delivery with specific reason
  const cancelDeliveryWithReason = async (reason) => {
    try {
      setIsCancelling(true);
      console.log('🚫 Cancelling delivery:', rideRequest.id, 'Reason:', reason);

      // Update the ride request status to cancelled
      const requestRef = doc(db, 'rideRequests', rideRequest.id);
      await updateDoc(requestRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancellationReason: reason,
        cancelledBy: 'driver',
        driverCancellationReason: reason,
        updatedAt: serverTimestamp()
      });

      // Reset driver availability - make them available again
      if (rideRequest.driverId) {
        const driverRef = doc(db, 'drivers', rideRequest.driverId);
        await updateDoc(driverRef, {
          isAvailable: true, // Make driver available again
          currentRideId: null, // Clear current ride
          lastCancellationAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Driver availability reset after cancellation');
      }

      // Stop location tracking
      console.log('🛑 Stopping location tracking - delivery cancelled');
      await LocationService.stopTracking();

      // Show success message and navigate back
      Alert.alert(
        'Delivery Cancelled',
        `The delivery has been cancelled successfully.\nReason: ${reason}\n\nYou are now available for new delivery requests.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('DriverHome')
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error cancelling delivery:', error);
      Alert.alert('Error', 'Failed to cancel delivery. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle reschedule (placeholder for now)
  const handleReschedule = () => {
    Alert.alert(
      "Reschedule Delivery",
      "This feature will allow you to reschedule the delivery with the customer.",
      [
        { text: "OK" }
      ]
    );
  };

  return (
    <CrashProtectionWrapper navigation={navigation}>
      <View className="flex-1 w-full bg-white p-4">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity 
            className="rounded-full p-2 border-2 border-gray-200" 
            onPress={() => navigation.navigate("DriverHome")}
          >
            <Ionicons name="arrow-back" size={20} color="black" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-bold ml-2 text-center">Delivery Details</Text>
          
          {/* Cancel Button in Header */}
          <TouchableOpacity 
            className="bg-red-100 px-3 py-2 rounded-lg"
            onPress={handleCancelDelivery}
            disabled={isCancelling}
          >
            <Text className="text-red-600 text-sm font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Delivery Status Section */}
          <View className={`${statusInfo.bgColor} p-4 rounded-lg mb-4`}>
            <View className="flex-row items-center">
              <Ionicons name={statusInfo.icon} size={24} color="#4B5563" />
              <View className="ml-3 flex-1">
                <Text className="font-bold text-lg text-gray-800">{statusInfo.title}</Text>
                <Text className={`${statusInfo.color} mt-1`}>
                  {statusInfo.message}
                </Text>
              </View>
            </View>
          </View>

          {/* Destination Focus - Show pickup or dropoff based on status */}
          {deliveryStatus === 'accepted' && (
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <FontAwesome name="map-marker" size={20} color="blue" />
                    <Text className="font-bold text-lg ml-2 text-blue-800">Navigate to Pickup</Text>
                  </View>
                  <Text className="text-gray-700 mt-2">
                    {packageDetails?.pickupLocation || 'Pickup location not specified'}
                  </Text>
                </View>
                <TouchableOpacity 
                  className="bg-blue-600 px-4 py-2 rounded-lg ml-3"
                  onPress={() => {
                    const address = encodeURIComponent(packageDetails?.pickupLocation || '');
                    const { Linking } = require('react-native');
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
                  }}
                >
                  <FontAwesome name="map" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {deliveryStatus === 'in_transit' && (
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <FontAwesome name="map-marker" size={20} color="red" />
                    <Text className="font-bold text-lg ml-2 text-green-800">Navigate to Dropoff</Text>
                  </View>
                  <Text className="text-gray-700 mt-2">
                    {packageDetails?.dropoffLocation || 'Dropoff location not specified'}
                  </Text>
                </View>
                <TouchableOpacity 
                  className="bg-green-600 px-4 py-2 rounded-lg ml-3"
                  onPress={() => {
                    const address = encodeURIComponent(packageDetails?.dropoffLocation || '');
                    const { Linking } = require('react-native');
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
                  }}
                >
                  <FontAwesome name="map" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Package Details */}
          <View className="bg-gray-100 p-4 rounded-lg">
            <Text className="text-lg font-bold mb-2">Package Details</Text>
            <View className="flex-row justify-between">
              <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
                <Text className="text-gray-500 text-xs">Type</Text>
                <Text className="text-black font-bold">
                  {packageDetails?.shipmentType || 'Standard Package'}
                </Text>
              </View>
              <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
                <Text className="text-gray-500 text-xs">Weight</Text>
                <Text className="text-black font-bold">
                  {packageDetails?.weight ? `${packageDetails.weight} kg` : 'N/A'}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between mt-2">
              <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
                <Text className="text-gray-500 text-xs">Size</Text>
                <Text className="text-black font-bold">
                  {packageDetails?.length && packageDetails?.width && packageDetails?.height 
                    ? `${packageDetails.length}×${packageDetails.width}×${packageDetails.height}` 
                    : 'Medium'}
                </Text>
              </View>
              <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
                <Text className="text-gray-500 text-xs">Earnings</Text>
                <Text className="text-green-600 font-bold">
                  {formatCurrency(driverEarnings)}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Details */}
          <View className="mt-4 p-4 bg-white shadow-lg rounded-lg">
            <View className="flex-row items-center">
              <Image
                source={require("../assets/icon/package.png")}
                className="w-10 h-10 mr-2"
              />
              <View>
                <Text className="text-lg font-bold">
                  #{packageDetails?.trackingId || rideRequest.id.substring(0, 10)}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {deliveryStatus === 'accepted' ? 'In Progress' : deliveryStatus} | 
                  {rideRequest.acceptedAt ? 
                    ` ${new Date(rideRequest.acceptedAt.toMillis()).toLocaleDateString()}` :
                    ` ${new Date().toLocaleDateString()}`
                  }
                </Text>
              </View>
            </View>

            {/* Pickup & Delivery Locations */}
            <View className="mt-3">
              <View className="flex-row items-center">
                <FontAwesome name="map-marker" size={18} color="blue" />
                <Text className="text-gray-800 ml-2 flex-1" numberOfLines={2}>
                  From: {packageDetails?.pickupLocation || 'Pickup location not specified'}
                </Text>
              </View>

              <View className="flex-row items-center mt-2">
                <FontAwesome name="map-marker" size={18} color="red" />
                <Text className="text-gray-800 ml-2 flex-1" numberOfLines={2}>
                  To: {packageDetails?.dropoffLocation || 'Delivery location not specified'}
                </Text>
              </View>
            </View>

            {/* Contact Section */}
            <View className="flex-row items-center mt-3">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                <Ionicons name="person" size={20} color="#1E40AF" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold">
                  {packageDetails?.senderName || 'Customer'}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {packageDetails?.senderPhone || 'Contact number not provided'}
                </Text>
              </View>
              <View className="flex-row">
                {packageDetails?.senderPhone && (
                  <TouchableOpacity className="p-2">
                    <Ionicons name="call" size={24} color="blue" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  className="p-2 ml-2"
                  onPress={() => navigation.navigate('ChatList')}
                >
                  <Ionicons name="chatbubble-ellipses" size={24} color="blue" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Live Map Preview with Tracking Button */}
          <View className="mt-4 h-48 rounded-lg overflow-hidden relative">
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: currentLocation?.latitude || 6.9271,
                longitude: currentLocation?.longitude || 79.8612,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              region={currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              } : undefined}
            >
              {currentLocation && (
                <Marker 
                  coordinate={currentLocation} 
                  title={
                    deliveryStatus === 'accepted' || deliveryStatus === 'collecting'
                      ? "Pickup Location" 
                      : "Delivery Location"
                  }
                  pinColor={
                    deliveryStatus === 'accepted' || deliveryStatus === 'collecting'
                      ? "blue" 
                      : "red"
                  }
                />
              )}
            </MapView>
            <TouchableOpacity 
              className="absolute bottom-4 left-4 bg-blue-800 px-4 py-4 rounded-[20px] flex-row items-center"
              onPress={() => navigation.navigate('LiveTrack', { rideRequest })}
            >
              <Ionicons name="radio-outline" size={18} color="white" />
              <Text className="text-white font-bold ml-2">Live Tracking</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="mt-6 space-y-3">
            {/* Status-based Action Buttons */}
            {deliveryStatus === 'accepted' && (
              <TouchableOpacity 
                className="bg-blue-600 p-4 rounded-[20px] flex-row items-center justify-center"
                onPress={handleGoToCollection}
              >
                <Ionicons name="cube" size={20} color="white" />
                <Text className="text-white text-center font-bold ml-2">Go to Package Collection</Text>
              </TouchableOpacity>
            )}

            {deliveryStatus === 'in_transit' && (
              <>
                {/* Continue to Proof of Delivery */}
                <TouchableOpacity 
                  className="bg-green-600 p-4 rounded-[20px] flex-row items-center justify-center"
                  onPress={() => navigation.navigate('ProofOfDeliver', { rideRequest })}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white text-center font-bold ml-2">Complete Delivery</Text>
                </TouchableOpacity>

                {/* Live Tracking Button for In Transit */}
                <TouchableOpacity 
                  className="bg-blue-800 p-4 rounded-[20px] flex-row items-center justify-center"
                  onPress={() => navigation.navigate('LiveTrack', { rideRequest })}
                >
                  <Ionicons name="radio-outline" size={20} color="white" />
                  <Text className="text-white text-center font-bold ml-2">Live Tracking</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Reschedule Button - available for all statuses except completed */}
            {deliveryStatus !== 'delivered' && (
              <TouchableOpacity 
                className="bg-orange-600 p-4 rounded-[20px] flex-row items-center justify-center"
                onPress={handleReschedule}
                disabled={isRescheduling}
              >
                <Ionicons name="calendar" size={20} color="white" />
                <Text className="text-white text-center font-bold ml-2">Reschedule</Text>
              </TouchableOpacity>
            )}

            {/* Cancel Delivery Button - available for all statuses except completed */}
            {deliveryStatus !== 'delivered' && (
              <TouchableOpacity 
                className="bg-red-600 p-4 rounded-[20px] flex-row items-center justify-center"
                onPress={handleCancelDelivery}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="white" />
                )}
                <Text className="text-white text-center font-bold ml-2">
                  {isCancelling ? 'Cancelling...' : 'Cancel Delivery'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Warning Note */}
          <View className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={20} color="#D97706" />
              <View className="ml-2 flex-1">
                <Text className="text-yellow-800 font-medium text-sm">Important Note</Text>
                <Text className="text-yellow-700 text-sm mt-1">
                  Cancelling a delivery will make you available for new requests. 
                  Please ensure you have a valid reason before cancelling.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </CrashProtectionWrapper>
  );
};

// Error boundary component to catch crashes
const CrashProtectionWrapper = ({ children, navigation }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Log the error normally
      originalError(...args);
      
      // Check if it's a critical error that might cause a crash
      const errorString = args.join(' ');
      if (errorString.includes('ReferenceError') || 
          errorString.includes('TypeError') || 
          errorString.includes('Cannot read property') ||
          errorString.includes('undefined is not an object')) {
        setHasError(true);
        setErrorMessage(errorString.substring(0, 200));
      }
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  if (hasError) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-4">
        <Ionicons name="alert-circle-outline" size={64} color="red" />
        <Text className="text-red-600 text-lg font-bold mt-4 text-center">
          Component Error Detected
        </Text>
        <Text className="text-gray-600 text-sm mt-2 text-center">
          {errorMessage}
        </Text>
        <TouchableOpacity 
          className="bg-blue-600 px-6 py-3 rounded-lg mt-4"
          onPress={() => {
            setHasError(false);
            navigation.navigate('DriverHome');
          }}
        >
          <Text className="text-white font-medium">Return to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="bg-gray-400 px-6 py-3 rounded-lg mt-2"
          onPress={() => {
            setHasError(false);
            setErrorMessage('');
          }}
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
};

export default OrderPreview;
