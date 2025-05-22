import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, Calendar } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TimePicker({ navigation }) {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === "ios"); // Keep picker open on iOS
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <View className="flex-1 w-full bg-white p-5">
      {/* Header */}
      <View className="flex-row items-center mb-4">

        <TouchableOpacity onPress={() => navigation.goBack()} className="rounded-full p-2 border-2 border-gray-200">
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-2 flex-1 text-center ">Choose a date & time</Text>
      </View>

      {/* Date Picker Input */}
      <Text className="text-gray-600 mb-2">Select a Date</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="flex-row items-center border border-gray-300 rounded-lg p-3"
      >
        <TextInput
          value={date.toLocaleString()}
          editable={false}
          className="flex-1 outline-none text-black"
        />
        <Calendar size={20} color="black" />
      </TouchableOpacity>

      {/* Show Date Picker */}
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={handleDateChange}
        />
      )}

     

      {/* Next Button */}
      <TouchableOpacity className="bg-blue-800 p-4 rounded-[20px] mt-10">
        <Text className="text-white text-center text-lg font-semibold">Next</Text>
      </TouchableOpacity>
    </View>
  );
}
