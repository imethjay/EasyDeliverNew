import React, { useState, useEffect } from "react";
import { useAuth } from "./auth/AuthContext";
import { View, Text, Image, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase/init";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";

const Profile = ({ navigation }) => {
    const { user, userProfile, logout, updateUserProfile } = useAuth();
    const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
    const [isPushEnabled, setIsPushEnabled] = useState(true);
    const [recentDeliveries, setRecentDeliveries] = useState([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState("Profile");

    // Menu items for bottom navigation
    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "MyOrder" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "ChatList" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Profile" },
    ];

    // Navigation handler for bottom tabs
    const handleTabPress = (screenName) => {
        setActiveTab(screenName);
        if (screenName !== "Profile") {
            navigation.navigate(screenName);
        }
    };

    // Fetch recent deliveries
    useEffect(() => {
        if (!user?.uid) {
            setLoadingDeliveries(false);
            return;
        }

        console.log('Fetching recent deliveries for user:', user.uid);
        
        const deliveriesQuery = query(
            collection(db, 'rideRequests'),
            where('customerId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(3)
        );

        const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
            try {
                const deliveriesData = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    
                    const getStatusDisplay = (deliveryStatus) => {
                        switch (deliveryStatus) {
                            case 'delivered':
                                return { status: 'Delivered', color: 'text-green-500' };
                            case 'in_transit':
                                return { status: 'In Transit', color: 'text-blue-500' };
                            case 'collecting':
                                return { status: 'Collecting', color: 'text-orange-500' };
                            case 'accepted':
                                return { status: 'Confirmed', color: 'text-blue-500' };
                            case 'cancelled':
                                return { status: 'Cancelled', color: 'text-red-500' };
                            default:
                                return { status: 'Pending', color: 'text-yellow-500' };
                        }
                    };

                    const statusInfo = getStatusDisplay(data.deliveryStatus || 'pending');
                    const deliveryDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();

                    deliveriesData.push({
                        id: doc.id,
                        trackingId: doc.id.substring(0, 10).toUpperCase(),
                        packageName: data.packageDetails?.packageName || 'Package',
                        status: statusInfo.status,
                        statusColor: statusInfo.color,
                        date: deliveryDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                        }),
                        fullData: data
                    });
                });

                setRecentDeliveries(deliveriesData);
                setLoadingDeliveries(false);
                console.log(`✅ Loaded ${deliveriesData.length} recent deliveries`);
            } catch (error) {
                console.error('❌ Error processing deliveries:', error);
                setLoadingDeliveries(false);
            }
        }, (error) => {
            console.error('❌ Error fetching deliveries:', error);
            setLoadingDeliveries(false);
        });

        return () => {
            console.log('🧹 Cleaning up deliveries listener');
            unsubscribe();
        };
    }, [user?.uid]);

    const handleProfileImageUpdate = () => {
        Alert.alert(
            "Update Profile Picture",
            "Choose an option:",
            [
                {
                    text: "Camera",
                    onPress: () => openImagePicker('camera')
                },
                {
                    text: "Photo Library", 
                    onPress: () => openImagePicker('library')
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    const openImagePicker = (sourceType) => {
        const options = {
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 500,
            maxHeight: 500,
            includeBase64: false,
        };

        // Choose the appropriate picker based on source type
        if (sourceType === 'camera') {
            launchCamera(options, handleImageResponse);
        } else {
            launchImageLibrary(options, handleImageResponse);
        }
    };

    const handleImageResponse = async (response) => {
        console.log('Image picker response:', response);

        if (response.didCancel) {
            console.log('User cancelled image picker');
            return;
        }

        if (response.error) {
            console.error('Image picker error:', response.error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
            return;
        }

        if (response.assets && response.assets[0]) {
            setUploadingImage(true);
            try {
                const asset = response.assets[0];
                console.log('Selected image:', asset);
                
                // Validate image
                if (!asset.uri) {
                    throw new Error('No image selected');
                }

                if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { // 5MB limit
                    throw new Error('Image too large. Please select an image under 5MB.');
                }
                
                // Create a reference to store the image
                const timestamp = Date.now();
                const imageRef = ref(storage, `profile_images/${user.uid}_${timestamp}.jpg`);
                
                console.log('Uploading to:', imageRef.fullPath);
                
                // Convert image to blob
                const response = await fetch(asset.uri);
                if (!response.ok) {
                    throw new Error('Failed to read image file');
                }
                const blob = await response.blob();
                
                console.log('Image blob created, size:', blob.size);
                
                // Upload image
                console.log('Starting upload...');
                const uploadResult = await uploadBytes(imageRef, blob);
                console.log('Upload completed:', uploadResult);
                
                // Get download URL
                console.log('Getting download URL...');
                const downloadURL = await getDownloadURL(imageRef);
                console.log('Download URL obtained:', downloadURL);
                
                // Update user profile with new image URL
                console.log('Updating user profile...');
                await updateUserProfile({ profileImage: downloadURL });
                
                console.log('Profile picture updated successfully');
                Alert.alert('Success', 'Profile picture updated successfully!');
            } catch (error) {
                console.error('Error uploading image:', error);
                let errorMessage = 'Failed to update profile picture. Please try again.';
                
                if (error.code === 'storage/unauthorized') {
                    errorMessage = 'Permission denied. Please check your account permissions.';
                } else if (error.code === 'storage/canceled') {
                    errorMessage = 'Upload was cancelled.';
                } else if (error.code === 'storage/unknown') {
                    errorMessage = 'An unknown error occurred. Please try again.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                Alert.alert('Error', errorMessage);
            } finally {
                setUploadingImage(false);
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await logout();
                            navigation.replace('Login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    // Get user display information
    const getUserDisplayName = () => {
        return userProfile?.name || user?.displayName || 'User';
    };

    const getUserEmail = () => {
        return userProfile?.email || user?.email || '';
    };

    const getUserPhone = () => {
        return userProfile?.mobile || '+1 (555) 123-4567';
    };

    const getUserAddress = () => {
        if (userProfile?.address) {
            const fullAddress = `${userProfile.address}`;
            if (userProfile.city) {
                return `${fullAddress}, ${userProfile.city}`;
            }
            if (userProfile.zipCode) {
                return `${fullAddress} ${userProfile.zipCode}`;
            }
            return fullAddress;
        }
        return '1234 Main Street, Apt 5B';
    };

    const handleDeliveryPress = (delivery) => {
        // Navigate to delivery details
        if (delivery.status === 'Delivered' || delivery.status === 'Cancelled') {
            navigation.navigate('TrackingDetails', { order: delivery.fullData });
        } else {
            navigation.navigate('MyOrder');
        }
    };

    return (
        <View className="flex-1 w-full bg-gray-100">
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 100 }}>
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
                    <View className="relative">
                        <Image
                            source={{
                                uri: userProfile?.profileImage || "https://randomuser.me/api/portraits/women/44.jpg",
                            }}
                            className="w-24 h-24 rounded-full"
                        />
                        {uploadingImage && (
                            <View className="absolute inset-0 w-24 h-24 rounded-full bg-black bg-opacity-50 items-center justify-center">
                                <ActivityIndicator size="small" color="white" />
                            </View>
                        )}
                        <TouchableOpacity 
                            className="absolute bottom-0 right-16 bg-blue-500 p-1 rounded-full"
                            onPress={handleProfileImageUpdate}
                            disabled={uploadingImage}
                        >
                            <Ionicons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-xl font-semibold mt-2">{getUserDisplayName()}</Text>
                    <Text className="text-gray-500">{getUserEmail()}</Text>
                    {userProfile?.userType && (
                        <Text className="text-blue-500 text-sm mt-1 capitalize">{userProfile.userType}</Text>
                    )}
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
                        <Text className="ml-2 text-black">{getUserPhone()}</Text>
                    </View>
                    <View className="flex-row items-center mt-2">
                        <Ionicons name="location" size={20} color="gray" />
                        <Text className="ml-2 text-black">{getUserAddress()}</Text>
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
                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-500 font-semibold">Recent Deliveries</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('MyOrder')}>
                            <Text className="text-blue-500 text-sm">View All</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {loadingDeliveries ? (
                        <View className="mt-4 items-center">
                            <ActivityIndicator size="small" color="#1E40AF" />
                            <Text className="text-gray-500 mt-2 text-sm">Loading deliveries...</Text>
                        </View>
                    ) : recentDeliveries.length > 0 ? (
                        recentDeliveries.map((delivery, index) => (
                            <TouchableOpacity 
                                key={delivery.id}
                                className="mt-3 border-b border-gray-100 pb-3"
                                onPress={() => handleDeliveryPress(delivery)}
                            >
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1">
                                        <Text className="text-black font-medium">{delivery.packageName}</Text>
                                        <Text className="text-gray-500 text-sm">Tracking ID: #{delivery.trackingId}</Text>
                                        <Text className="text-gray-500 text-sm">{delivery.date}</Text>
                                    </View>
                                    <Text className={`font-bold text-sm ${delivery.statusColor}`}>
                                        {delivery.status}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View className="mt-4 items-center py-4">
                            <Ionicons name="package-outline" size={32} color="gray" />
                            <Text className="text-gray-500 text-sm mt-2">No recent deliveries</Text>
                            <TouchableOpacity 
                                className="mt-2"
                                onPress={() => navigation.navigate('CreateDelivery')}
                            >
                                <Text className="text-blue-500 text-sm">Create your first delivery</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Settings */}
                <View className="bg-white p-4 rounded-2xl mb-4">
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

                {/* Logout Button */}
                <View className="bg-white p-4 rounded-2xl mb-6">
                    <TouchableOpacity 
                        onPress={handleLogout}
                        className="flex-row items-center justify-center py-3 bg-red-500 rounded-xl"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" className="mr-2" />
                        <Text className="text-white font-semibold text-base ml-2">Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

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
                        onPress={() => handleTabPress(item.screen)}
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

export default Profile;
