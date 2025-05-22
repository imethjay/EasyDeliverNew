import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const MyOrder = () => {
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery"); // Default selected tab

  const menuItems = [
      { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
      { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
      { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
      { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
  ];

  const orders = [
    {
      id: "1",
      trackingNumber: "1234567890",
      status: "Pending",
      description: "Returned to sender",
      color: "text-yellow-500",
    },
    {
      id: "2",
      trackingNumber: "1234567890",
      status: "Delivered",
      description: "On Transit area",
      color: "text-green-500",
    },
    {
      id: "3",
      trackingNumber: "1234567890",
      status: "On Process",
      description: "Waiting to pickup",
      color: "text-blue-500",
    },
    {
      id: "4",
      trackingNumber: "1234567890",
      status: "On Process",
      description: "Waiting to pickup",
      color: "text-blue-500",
    },
    {
      id: "5",
      trackingNumber: "1234567890",
      status: "On Process",
      description: "Waiting to pickup",
      color: "text-blue-500",
    },

  ];

  const tabs = ["All", "Pending", "On process", "Finished"];

  const filteredOrders = selectedTab === "All" ? orders : orders.filter((order) => order.status === selectedTab);

  return (
    <View className="flex-1 bg-white w-full">
      {/* Header */}
      <View className="bg-[#133BB7]  p-6">
        <Text className="text-white font-bold text-lg">My Order</Text>
        <View className="bg-white rounded-[20px] flex-row items-center mt-4 px-4">
          <TextInput
            className="flex-1 h-10 outline-none"
            placeholder="Enter tracking number"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around mt-4">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            className={`py-2 px-4 rounded-full ${selectedTab === tab ? "bg-[#133BB7] " : "bg-gray-100"
              }`}
          >
            <Text
              className={`${selectedTab === tab ? "text-white" : "text-gray-600"
                } text-sm font-medium`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-white mx-4 mt-4 rounded-lg shadow-sm p-4 border border-gray-100">
            {/* Icon */}
            <View className="bg-gray-100 rounded-full p-4">
              <Text>📦</Text>
            </View>

            {/* Details */}
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-gray-800">
                #{item.trackingNumber}
              </Text>
              <Text className="text-gray-500">{item.description}</Text>
            </View>

            {/* Status */}
            <Text className={`font-bold ${item.color}`}>{item.status}</Text>
          </View>
        )}
      />

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
                    onPress={() => setActiveTab(item.screen)}
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

export default MyOrder;
