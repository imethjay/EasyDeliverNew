import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking
} from "react-native";
import { FontAwesome, Ionicons, MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase/init";

const DeliveryDetails = ({ route, navigation }) => {
  const { order } = route.params || {};
  const [orderData, setOrderData] = useState(order);
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState(null);

  // Real-time order status listener
  useEffect(() => {
    if (!order?.rideRequestId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'rideRequests', order.rideRequestId),
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedData = docSnapshot.data();
          setOrderData({ ...order, ...updatedData });

          // If there's a driver assigned, fetch driver details
          if (updatedData.driverId) {
            try {
              const driverDoc = await getDoc(doc(db, 'drivers', updatedData.driverId));
              if (driverDoc.exists()) {
                setDriverData({
                  id: updatedData.driverId,
                  ...driverDoc.data(),
                  phoneNumber: updatedData.driverPhone,
                  vehicleNumber: updatedData.vehicleNumber
                });
              }
            } catch (error) {
              console.error('Error fetching driver data:', error);
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }, [order?.rideRequestId]);

  // Get delivery status display information
  const getDeliveryStatusDisplay = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'accepted':
        return { text: 'Driver Assigned - Coming to pickup', color: '#3B82F6', icon: 'car' };
      case 'collecting':
        return { text: 'Driver collecting package', color: '#F59E0B', icon: 'cube' };
      case 'in_transit':
        return { text: 'Package in transit', color: '#10B981', icon: 'car-sport' };
      case 'delivered':
        return { text: 'Delivered', color: '#059669', icon: 'checkmark-circle' };
      case 'cancelled':
        return { text: 'Cancelled', color: '#EF4444', icon: 'close-circle' };
      default:
        return { text: 'Searching for driver', color: '#F59E0B', icon: 'search' };
    }
  };

  const statusInfo = getDeliveryStatusDisplay(orderData?.deliveryStatus || 'pending');

  // Handle cancel order
  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Delivery",
      "Are you sure you want to cancel this delivery? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: cancelOrder
        }
      ]
    );
  };

  const cancelOrder = async () => {
    if (!order?.rideRequestId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'rideRequests', order.rideRequestId), {
        deliveryStatus: 'cancelled',
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      Alert.alert("Success", "Your delivery has been cancelled successfully.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error cancelling order:', error);
      Alert.alert("Error", "Failed to cancel the delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle phone call
  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  // Handle chat
  const handleChat = () => {
    if (driverData && order?.rideRequestId) {
      navigation.navigate('ChatScreen', {
        driverId: driverData.id,
        rideRequestId: order.rideRequestId,
        driverName: driverData.name || 'Driver'
      });
    }
  };

  // Handle reschedule
  const handleReschedule = () => {
    navigation.navigate('RescheduleDelivery', { order: orderData });
  };

  // Handle live tracking
  const handleLiveTracking = () => {
    if (['accepted', 'collecting', 'in_transit'].includes(orderData?.deliveryStatus)) {
      navigation.navigate('LiveTrack', { order: orderData });
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            className="rounded-full p-2 border border-gray-200"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text className="text-xl font-bold">Delivery Details</Text>
          <View className="w-10" />
        </View>
      </View>

      {/* Order Status */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="p-3 rounded-full" style={{ backgroundColor: `${statusInfo.color}20` }}>
              <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
            </View>
            <View className="ml-3">
              <Text className="text-lg font-bold">#{orderData?.trackingId || order?.trackingId || 'N/A'}</Text>
              <Text className="text-gray-500 text-sm">
                {new Date(orderData?.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {(['pending', 'searching'].includes(orderData?.deliveryStatus) || !orderData?.deliveryStatus) && (
            <TouchableOpacity 
              className="bg-red-500 px-4 py-2 rounded-lg"
              onPress={handleCancelOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium">Cancel</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View className="p-3 rounded-lg" style={{ backgroundColor: `${statusInfo.color}10` }}>
          <Text className="font-medium" style={{ color: statusInfo.color }}>
            Status: {statusInfo.text}
          </Text>
        </View>
      </View>

      {/* Package Details */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
        <Text className="text-lg font-bold mb-4">Package Information</Text>
        
        <View className="space-y-3">
          <View className="flex-row items-center">
            <Ionicons name="cube-outline" size={20} color="#666" />
            <Text className="ml-3 text-gray-800">
              <Text className="font-medium">Item: </Text>
              {orderData?.packageDetails?.packageName || order?.item || 'Package'}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="resize-outline" size={20} color="#666" />
            <Text className="ml-3 text-gray-800">
              <Text className="font-medium">Size: </Text>
              {orderData?.packageDetails?.packageSize || 'Medium'}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="speedometer-outline" size={20} color="#666" />
            <Text className="ml-3 text-gray-800">
              <Text className="font-medium">Weight: </Text>
              {orderData?.packageDetails?.packageWeight || 'Not specified'}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={20} color="#666" />
            <Text className="ml-3 text-gray-800">
              <Text className="font-medium">Cost: </Text>
              <Text className="text-green-600 font-bold">
                LKR {orderData?.rideDetails?.price || orderData?.packageDetails?.cost || '0.00'}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Pickup & Delivery Locations */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
        <Text className="text-lg font-bold mb-4">Delivery Route</Text>
        
        <View className="space-y-4">
          <View className="flex-row items-start">
            <View className="w-4 h-4 rounded-full bg-blue-500 mt-1" />
            <View className="ml-4 flex-1">
              <Text className="font-medium text-gray-800">Pickup Location</Text>
              <Text className="text-gray-600 mt-1">
                {orderData?.packageDetails?.pickupLocation || orderData?.from || 'Not specified'}
              </Text>
            </View>
          </View>
          
          <View className="ml-2 h-8 w-0.5 bg-gray-300" />
          
          <View className="flex-row items-start">
            <View className="w-4 h-4 rounded-full bg-green-500 mt-1" />
            <View className="ml-4 flex-1">
              <Text className="font-medium text-gray-800">Delivery Location</Text>
              <Text className="text-gray-600 mt-1">
                {orderData?.packageDetails?.dropoffLocation || orderData?.to || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>
        
        {orderData?.distance && orderData?.duration && (
          <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-200">
            <View className="items-center">
              <Text className="text-gray-500 text-sm">Distance</Text>
              <Text className="font-bold">{orderData.distance}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm">Duration</Text>
              <Text className="font-bold">{orderData.duration}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Driver Details */}
      {driverData && (
        <View className="bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm">
          <Text className="text-lg font-bold mb-4">Driver Information</Text>
          
          <View className="flex-row items-center mb-4">
            <Image 
              source={{ 
                uri: driverData.profileImage || "https://randomuser.me/api/portraits/men/1.jpg" 
              }} 
              className="w-16 h-16 rounded-full"
            />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold">{driverData.name || 'Driver'}</Text>
              <Text className="text-gray-500">{driverData.vehicleType || 'Vehicle'}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text className="text-gray-600 ml-1">
                  {driverData.rating || '4.8'} ({driverData.totalRides || '0'} rides)
                </Text>
              </View>
            </View>
          </View>
          
          {driverData.vehicleNumber && (
            <View className="flex-row items-center mb-3">
              <Ionicons name="car-outline" size={20} color="#666" />
              <Text className="ml-3 text-gray-800">
                <Text className="font-medium">Vehicle: </Text>
                {driverData.vehicleNumber}
              </Text>
            </View>
          )}
          
          <View className="flex-row justify-between">
            <TouchableOpacity 
              className="flex-1 bg-blue-500 p-3 rounded-lg mr-2 flex-row items-center justify-center"
              onPress={() => handleCall(driverData.phoneNumber)}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text className="text-white font-medium ml-2">Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 bg-green-500 p-3 rounded-lg ml-2 flex-row items-center justify-center"
              onPress={handleChat}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              <Text className="text-white font-medium ml-2">Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Live Map Preview */}
      {['accepted', 'collecting', 'in_transit'].includes(orderData?.deliveryStatus) && (
        <View className="mx-4 mt-4 h-48 rounded-xl overflow-hidden relative shadow-sm">
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
            />
          </MapView>
          <TouchableOpacity 
            className="absolute bottom-4 left-4 bg-blue-600 px-4 py-2 rounded-full flex-row items-center"
            onPress={handleLiveTracking}
          >
            <Ionicons name="radio-outline" size={18} color="white" />
            <Text className="text-white font-bold ml-2">Live Tracking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pickup PIN Display */}
      {orderData?.deliveryPin && !['delivered', 'cancelled'].includes(orderData?.deliveryStatus) && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl mx-4 mt-4 p-4">
          <View className="flex-row items-center justify-center">
            <View className="bg-blue-600 px-6 py-3 rounded-lg">
              <Text className="text-center">
                <Text className="text-white text-sm font-medium">Pickup PIN: </Text>
                <Text className="text-white font-bold text-2xl">{orderData.deliveryPin}</Text>
              </Text>
            </View>
          </View>
          <Text className="text-blue-800 text-center text-sm mt-3 font-medium">
            💡 Share this PIN with the driver for package collection
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="mx-4 mt-6 mb-8 space-y-3">
        {(orderData?.deliveryStatus === 'cancelled' || 
          orderData?.deliveryStatus === 'scheduled' || 
          orderData?.status === 'scheduled') && (
          <TouchableOpacity 
            className="bg-gray-600 p-4 rounded-xl"
            onPress={handleReschedule}
          >
            <Text className="text-white text-center font-bold">Reschedule Delivery</Text>
          </TouchableOpacity>
        )}
        
        {!['delivered', 'cancelled'].includes(orderData?.deliveryStatus) && 
         driverData && (
          <TouchableOpacity 
            className="bg-green-600 p-4 rounded-xl"
            onPress={() => navigation.navigate('PaymentUpdates', { order: orderData })}
          >
            <Text className="text-white text-center font-bold">Payment & Updates</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default DeliveryDetails; 