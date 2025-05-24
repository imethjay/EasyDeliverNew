import React, { useState, useEffect } from "react";
import { 
    View, 
    Text, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator, 
    Alert,
    Modal,
    TextInput,
    Platform
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import DriverService from "../utils/DriverService";

const Profile = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState("Account");
    const [driverData, setDriverData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [earningsData, setEarningsData] = useState(null);
    
    // Edit form states
    const [editForm, setEditForm] = useState({
        name: '',
        phoneNumber: '',
        location: '',
        city: '',
        vehicle: '',
        licenseNumber: '',
        profileImage: '',
        bio: ''
    });

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
            
            // Initialize edit form with current data
            setEditForm({
                name: profileData.name || profileData.fullName || '',
                phoneNumber: profileData.phoneNumber || '',
                location: profileData.location || '',
                city: profileData.city || '',
                vehicle: profileData.vehicle || '',
                licenseNumber: profileData.licenseNumber || '',
                profileImage: profileData.profileImage || profileData.photoURL || '',
                bio: profileData.bio || ''
            });
        } catch (error) {
            console.error('Error fetching driver profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const fetchEarningsData = async () => {
        try {
            // Use the new detailed earnings method
            const detailedEarnings = await DriverService.getDriverEarnings(driverData.id);
            const profileData = await DriverService.getDriverProfile();
            const stats = profileData.stats || {};
            
            // Create comprehensive earnings breakdown using real and estimated data
            const earnings = {
                totalEarnings: detailedEarnings.totalEarnings || stats.totalEarnings || 0,
                averagePerTrip: detailedEarnings.averagePerTrip || stats.averageEarningsPerTrip || 0,
                completedTrips: detailedEarnings.completedTrips || stats.completedTrips || 0,
                thisMonth: detailedEarnings.monthlyEarnings?.reduce((sum, earning) => sum + earning.amount, 0) || Math.round((stats.totalEarnings || 0) * 0.3),
                thisWeek: detailedEarnings.weeklyEarnings?.reduce((sum, earning) => sum + earning.amount, 0) || Math.round((stats.totalEarnings || 0) * 0.1),
                pendingPayouts: Math.round((detailedEarnings.totalEarnings || stats.totalEarnings || 0) * 0.05),
                recentEarnings: detailedEarnings.recentEarnings || [],
                breakdown: [
                    { 
                        period: 'Today', 
                        amount: detailedEarnings.recentEarnings?.filter(e => {
                            const today = new Date();
                            return e.date.toDateString() === today.toDateString();
                        }).reduce((sum, e) => sum + e.amount, 0) || Math.round((stats.totalEarnings || 0) * 0.02)
                    },
                    { 
                        period: 'This Week', 
                        amount: detailedEarnings.weeklyEarnings?.reduce((sum, earning) => sum + earning.amount, 0) || Math.round((stats.totalEarnings || 0) * 0.1)
                    },
                    { 
                        period: 'This Month', 
                        amount: detailedEarnings.monthlyEarnings?.reduce((sum, earning) => sum + earning.amount, 0) || Math.round((stats.totalEarnings || 0) * 0.3)
                    },
                    { 
                        period: 'Last Month', 
                        amount: Math.round((detailedEarnings.totalEarnings || stats.totalEarnings || 0) * 0.25)
                    },
                ]
            };
            
            setEarningsData(earnings);
        } catch (error) {
            console.error('Error fetching earnings:', error);
            Alert.alert('Error', 'Failed to load earnings data');
        }
    };

    const handleImagePicker = async () => {
        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
                return;
            }

            // Pick image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // Reduce quality for smaller base64
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                const base64 = result.assets[0].base64;
                
                // Update edit form with base64 image
                setEditForm(prev => ({
                    ...prev,
                    profileImage: `data:image/jpeg;base64,${base64}`
                }));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSaveProfile = async () => {
        try {
            setEditLoading(true);
            
            // Validate required fields
            if (!editForm.name.trim()) {
                Alert.alert('Error', 'Name is required');
                return;
            }

            // Use the enhanced update method that handles images
            await DriverService.updateDriverProfileWithImage(driverData.id, editForm);
            
            Alert.alert('Success', 'Profile updated successfully', [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowEditModal(false);
                        fetchDriverProfile(); // Refresh data
                    }
                }
            ]);
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setEditLoading(false);
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

    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        
        try {
            let date;
            if (dateValue.toDate) {
                date = dateValue.toDate();
            } else if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                date = new Date(dateValue);
            }
            
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return 'N/A';
        }
    };

    const calculateSuccessRate = (stats) => {
        if (!stats || stats.totalTrips === 0) return 98;
        return Math.round((stats.completedTrips / stats.totalTrips) * 100);
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

    const successRate = calculateSuccessRate(driverData.stats);

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
                        {driverData.title || driverData.bio || 'Professional Driver'}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                        Joined: {formatDate(driverData.registeredAt || driverData.createdAt)}
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

                {/* Enhanced Stats */}
                <View className="flex-row justify-around bg-gray-50 rounded-xl py-4 mb-4">
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {driverData.stats?.totalTrips || 0}
                        </Text>
                        <Text className="text-gray-500 text-sm">Total Deliveries</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {driverData.stats?.completedTrips || 0}
                        </Text>
                        <Text className="text-gray-500 text-sm">Completed</Text>
                    </View>
                    <View className="items-center">
                        <Text className="text-blue-600 font-bold text-lg">
                            {successRate}%
                        </Text>
                        <Text className="text-gray-500 text-sm">Success Rate</Text>
                    </View>
                </View>

                {/* Detailed Driver Information */}
                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                    <Text className="text-lg font-semibold mb-3">Driver Information</Text>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Full Name</Text>
                        <Text className="text-black font-semibold">
                            {driverData.name || driverData.fullName || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Phone Number</Text>
                        <Text className="text-black font-semibold">
                            {driverData.phoneNumber || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Email</Text>
                        <Text className="text-black font-semibold">
                            {driverData.email || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Location</Text>
                        <Text className="text-black font-semibold">
                            {driverData.location || driverData.city || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Vehicle</Text>
                        <Text className="text-black font-semibold">
                            {driverData.vehicleDetails?.make && driverData.vehicleDetails?.model
                                ? `${driverData.vehicleDetails.make} ${driverData.vehicleDetails.model} ${driverData.vehicleDetails.year || ''}`
                                : driverData.vehicle || 'Not provided'
                            }
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">License Number</Text>
                        <Text className="text-black font-semibold">
                            {driverData.licenseNumber || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View className="mb-3">
                        <Text className="text-gray-500 text-sm">Status</Text>
                        <View className="flex-row items-center">
                            <View className={`w-3 h-3 rounded-full mr-2 ${driverData.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <Text className="text-black font-semibold">
                                {driverData.isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                    
                    {driverData.bio && (
                        <View>
                            <Text className="text-gray-500 text-sm">Bio</Text>
                            <Text className="text-black font-semibold">
                                {driverData.bio}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row justify-between mb-6">
                    <TouchableOpacity 
                        className="flex-1 bg-blue-600 py-3 rounded-lg mr-2"
                        onPress={() => setShowEditModal(true)}
                    >
                        <Text className="text-white text-center font-semibold">Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="flex-1 bg-green-600 py-3 rounded-lg ml-2"
                        onPress={() => {
                            fetchEarningsData();
                            setShowEarningsModal(true);
                        }}
                    >
                        <Text className="text-white text-center font-semibold">View Earnings</Text>
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

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View className="flex-1 bg-white">
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Text className="text-blue-600 text-lg">Cancel</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-bold">Edit Profile</Text>
                        <TouchableOpacity onPress={handleSaveProfile} disabled={editLoading}>
                            {editLoading ? (
                                <ActivityIndicator size={20} color="#2563eb" />
                            ) : (
                                <Text className="text-blue-600 text-lg font-semibold">Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {/* Profile Picture Upload */}
                        <View className="items-center mb-6">
                            <TouchableOpacity onPress={handleImagePicker}>
                                <View className="relative">
                                    <Image
                                        source={{ 
                                            uri: editForm.profileImage || 
                                                 "https://randomuser.me/api/portraits/men/32.jpg" 
                                        }}
                                        className="w-24 h-24 rounded-full"
                                    />
                                    <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2">
                                        <Ionicons name="camera" size={16} color="white" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <Text className="text-gray-500 text-sm mt-2">Tap to change photo</Text>
                        </View>

                        {/* Form Fields */}
                        <View className="space-y-4">
                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">Full Name *</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.name}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                                    placeholder="Enter your full name"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">Phone Number</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.phoneNumber}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phoneNumber: text }))}
                                    placeholder="Enter your phone number"
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">Location</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.location}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, location: text }))}
                                    placeholder="Enter your location"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">City</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.city}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, city: text }))}
                                    placeholder="Enter your city"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">Vehicle</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.vehicle}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, vehicle: text }))}
                                    placeholder="e.g., Toyota Camry 2023"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">License Number</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.licenseNumber}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, licenseNumber: text }))}
                                    placeholder="Enter your license number"
                                />
                            </View>

                            <View>
                                <Text className="text-gray-700 font-semibold mb-1">Bio</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg p-3"
                                    value={editForm.bio}
                                    onChangeText={(text) => setEditForm(prev => ({ ...prev, bio: text }))}
                                    placeholder="Tell us about yourself"
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Earnings Modal */}
            <Modal
                visible={showEarningsModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View className="flex-1 bg-white">
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <TouchableOpacity onPress={() => setShowEarningsModal(false)}>
                            <Text className="text-blue-600 text-lg">Close</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-bold">Earnings</Text>
                        <View className="w-12" />
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {earningsData ? (
                            <>
                                {/* Total Earnings Card */}
                                <View className="bg-blue-600 rounded-xl p-6 mb-6">
                                    <Text className="text-white text-lg font-semibold">Total Earnings</Text>
                                    <Text className="text-white text-3xl font-bold">${earningsData.totalEarnings}</Text>
                                    <Text className="text-blue-200">From {earningsData.completedTrips} completed deliveries</Text>
                                </View>

                                {/* Quick Stats */}
                                <View className="flex-row justify-between mb-6">
                                    <View className="bg-green-50 rounded-lg p-4 flex-1 mr-2">
                                        <Text className="text-green-600 font-semibold">This Month</Text>
                                        <Text className="text-green-800 text-xl font-bold">${earningsData.thisMonth}</Text>
                                    </View>
                                    <View className="bg-orange-50 rounded-lg p-4 flex-1 ml-2">
                                        <Text className="text-orange-600 font-semibold">Average/Trip</Text>
                                        <Text className="text-orange-800 text-xl font-bold">${earningsData.averagePerTrip}</Text>
                                    </View>
                                </View>

                                {/* Earnings Breakdown */}
                                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                                    <Text className="text-lg font-semibold mb-3">Earnings Breakdown</Text>
                                    {earningsData.breakdown.map((item, index) => (
                                        <View key={index} className="flex-row justify-between items-center py-2">
                                            <Text className="text-gray-700">{item.period}</Text>
                                            <Text className="font-semibold">${item.amount}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Pending Payouts */}
                                <View className="bg-yellow-50 rounded-xl p-4 mb-6">
                                    <View className="flex-row items-center justify-between">
                                        <View>
                                            <Text className="text-yellow-800 font-semibold">Pending Payouts</Text>
                                            <Text className="text-yellow-600">Will be processed soon</Text>
                                        </View>
                                        <Text className="text-yellow-800 text-xl font-bold">${earningsData.pendingPayouts}</Text>
                                    </View>
                                </View>

                                {/* Payment Info */}
                                <View className="bg-gray-50 rounded-xl p-4">
                                    <Text className="text-lg font-semibold mb-2">Payment Information</Text>
                                    <Text className="text-gray-700 mb-1">• Payments are processed weekly</Text>
                                    <Text className="text-gray-700 mb-1">• Direct deposit to your bank account</Text>
                                    <Text className="text-gray-700">• Contact support for payment issues</Text>
                                </View>

                                {/* Recent Earnings Transactions */}
                                {earningsData.recentEarnings && earningsData.recentEarnings.length > 0 && (
                                    <View className="bg-white rounded-xl p-4 mt-6 border border-gray-200">
                                        <Text className="text-lg font-semibold mb-3">Recent Earnings</Text>
                                        {earningsData.recentEarnings.slice(0, 5).map((earning, index) => (
                                            <View key={earning.tripId || index} className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                                                <View className="flex-1">
                                                    <Text className="font-semibold text-gray-800">
                                                        Delivery to {earning.customerName}
                                                    </Text>
                                                    <Text className="text-gray-500 text-sm">
                                                        {earning.pickupLocation}
                                                    </Text>
                                                    <Text className="text-gray-400 text-xs">
                                                        {earning.date ? DriverService.getTimeAgo(earning.date) : 'Recently'}
                                                    </Text>
                                                </View>
                                                <View className="items-end">
                                                    <Text className="font-bold text-green-600 text-lg">
                                                        +${earning.amount}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                        
                                        {earningsData.recentEarnings.length > 5 && (
                                            <TouchableOpacity className="mt-3 py-2">
                                                <Text className="text-blue-600 text-center font-semibold">
                                                    View All Transactions
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </>
                        ) : (
                            <View className="flex-1 justify-center items-center">
                                <ActivityIndicator size="large" color="#2563eb" />
                                <Text className="mt-2 text-gray-600">Loading earnings data...</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

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
