import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, Calendar } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

export default function TimePicker({ navigation }) {
  const route = useRoute();
  const { packageDetails } = route.params || {};
  
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === "ios"); // Keep picker open on iOS
    if (selectedDate) setDate(selectedDate);
  };

  const validateAndProceed = () => {
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    if (date <= minScheduleTime) {
      Alert.alert(
        "Invalid Time",
        "Please select a time at least 1 hour from now for scheduled deliveries.",
        [{ text: "OK" }]
      );
      return;
    }

    // Add scheduled time to package details
    const updatedPackageDetails = {
      ...packageDetails,
      deliveryOption: "Schedule for later",
      scheduledDateTime: date,
      scheduledTimestamp: date.getTime()
    };

    // Navigate to CourierSelection with updated package details
    navigation.navigate("CourierSelection", { packageDetails: updatedPackageDetails });
  };

  return (
    <View className="flex-1 bg-white p-5">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="rounded-full p-2 border-2 border-gray-200">
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-2 flex-1 text-center">Choose a date & time</Text>
      </View>

      {/* Instructions */}
      <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <Text className="text-blue-800 text-sm leading-5">
          Select when you want your package to be picked up. Minimum scheduling time is 1 hour from now.
        </Text>
      </View>

      {/* Date Picker Input */}
      <Text className="text-gray-700 font-medium mb-3">Select a Date & Time</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="flex-row items-center border border-gray-300 rounded-lg p-4 mb-6 bg-white shadow-sm"
      >
        <TextInput
          value={date.toLocaleString()}
          editable={false}
          className="flex-1 text-black font-medium"
        />
        <Calendar size={20} color="#6B7280" />
      </TouchableOpacity>

      {/* Show Date Picker */}
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          minimumDate={new Date(Date.now() + 60 * 60 * 1000)} // 1 hour from now
          onChange={handleDateChange}
        />
      )}

      {/* Package Summary */}
      {packageDetails && (
        <View className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <Text className="text-gray-800 font-semibold mb-3">Package Details:</Text>
          <View>
            <Text className="text-gray-600 text-sm mb-2">📦 {packageDetails.packageName || 'Package'}</Text>
            <Text className="text-gray-600 text-sm mb-2">📍 From: {packageDetails.pickupLocation}</Text>
            <Text className="text-gray-600 text-sm">🎯 To: {packageDetails.dropoffLocation}</Text>
          </View>
        </View>
      )}

      {/* Next Button */}
      <TouchableOpacity 
        className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg mt-auto shadow-lg"
        onPress={validateAndProceed}
      >
        <Text className="text-white text-center text-lg font-semibold">Continue with Scheduling</Text>
      </TouchableOpacity>
    </View>
  );
}
