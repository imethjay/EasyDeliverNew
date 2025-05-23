import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/init';
import { formatCurrency } from '../utils/helpers';
import LocationService from '../utils/LocationService';

const OrderPreview = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideRequest } = route.params || {};
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

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
        {
          text: "Customer not available",
          onPress: () => cancelDeliveryWithReason("Customer not available")
        },
        {
          text: "Incorrect address",
          onPress: () => cancelDeliveryWithReason("Incorrect address")
        },
        {
          text: "Package damaged",
          onPress: () => cancelDeliveryWithReason("Package damaged")
        },
        {
          text: "Vehicle breakdown",
          onPress: () => cancelDeliveryWithReason("Vehicle breakdown")
        },
        {
          text: "Other issue",
          onPress: () => cancelDeliveryWithReason("Other issue")
        },
        {
          text: "Back",
          style: "cancel"
        }
      ]
    );
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

  // Calculate earnings (driver gets 80% of ride price)
  const driverEarnings = rideDetails?.price ? rideDetails.price * 0.8 : 0;

  return (
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
                {rideRequest.status === 'accepted' ? 'In Progress' : rideRequest.status} | 
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
              latitude: 6.9271,
              longitude: 79.8612,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker 
              coordinate={{ latitude: 6.9271, longitude: 79.8612 }} 
              title="Current Location" 
              pinColor="blue"
            />
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
          {/* Continue to Proof of Delivery */}
          <TouchableOpacity 
            className="bg-green-600 p-4 rounded-[20px] flex-row items-center justify-center"
            onPress={() => navigation.navigate('ProofOfDeliver', { rideRequest })}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text className="text-white text-center font-bold ml-2">Complete Delivery</Text>
          </TouchableOpacity>

          {/* Reschedule Button */}
          <TouchableOpacity 
            className="bg-orange-600 p-4 rounded-[20px] flex-row items-center justify-center"
            onPress={handleReschedule}
            disabled={isRescheduling}
          >
            <Ionicons name="calendar" size={20} color="white" />
            <Text className="text-white text-center font-bold ml-2">Reschedule</Text>
          </TouchableOpacity>

          {/* Cancel Delivery Button */}
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
  );
};

export default OrderPreview;
