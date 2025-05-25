import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Platform } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { validateScheduleTime } from "../utils/helpers";
import ScheduledDeliveryService from "../utils/ScheduledDeliveryService";

export default function RescheduleDelivery() {
  const route = useRoute();
  const navigation = useNavigation();
  const { order } = route.params || {};
  const orderData = order; // For compatibility with existing code
  
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // 2 hours from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setNewDate(selectedDate);
    }
  };

  const handleReschedule = async () => {
    // Validate inputs
    if (!reason.trim()) {
      Alert.alert("Missing Information", "Please provide a reason for rescheduling.");
      return;
    }

    // Validate the new schedule time
    const validation = validateScheduleTime(newDate);
    if (!validation.isValid) {
      Alert.alert("Invalid Time", validation.error);
      return;
    }

    // Confirm rescheduling
    Alert.alert(
      "Confirm Reschedule",
      `Are you sure you want to reschedule this delivery to ${newDate.toLocaleString()}?\n\nReason: ${reason}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reschedule", 
          style: "destructive",
          onPress: performReschedule
        }
      ]
    );
  };

  const performReschedule = async () => {
    if (!orderData?.rideRequestId) {
      Alert.alert("Error", "Order information not found.");
      return;
    }

    setIsRescheduling(true);

    try {
      await ScheduledDeliveryService.rescheduleDelivery(
        orderData.rideRequestId,
        newDate
      );

      Alert.alert(
        "Rescheduled Successfully",
        `Your delivery has been rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString()}.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack()
          }
        ]
      );

      // TODO: Send notification if notifyCustomer is true
      if (notifyCustomer) {
        console.log("📱 Should send reschedule notification to customer");
      }

    } catch (error) {
      console.error("Error rescheduling delivery:", error);
      Alert.alert("Error", "Failed to reschedule delivery. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity 
          className="rounded-full p-2 border-2 border-gray-200 bg-white"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold">Reschedule Delivery</Text>
      </View>

      {/* Order Info */}
      <View className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-gray-500 text-sm">Order ID</Text>
            <Text className="text-lg font-bold">#{orderData?.rideRequestId?.substring(0, 10).toUpperCase() || 'Unknown'}</Text>
          </View>
          <View className="px-3 py-1 bg-blue-100 rounded-full">
            <Text className="text-blue-600 text-sm font-bold">
              {orderData?.isScheduled ? 'Scheduled' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Package Details */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="cube" size={16} color="#6B7280" />
            <Text className="ml-2 text-gray-700 font-medium">Package Details</Text>
          </View>
          <Text className="text-gray-600">
            {orderData?.packageDetails?.packageName || 'Package'} 
            {orderData?.packageDetails?.weight ? ` (${orderData.packageDetails.weight} kg)` : ''}
          </Text>
        </View>

        {/* Current Scheduled Time */}
        {orderData?.scheduledDateTime && (
          <View className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <Text className="text-yellow-800 font-medium text-sm mb-1">Currently scheduled for:</Text>
            <Text className="text-yellow-900 font-bold">
              {(() => {
                try {
                  // Handle Firestore Timestamp or regular Date
                  let scheduledDate;
                  if (orderData.scheduledDateTime?.toDate && typeof orderData.scheduledDateTime.toDate === 'function') {
                    // Firestore Timestamp
                    scheduledDate = orderData.scheduledDateTime.toDate();
                  } else if (orderData.scheduledDateTime?.seconds) {
                    // Firestore Timestamp object with seconds
                    scheduledDate = new Date(orderData.scheduledDateTime.seconds * 1000);
                  } else {
                    // Regular Date or timestamp
                    scheduledDate = new Date(orderData.scheduledDateTime);
                  }
                  
                  return scheduledDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } catch (error) {
                  console.error('Error formatting scheduled date:', error);
                  return 'Invalid Date';
                }
              })()}
            </Text>
          </View>
        )}

        {/* Pickup Location */}
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <FontAwesome name="map-marker" size={18} color="#3B82F6" />
            <Text className="ml-2 font-semibold text-gray-700">Pickup Location</Text>
          </View>
          <Text className="text-gray-600 ml-6">{orderData?.packageDetails?.pickupLocation || 'Not specified'}</Text>
        </View>

        {/* Delivery Location */}
        <View>
          <View className="flex-row items-center mb-2">
            <FontAwesome name="map-marker" size={18} color="#6B7280" />
            <Text className="ml-2 font-semibold text-gray-700">Delivery Location</Text>
          </View>
          <Text className="text-gray-600 ml-6">{orderData?.packageDetails?.dropoffLocation || 'Not specified'}</Text>
        </View>
      </View>

      {/* Form Inputs */}
      <View className="mb-6">
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Reason for Reschedule</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 bg-white"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder="Please provide a reason for rescheduling (required)"
            value={reason}
            onChangeText={setReason}
            multiline={true}
            numberOfLines={3}
          />
        </View>
        
        {/* New Date and Time Picker */}
        <View>
          <Text className="text-gray-700 font-medium mb-2">New Date & Time</Text>
          <TouchableOpacity
            className="border border-gray-300 rounded-lg p-3 bg-white flex-row items-center justify-between"
            onPress={() => setShowDatePicker(true)}
          >
            <View className="flex-1">
              <Text className="text-gray-600 text-sm">Selected Time</Text>
              <Text className="text-gray-800 font-medium text-base">
                {newDate.toLocaleDateString()} at {newDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
            <Ionicons name="calendar-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={newDate}
            mode="datetime"
            display="default"
            minimumDate={new Date(Date.now() + 60 * 60 * 1000)} // 1 hour from now
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* Notify Customer Toggle */}
      <View className="bg-white rounded-lg p-4 mb-6 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-gray-700 font-medium">Notify Customer</Text>
          <Text className="text-gray-500 text-sm">Send notification about the reschedule</Text>
        </View>
        <Switch
          value={notifyCustomer}
          onValueChange={setNotifyCustomer}
          trackColor={{ false: "#D1D5DB", true: "#10B981" }}
          thumbColor={notifyCustomer ? "#FFFFFF" : "#F3F4F6"}
        />
      </View>

      {/* Reschedule Button */}
      <TouchableOpacity 
        className={`p-4 rounded-lg ${isRescheduling ? 'bg-gray-400' : 'bg-blue-600'} shadow-lg`}
        onPress={handleReschedule}
        disabled={isRescheduling}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {isRescheduling ? 'Rescheduling...' : 'Reschedule Delivery'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
