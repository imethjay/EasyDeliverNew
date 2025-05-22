import React from "react";
import { useAuth } from "./auth/AuthContext";
import { View, Text, Image, TouchableOpacity, Switch, ScrollView } from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

const Profile = ({ navigation }) => {
    const { user } = useAuth();
    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = React.useState(false);
    const [isPushEnabled, setIsPushEnabled] = React.useState(true);

    return (
        <View className="flex-1 w-full bg-gray-100 p-4">
            {/* Header */}
            
            <View className="flex-row w-full items-center justify-between mb-4">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200"
                    onPress={() => navigation.navigate('Home')}
                >
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-extrabold">Profile</Text>

                <TouchableOpacity>
                    <Ionicons name="settings-outline" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Profile Picture & Info */}
            <View className="items-center mb-4">
                <Image
                    source={{
                        uri: "https://randomuser.me/api/portraits/women/44.jpg",
                    }}
                    className="w-24 h-24 rounded-full"
                />
                <View className="absolute bottom-0 right-16 bg-blue-500 p-1 rounded-full">
                    <Ionicons name="camera" size={16} color="white" />
                </View>
                <Text className="text-xl font-semibold mt-2">{user?.displayName || 'User'}</Text>
                <Text className="text-gray-500">{user?.email || ''}</Text>
            </View>

            {/* Contact Information */}
            <View className="bg-white p-4 rounded-2xl mb-4">
                <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 font-semibold">Contact Information</Text>
                    <TouchableOpacity>
                        <Ionicons name="create-outline" size={20} color="blue" />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="call" size={20} color="gray" />
                    <Text className="ml-2 text-black">+1 (555) 123-4567</Text>
                </View>
                <View className="flex-row items-center mt-2">
                    <Ionicons name="location" size={20} color="gray" />
                    <Text className="ml-2 text-black">1234 Main Street, Apt 5B</Text>
                </View>
            </View>

            {/* Payment Methods */}
            <View className="bg-white p-4 rounded-2xl mb-4">
                <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500 font-semibold">Payment Methods</Text>
                    <TouchableOpacity>
                        <Ionicons name="add" size={20} color="blue" />
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center mt-2">
                    <FontAwesome name="cc-visa" size={24} color="blue" />
                    <Text className="ml-2 text-black">•••• 4567</Text>
                    <Text className="ml-auto text-gray-500">Default</Text>
                </View>
                <View className="flex-row items-center mt-2 opacity-50">
                    <FontAwesome name="cc-mastercard" size={24} color="orange" />
                    <Text className="ml-2 text-black">•••• 8901</Text>
                </View>
            </View>

            {/* Recent Deliveries */}
            <View className="bg-white p-4 rounded-2xl mb-4">
                <Text className="text-gray-500 font-semibold">Recent Deliveries</Text>
                <View className="mt-2">
                    <Text className="text-black">Tracking ID: #TRK789012</Text>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500">Delivered on Mar 15, 2025</Text>
                        <Text className="text-green-500 font-bold  ">Delivered</Text>
                    </View>
                </View>
                <View className="mt-2">
                    <Text className="text-black">Tracking ID: #TRK789013</Text>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500">In Transit - Mar 18, 2025</Text>
                        <Text className="text-blue-500 font-bold">In Transit</Text>
                    </View>
                </View>
            </View>

            {/* Settings */}
            <View className="bg-white p-4 rounded-2xl">
                <Text className="text-gray-500 font-semibold">Settings</Text>
                <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-black">Push Notifications</Text>
                    <Switch
                        value={isPushEnabled}
                        onValueChange={() => setIsPushEnabled(!isPushEnabled)}
                    />
                </View>
                <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-black">Language</Text>
                    <Text className="text-gray-500">English</Text>
                </View>
                <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-black">Two-Factor Authentication</Text>
                    <Switch
                        value={isTwoFactorEnabled}
                        onValueChange={() => setIsTwoFactorEnabled(!isTwoFactorEnabled)}
                    />
                </View>
            </View>
        </View>
    );
};

export default Profile;
