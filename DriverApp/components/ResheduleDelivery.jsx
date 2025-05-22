import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { Dropdown } from 'react-native-element-dropdown';

const x = [
  { label: 'Company A', value: 'companyA' },
  { label: 'Company B', value: 'companyB' },
  { label: 'Company C', value: 'companyC' },
];

export default function ResheduleDelivery() {
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [company, setCompany] = useState(null);
  return (
    <View className="flex-1  w-full p-4">
      {/* Header */}
      <View className="flex-row items-center  mb-4">
        <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-center  text-lg font-extrabold">Reschedule Delivery</Text>
      </View>

      {/* Order Info */}
      <View className="bg-white p-5 rounded-lg shadow-md">
        <Text className="text-gray-500">Order ID</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold">#ORD-2025486</Text>
          <View className="px-3 py-1 bg-blue-100 rounded-full">
            <Text className="text-blue-600 text-sm font-bold">Pending</Text>
          </View>
        </View>

        {/* Package Details */}
        <View className="mt-3 flex-row items-center">
          <FontAwesome name="box" size={16} color="gray" />
          <Text className="ml-2 text-gray-700">Package Details</Text>
        </View>
        <Text className="text-gray-500">Small Package (2.5 kg)</Text>

        {/* Pickup Location */}

        <View className="mt-4">
          <View className="flex-row items-center">
            <FontAwesome name="map-marker" size={18} color="blue" />
            <Text className="ml-2 font-semibold">Pickup Location</Text>
          </View>
          <Text className="text-gray-500">123 Sender Street, City</Text>
          <Text className="text-blue-600 font-semibold">John Doe • +1 234-567-8900</Text>
        </View>

        {/* Delivery Location */}
        <View className="mt-4">
          <View className="flex-row items-center">
            <FontAwesome name="map-marker" size={18} color="gray" />
            <Text className="ml-2 font-semibold">Delivery Location</Text>
          </View>
          <Text className="text-gray-500">456 Recipient Avenue, City</Text>
          <Text className="text-blue-600 font-semibold">Jane Smith • +1 234-567-8901</Text>
        </View>
      </View>

      {/* Form Inputs */}
      <View className="mt-5 space-y-6">

        <Dropdown
          data={x}
          className="py-5 border-gray-300"
          labelField="label"
          valueField="value"
          placeholder="Reason for Reschedule"
          value={company}
          onChange={item => setCompany(item.value)}
          style={{ height: 50, borderRadius: 20, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }}
          placeholderStyle={{ color: '#888' }}
          selectedTextStyle={{ color: '#000' }}
        />
        <TextInput
          className="border border-gray-300 rounded-[20px]  py-4 mt-4  p-3 mb-4 bg-white"
          placeholder="New Date"
        />
        <TextInput
          className="border border-gray-300 rounded-[20px]  py-4  p-3 bg-white"
          placeholder="Time approx"
        />
      </View>


      {/* Notify Customer Toggle */}
      <View className="flex-row items-center justify-between mt-4 p-3 rounded-lg ">

        <Text className="text-gray-700">Notify Customer</Text>
        <Switch
          value={notifyCustomer}
          onValueChange={setNotifyCustomer}
          trackColor={{ false: "#ddd", true: "#4CAF50" }}
          thumbColor={notifyCustomer ? "white" : "#f4f3f4"}
        />
      </View>

      {/* Reschedule Button */}
      <TouchableOpacity className="mt-4 py-4 p-4 bg-blue-800 rounded-[20px]">
        <Text className="text-white text-center font-semibold">Reschedule Delivery</Text>
      </TouchableOpacity>

    </View>
  );
}
