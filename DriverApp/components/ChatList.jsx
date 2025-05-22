import React, { useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const chatData = Array(6).fill({
    name: "Imeth Jayarathne",
    message: "Hey there, I'm on my way...",
    time: "4:45 PM",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
});

const ChatList = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState("Notifications"); // Default selected tab

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];
    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center  mb-4">
                <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-extrabold">Chat</Text>
            </View>

            {/* Search Bar */}
            <TextInput
                className="bg-gray-100 rounded-xl p-3 mb-3"
                placeholder="Search message..."
            />

            {/* Chat List */}
            <FlatList
                data={chatData}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="flex-row items-center bg-gray-100 p-4 rounded-xl mb-2"
                        onPress={() => navigation.navigate("ChatScreen")}
                    >
                        <Image source={{ uri: item.avatar }} className="w-12 h-12 rounded-full" />
                        <View className="ml-3 flex-1">
                            <Text className="font-bold">{item.name}</Text>
                            <Text className="text-gray-500">{item.message}</Text>
                        </View>
                        <Text className="text-gray-400">{item.time}</Text>
                    </TouchableOpacity>
                )}
            />
            {/* Bottom Navigation */}
            <View
                className="flex-row justify-between  bg-white px-8 py-4 border-t border-gray-200"
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

export default ChatList;
