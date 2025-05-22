import React, { useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const Profile = () => {
    const [activeTab, setActiveTab] = useState("Account"); // Default selected tab

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];
    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity className="rounded-full p-2 border border-gray-300">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-center flex-1 ml-[-32px]">
                    Driver Profile
                </Text>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-vertical" size={20} color="black" />
                </TouchableOpacity>
            </View>
            <ScrollView>
                {/* Profile Picture & Info */}
                <View className="items-center mb-4">
                    <Image
                        source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
                        className="w-24 h-24 rounded-full"
                    />
                    <Text className="text-lg font-bold mt-2">Imeth Jayarathne</Text>
                    <Text className="text-gray-500">Professional Driver</Text>
                    <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={16} color="#fbbf24" />
                        <Text className="ml-1 font-semibold text-gray-700">4.9</Text>
                        <Text className="text-gray-500"> (2.5k reviews)</Text>
                    </View>
                </View>

                {/* Stats */}
                <View className="flex-row justify-around bg-gray-50 rounded-xl py-4 mb-4">
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">2.5k</Text>
                        <Text className="text-gray-500 text-sm">Trips</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">5y</Text>
                        <Text className="text-gray-500 text-sm">Experience</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">98%</Text>
                        <Text className="text-gray-500 text-sm">Success Rate</Text>
                    </View>
                </View>

                {/* Vehicle Info */}
                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Vehicle</Text>
                        <Text className="text-black font-semibold">Toyota Camry 2023</Text>
                    </View>
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">License</Text>
                        <Text className="text-black font-semibold">CDL-A 123456789</Text>
                    </View>
                    <View>
                        <Text className="text-gray-500 text-sm">Location</Text>
                        <Text className="text-black font-semibold">San Francisco, CA</Text>
                    </View>
                </View>

                {/* Recent Reviews */}
                <Text className="text-lg font-semibold mb-2">Recent Reviews</Text>

                <View className="mb-4">
                    <View className="flex-row items-center mb-1">
                        <Image
                            source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }}
                            className="w-8 h-8 rounded-full"
                        />
                        <View className="ml-2 flex-1">
                            <Text className="font-semibold">Sarah Wilson</Text>
                            <View className="flex-row items-center">
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Text className="text-gray-500 text-xs ml-2">2d ago</Text>
                            </View>
                            <Text className="text-gray-700 text-sm mt-1">
                                Excellent service! Very professional and punctual.
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="mb-4">
                    <View className="flex-row items-center mb-1">
                        <Image
                            source={{ uri: "https://randomuser.me/api/portraits/men/75.jpg" }}
                            className="w-8 h-8 rounded-full"
                        />
                        <View className="ml-2 flex-1">
                            <Text className="font-semibold">John Davis</Text>
                            <View className="flex-row items-center">
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star" size={14} color="#fbbf24" />
                                <Ionicons name="star-outline" size={14} color="#fbbf24" />
                                <Text className="text-gray-500 text-xs ml-2">5d ago</Text>
                            </View>
                            <Text className="text-gray-700 text-sm mt-1">
                                Smooth delivery but arrived a bit late.
                            </Text>
                        </View>
                    </View>

                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View
                className="flex-row w-full justify-between  gap-5 bg-white px-8 py-4 border-t border-gray-200"
               
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
                            className={`text-sm ${activeTab === item.screen ? "text-blue-600" : "text-gray-500"
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

export default Profile;
