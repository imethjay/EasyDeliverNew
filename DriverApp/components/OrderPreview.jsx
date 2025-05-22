import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { ScrollView } from "react-native";

const OrderPreview = () => {
  return (
    <View className="flex-1 w-full bg-white p-4">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold ml-2 text-center">Tracking Details</Text>
      </View>

      <ScrollView>

      {/* Package Details */}
      <View className="bg-gray-100 p-4 rounded-lg">
        <Text className="text-lg font-bold mb-2">Package Details</Text>
        <View className="flex-row justify-between">
          <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
            <Text className="text-gray-500 text-xs">Type</Text>
            <Text className="text-black font-bold">Standard Box</Text>
          </View>
          <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
            <Text className="text-gray-500 text-xs">Weight</Text>
            <Text className="text-black font-bold">2.5 kg</Text>
          </View>
        </View>
        <View className="flex-row justify-between mt-2">
          <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
            <Text className="text-gray-500 text-xs">Size</Text>
            <Text className="text-black font-bold">Medium</Text>
          </View>
          <View className="flex-1 bg-white p-3 rounded-lg shadow-sm mx-1">
            <Text className="text-gray-500 text-xs">Earnings</Text>
            <Text className="text-green-600 font-bold">$12.50</Text>
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
            <Text className="text-lg font-bold">#1234567890</Text>
            <Text className="text-gray-500 text-sm">On Going | 1 Oct 2024</Text>
          </View>
        </View>

        {/* Pickup & Delivery Locations */}
        <View className="mt-3">
          <View className="flex-row items-center">
            <FontAwesome name="map-marker" size={18} color="blue" />
            <Text className="text-gray-800 ml-2">From: 20/6, Panadura</Text>
          </View>

          <View className="flex-row items-center mt-2">
            <FontAwesome name="map-marker" size={18} color="gray" />
            <Text className="text-gray-800 ml-2">Shipping to: 20/6, Panadura</Text>
          </View>
        </View>

        {/* Contact Section */}
        <View className="flex-row items-center mt-3">
          <Image source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }} className="w-10 h-10 rounded-full" />
          <Text className="ml-3 font-semibold">Imeth Jay</Text>
          <View className="flex-row ml-auto">
            <TouchableOpacity className="p-2">
              <Ionicons name="call" size={24} color="blue" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2 ml-2">
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
          <Marker coordinate={{ latitude: 6.9271, longitude: 79.8612 }} title="Current Location" />
        </MapView>
        <TouchableOpacity className="absolute bottom-4 left-4 bg-blue-800 px-4 py-4 rounded-[20px] flex-row items-center">
          <Ionicons name="radio-outline" size={18} color="white" />
          <Text className="text-white font-bold ml-2">Live Tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Reschedule Button */}
      <TouchableOpacity className="bg-blue-800 p-3 py-4 mt-8 rounded-[20px]">
        <Text className="text-white text-center font-bold">Reschedule</Text>
      </TouchableOpacity>
      </ScrollView>
    
    </View>
  );
};

export default OrderPreview;
