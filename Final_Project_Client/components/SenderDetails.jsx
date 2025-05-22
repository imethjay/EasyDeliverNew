import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";

const SenderDetails = () => {
  const [province, setProvince] = useState("");

  return (
    <ScrollView className="flex-1 w-full space-y-6 bg-white px-6 py-6">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity className="rounded-full p-2 bg-gray-200">
          <Text className="text-lg font-bold">{`<`}</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold flex-1 text-center text-gray-900">
          Sender Details
        </Text>
      </View>

      {/* Form Fields */}
      <View className="space-y-6">
        {/* Full Name */}
        <View className="bg-white border border-gray-300 rounded-[20px] px-4 py-3 shadow-sm">
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#999"
            className="text-gray-900"
          />
        </View>

        {/* Phone Number */}
        <View className="bg-white border border-gray-300 rounded-[20px] px-4 py-3 shadow-sm">
          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            className="text-gray-900"
          />
        </View>

        {/* City & Province */}
        <View className="flex-row space-x-4">
          <View className="flex-1 bg-white border border-gray-300 rounded-[20px] px-4 py-3 shadow-sm">
            <TextInput
              placeholder="City"
              placeholderTextColor="#999"
              className="text-gray-900"
            />
          </View>
          <View className="flex-1 bg-white border border-gray-300 rounded-[20px] px-4 py-3 shadow-sm">
            <TextInput
              placeholder="Province"
              placeholderTextColor="#999"
              value={province}
              onChangeText={(value) => setProvince(value)}
              className="text-gray-900"
            />
          </View>
        </View>

        {/* Address */}
        <View className="bg-white border border-gray-300 rounded-[20px] px-4 py-3 shadow-sm h-32">
          <TextInput
            placeholder="Address"
            multiline
            textAlignVertical="top"
            placeholderTextColor="#999"
            className="text-gray-900"
          />
        </View>
      </View>

      {/* Next Button */}
      <TouchableOpacity className="bg-blue-800 rounded-[20px] py-3 mt-10 shadow-md">
        <Text className="text-center text-white font-bold text-lg">Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SenderDetails;
