import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import DriverService from "../utils/DriverService";

const Profile = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState("Account");
    const [driverData, setDriverData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];

    useEffect(() => {
        fetchDriverProfile();
    }, []);

    const fetchDriverProfile = async () => {
        try {
            setLoading(true);
            const profileData = await DriverService.getDriverProfile();
            setDriverData(profileData);
        } catch (error) {
            console.error('Error fetching driver profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);
                            await DriverService.logout();
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        } finally {
                            setLoggingOut(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle navigation for bottom nav items
    const handleNavigation = (screenName) => {
        setActiveTab(screenName);
        
        switch (screenName) {
        case "Home":
            navigation.navigate("DriverHome");
            break;
        case "Delivery":
            navigation.navigate("MyOrder");
            break;
        case "Notifications":
            navigation.navigate("ChatList");
            break;
        case "Account":
            // Already on account page, do nothing
            break;
        default:
            break;
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push(<Ionicons key={i} name="star" size={16} color="#fbbf24" />);
        }
        
        if (hasHalfStar) {
            stars.push(<Ionicons key="half" name="star-half" size={16} color="#fbbf24" />);
        }
        
        const remainingStars = 5 - Math.ceil(rating);
        for (let i = 0; i < remainingStars; i++) {
            stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#fbbf24" />);
        }
        
        return stars;
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-2 text-gray-600">Loading profile...</Text>
            </View>
        );
    }

    if (!driverData) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-red-500">Failed to load profile data</Text>
                <TouchableOpacity 
                    className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                    onPress={fetchDriverProfile}
                >
                    <Text className="text-white">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
                <TouchableOpacity className="rounded-full p-2 border border-gray-300" onPress={() => navigation.navigate("DriverHome")}>
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-center flex-1 ml-[-32px]">
                    Driver Profile
                </Text>
                <TouchableOpacity onPress={handleLogout} disabled={loggingOut}>
                    {loggingOut ? (
                        <ActivityIndicator size={20} color="#ef4444" />
                    ) : (
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    )}
                </TouchableOpacity>
            </View>
            <ScrollView>
                {/* Profile Picture & Info */}
                <View className="items-center mb-4">
                    <Image
                        source={{ 
                            uri: driverData.profileImage || 
                                 driverData.photoURL || 
                                 "https://randomuser.me/api/portraits/men/32.jpg" 
                        }}
                        className="w-24 h-24 rounded-full"
                    />
                    <Text className="text-lg font-bold mt-2">
                        {driverData.name || driverData.fullName || 'Driver Name'}
                    </Text>
                    <Text className="text-gray-500">
                        {driverData.title || 'Professional Driver'}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <View className="flex-row">
                            {renderStars(driverData.ratings?.averageRating || 4.9)}
                        </View>
                        <Text className="ml-2 font-semibold text-gray-700">
                            {driverData.ratings?.averageRating || '4.9'}
                        </Text>
                        <Text className="text-gray-500">
                            {driverData.ratings?.totalReviews > 0 
                                ? ` (${driverData.ratings.totalReviews} reviews)` 
                                : ' (No reviews yet)'}
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <View className="flex-row justify-around bg-gray-50 rounded-xl py-4 mb-4">
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {driverData.stats?.totalTrips || 0}
                        </Text>
                        <Text className="text-gray-500 text-sm">Trips</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {driverData.stats?.experienceYears || 1}y
                        </Text>
                        <Text className="text-gray-500 text-sm">Experience</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {driverData.stats?.successRate || 98}%
                        </Text>
                        <Text className="text-gray-500 text-sm">Success Rate</Text>
                    </View>
                </View>

                {/* Vehicle Info */}
                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Vehicle</Text>
                        <Text className="text-black font-semibold">
                            {driverData.vehicleDetails?.make} {driverData.vehicleDetails?.model} {driverData.vehicleDetails?.year || 
                             driverData.vehicle || 'Toyota Camry 2023'}
                        </Text>
                    </View>
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">License</Text>
                        <Text className="text-black font-semibold">
                            {driverData.licenseNumber || 'CDL-A 123456789'}
                        </Text>
                    </View>
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Location</Text>
                        <Text className="text-black font-semibold">
                            {driverData.location || driverData.city || 'San Francisco, CA'}
                        </Text>
                    </View>
                    <View>
                        <Text className="text-gray-500 text-sm">Phone</Text>
                        <Text className="text-black font-semibold">
                            {driverData.phoneNumber || 'Not provided'}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row justify-between mb-6">
                    <TouchableOpacity className="flex-1 bg-blue-600 py-3 rounded-lg mr-2">
                        <Text className="text-white text-center font-semibold">Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-gray-200 py-3 rounded-lg ml-2">
                        <Text className="text-gray-700 text-center font-semibold">View Earnings</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Reviews */}
                <Text className="text-lg font-semibold mb-2">Recent Reviews</Text>

                {driverData.ratings?.recentReviews?.length > 0 ? (
                    driverData.ratings.recentReviews.map((review, index) => (
                        <View key={review.id || index} className="mb-4">
                            <View className="flex-row items-center mb-1">
                                <Image
                                    source={{ 
                                        uri: review.customerPhoto || 
                                             `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'women' : 'men'}/${68 + index}.jpg` 
                                    }}
                                    className="w-8 h-8 rounded-full"
                                />
                                <View className="ml-2 flex-1">
                                    <Text className="font-semibold">
                                        {review.customerName || 'Customer'}
                                    </Text>
                                    <View className="flex-row items-center">
                                        <View className="flex-row">
                                            {renderStars(review.rating || 5)}
                                        </View>
                                        <Text className="text-gray-500 text-xs ml-2">
                                            {review.createdAt ? DriverService.getTimeAgo(review.createdAt) : '2d ago'}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-700 text-sm mt-1">
                                        {review.comment || review.review || 'Great service!'}
                                    </Text>
                                    {/* Show delivery context if available */}
                                    {review.packageName && (
                                        <Text className="text-gray-500 text-xs mt-1">
                                            Delivery: {review.packageName}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))
                ) : driverData.ratings?.totalReviews === 0 ? (
                    // No reviews yet
                    <View className="bg-gray-50 rounded-lg p-4 mb-4">
                        <View className="items-center">
                            <Ionicons name="star-outline" size={48} color="#9ca3af" />
                            <Text className="text-gray-600 font-medium mt-2">No Reviews Yet</Text>
                            <Text className="text-gray-500 text-sm text-center mt-1">
                                Complete your first delivery to start receiving customer reviews
                            </Text>
                        </View>
                    </View>
                ) : (
                    // Default reviews if no real reviews found but driver has some stats
                    <>
                        <View className="mb-4">
                            <View className="flex-row items-center mb-1">
                                <Image
                                    source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }}
                                    className="w-8 h-8 rounded-full"
                                />
                                <View className="ml-2 flex-1">
                                    <Text className="font-semibold">Sarah Wilson</Text>
                                    <View className="flex-row items-center">
                                        {renderStars(5)}
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
                                        {renderStars(4)}
                                        <Text className="text-gray-500 text-xs ml-2">5d ago</Text>
                                    </View>
                                    <Text className="text-gray-700 text-sm mt-1">
                                        Smooth delivery but arrived a bit late.
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {/* Logout Button */}
                <TouchableOpacity 
                    className="bg-red-500 py-4 rounded-lg mb-6 mt-4"
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    <View className="flex-row items-center justify-center">
                        {loggingOut ? (
                            <ActivityIndicator size={20} color="white" />
                        ) : (
                            <Ionicons name="log-out-outline" size={20} color="white" />
                        )}
                        <Text className="text-white font-semibold text-center ml-2">
                            {loggingOut ? 'Logging out...' : 'Logout'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Navigation */}
            <View className="flex-row w-full justify-between gap-5 bg-white px-8 py-4 border-t border-gray-200">
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className="items-center"
                        onPress={() => handleNavigation(item.screen)}
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
