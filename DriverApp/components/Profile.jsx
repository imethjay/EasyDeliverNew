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
    const [earningsLoading, setEarningsLoading] = useState(false);
    
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
            setEarningsLoading(true);
            setEarningsData(null); // Reset data to show loading
            
            // Debug: Investigate database structure first
            console.log('🔍 Starting earnings investigation for driver:', driverData.id);
            await DriverService.debugEarningsData(driverData.id);
            
            // Use the new detailed earnings method
            const detailedEarnings = await DriverService.getDriverEarnings(driverData.id);
            const profileData = await DriverService.getDriverProfile();
            const stats = profileData.stats || {};
            
            // Calculate today's earnings
            const today = new Date();
            const todayEarnings = Math.round((detailedEarnings.recentEarnings?.filter(e => {
                if (!e.date) return false;
                const earningDate = e.date instanceof Date ? e.date : e.date.toDate();
                return earningDate.toDateString() === today.toDateString();
            }).reduce((sum, e) => sum + e.amount, 0) || 0) * 100) / 100;
            
            // Calculate this week's earnings
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            weekStart.setHours(0, 0, 0, 0);
            
            const thisWeekEarnings = Math.round((detailedEarnings.recentEarnings?.filter(e => {
                if (!e.date) return false;
                const earningDate = e.date instanceof Date ? e.date : e.date.toDate();
                return earningDate >= weekStart;
            }).reduce((sum, e) => sum + e.amount, 0) || 0) * 100) / 100;
            
            // Calculate this month's earnings
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const thisMonthEarnings = Math.round((detailedEarnings.recentEarnings?.filter(e => {
                if (!e.date) return false;
                const earningDate = e.date instanceof Date ? e.date : e.date.toDate();
                return earningDate >= monthStart;
            }).reduce((sum, e) => sum + e.amount, 0) || 0) * 100) / 100;
            
            // Calculate last month's earnings
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            const lastMonthEarnings = Math.round((detailedEarnings.recentEarnings?.filter(e => {
                if (!e.date) return false;
                const earningDate = e.date instanceof Date ? e.date : e.date.toDate();
                return earningDate >= lastMonthStart && earningDate <= lastMonthEnd;
            }).reduce((sum, e) => sum + e.amount, 0) || 0) * 100) / 100;
            
            // Create comprehensive earnings breakdown using real data
            const earnings = {
                totalEarnings: detailedEarnings.totalEarnings || 0,
                averagePerTrip: detailedEarnings.averagePerTrip || 0,
                completedTrips: detailedEarnings.completedTrips || 0,
                thisMonth: thisMonthEarnings,
                thisWeek: thisWeekEarnings,
                today: todayEarnings,
                pendingPayouts: Math.round((detailedEarnings.totalEarnings || 0) * 0.05 * 100) / 100, // 5% pending
                recentEarnings: detailedEarnings.recentEarnings || [],
                breakdown: [
                    { 
                        period: 'Today', 
                        amount: todayEarnings,
                        icon: '📅'
                    },
                    { 
                        period: 'This Week', 
                        amount: thisWeekEarnings,
                        icon: '📊'
                    },
                    { 
                        period: 'This Month', 
                        amount: thisMonthEarnings,
                        icon: '📈'
                    },
                    { 
                        period: 'Last Month', 
                        amount: lastMonthEarnings,
                        icon: '📋'
                    },
                ],
                // Additional analytics
                analytics: {
                    bestDay: detailedEarnings.recentEarnings?.reduce((best, current) => {
                        const currentDate = current.date instanceof Date ? current.date : current.date?.toDate();
                        if (!currentDate) return best;
                        
                        const dayKey = currentDate.toDateString();
                        const dayEarnings = detailedEarnings.recentEarnings
                            .filter(e => {
                                const eDate = e.date instanceof Date ? e.date : e.date?.toDate();
                                return eDate && eDate.toDateString() === dayKey;
                            })
                            .reduce((sum, e) => sum + e.amount, 0);
                        
                        const roundedDayEarnings = Math.round(dayEarnings * 100) / 100;
                        return roundedDayEarnings > (best.amount || 0) ? { date: dayKey, amount: roundedDayEarnings } : best;
                    }, { date: 'N/A', amount: 0 }),
                    totalTripsThisWeek: detailedEarnings.recentEarnings?.filter(e => {
                        if (!e.date) return false;
                        const earningDate = e.date instanceof Date ? e.date : e.date.toDate();
                        return earningDate >= weekStart;
                    }).length || 0,
                    averagePerDay: thisWeekEarnings > 0 ? Math.round((thisWeekEarnings / 7) * 100) / 100 : 0
                }
            };
            
            setEarningsData(earnings);
        } catch (error) {
            console.error('Error fetching earnings:', error);
            Alert.alert('Error', 'Failed to load earnings data. Please check your connection and try again.');
            // Set empty earnings data to show error state
            setEarningsData({
                totalEarnings: 0,
                averagePerTrip: 0,
                completedTrips: 0,
                thisMonth: 0,
                thisWeek: 0,
                today: 0,
                pendingPayouts: 0,
                recentEarnings: [],
                breakdown: [],
                analytics: { bestDay: { date: 'N/A', amount: 0 }, totalTripsThisWeek: 0, averagePerDay: 0 }
            });
        } finally {
            setEarningsLoading(false);
        }
    };

    const refreshEarningsData = async () => {
        if (!driverData?.id) return;
        await fetchEarningsData();
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
                            setShowEarningsModal(true);
                            if (!earningsData) {
                                fetchEarningsData();
                            }
                        }}
                        disabled={earningsLoading}
                    >
                        <View className="flex-row items-center justify-center">
                            {earningsLoading ? (
                                <ActivityIndicator size={16} color="white" />
                            ) : (
                                <Ionicons name="cash-outline" size={16} color="white" />
                            )}
                            <Text className="text-white text-center font-semibold ml-2">
                                {earningsLoading ? 'Loading...' : 'View Earnings'}
                            </Text>
                        </View>
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
                        <TouchableOpacity 
                            onPress={refreshEarningsData}
                            disabled={earningsLoading}
                            className="flex-row items-center"
                        >
                            {earningsLoading ? (
                                <ActivityIndicator size={16} color="#2563eb" />
                            ) : (
                                <Ionicons name="refresh" size={20} color="#2563eb" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {earningsData ? (
                            <>
                                {/* Total Earnings Card */}
                                <View className="bg-blue-600 rounded-xl p-6 mb-6">
                                    <Text className="text-white text-lg font-semibold">Total Earnings</Text>
                                    <Text className="text-white text-3xl font-bold">LKR {earningsData.totalEarnings}</Text>
                                    <Text className="text-blue-200">From {earningsData.completedTrips} completed deliveries</Text>
                                </View>

                                {/* Quick Stats Row 1 */}
                                <View className="flex-row justify-between mb-4">
                                    <View className="bg-green-50 rounded-lg p-4 flex-1 mr-2">
                                        <Text className="text-green-600 font-semibold">Today</Text>
                                        <Text className="text-green-800 text-xl font-bold">LKR {earningsData.today}</Text>
                                    </View>
                                    <View className="bg-blue-50 rounded-lg p-4 flex-1 ml-2">
                                        <Text className="text-blue-600 font-semibold">This Week</Text>
                                        <Text className="text-blue-800 text-xl font-bold">LKR {earningsData.thisWeek}</Text>
                                    </View>
                                </View>

                                {/* Quick Stats Row 2 */}
                                <View className="flex-row justify-between mb-6">
                                    <View className="bg-purple-50 rounded-lg p-4 flex-1 mr-2">
                                        <Text className="text-purple-600 font-semibold">This Month</Text>
                                        <Text className="text-purple-800 text-xl font-bold">LKR {earningsData.thisMonth}</Text>
                                    </View>
                                    <View className="bg-orange-50 rounded-lg p-4 flex-1 ml-2">
                                        <Text className="text-orange-600 font-semibold">Average/Trip</Text>
                                        <Text className="text-orange-800 text-xl font-bold">LKR {earningsData.averagePerTrip}</Text>
                                    </View>
                                </View>

                                {/* Analytics Section */}
                                {earningsData.analytics && (
                                    <View className="bg-gray-50 rounded-xl p-4 mb-6">
                                        <Text className="text-lg font-semibold mb-3">📊 Weekly Analytics</Text>
                                        <View className="space-y-2">
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-gray-700">Trips This Week</Text>
                                                <Text className="font-semibold text-blue-600">{earningsData.analytics.totalTripsThisWeek}</Text>
                                            </View>
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-gray-700">Daily Average</Text>
                                                <Text className="font-semibold text-green-600">LKR {earningsData.analytics.averagePerDay}</Text>
                                            </View>
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-gray-700">Best Day</Text>
                                                <Text className="font-semibold text-purple-600">
                                                    LKR {earningsData.analytics.bestDay.amount} 
                                                    {earningsData.analytics.bestDay.date !== 'N/A' && 
                                                        ` (${new Date(earningsData.analytics.bestDay.date).toLocaleDateString('en-US', { weekday: 'short' })})`
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Earnings Breakdown */}
                                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                                    <Text className="text-lg font-semibold mb-3">💰 Earnings Breakdown</Text>
                                    {earningsData.breakdown.map((item, index) => (
                                        <View key={index} className="flex-row justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                                            <View className="flex-row items-center">
                                                <Text className="text-lg mr-2">{item.icon}</Text>
                                                <Text className="text-gray-700 font-medium">{item.period}</Text>
                                            </View>
                                            <Text className="font-bold text-lg">LKR {item.amount}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Pending Payouts */}
                                <View className="bg-yellow-50 rounded-xl p-4 mb-6">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <View className="flex-row items-center mb-1">
                                                <Text className="text-lg mr-2">⏳</Text>
                                                <Text className="text-yellow-800 font-semibold">Pending Payouts</Text>
                                            </View>
                                            <Text className="text-yellow-600">Will be processed within 3-5 business days</Text>
                                        </View>
                                        <Text className="text-yellow-800 text-xl font-bold">LKR {earningsData.pendingPayouts}</Text>
                                    </View>
                                </View>

                                {/* Payment Info */}
                                <View className="bg-gray-50 rounded-xl p-4 mb-6">
                                    <View className="flex-row items-center mb-2">
                                        <Text className="text-lg mr-2">💳</Text>
                                        <Text className="text-lg font-semibold">Payment Information</Text>
                                    </View>
                                    <View className="space-y-1">
                                        <Text className="text-gray-700">• Payments are processed weekly on Fridays</Text>
                                        <Text className="text-gray-700">• Direct deposit to your registered bank account</Text>
                                        <Text className="text-gray-700">• Minimum payout threshold: LKR 1,000</Text>
                                        <Text className="text-gray-700">• Contact support for payment issues</Text>
                                    </View>
                                </View>

                                {/* Recent Earnings Transactions */}
                                {earningsData.recentEarnings && earningsData.recentEarnings.length > 0 && (
                                    <View className="bg-white rounded-xl p-4 border border-gray-200">
                                        <View className="flex-row items-center mb-3">
                                            <Text className="text-lg mr-2">📋</Text>
                                            <Text className="text-lg font-semibold">Recent Earnings</Text>
                                        </View>
                                        {earningsData.recentEarnings.slice(0, 5).map((earning, index) => (
                                            <View key={earning.tripId || index} className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                                                <View className="flex-1">
                                                    <Text className="font-semibold text-gray-800">
                                                        Delivery to {earning.customerName}
                                                    </Text>
                                                    <Text className="text-gray-500 text-sm">
                                                        📍 {earning.pickupLocation}
                                                    </Text>
                                                    <Text className="text-gray-400 text-xs">
                                                        🕒 {earning.date ? DriverService.getTimeAgo(earning.date) : 'Recently'}
                                                    </Text>
                                                </View>
                                                <View className="items-end">
                                                    <Text className="font-bold text-green-600 text-lg">
                                                        +LKR {earning.amount}
                                                    </Text>
                                                    <Text className="text-gray-400 text-xs">Trip #{earning.tripId?.slice(-6)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                        
                                        {earningsData.recentEarnings.length > 5 && (
                                            <TouchableOpacity className="mt-3 py-2 bg-blue-50 rounded-lg">
                                                <Text className="text-blue-600 text-center font-semibold">
                                                    View All {earningsData.recentEarnings.length} Transactions
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {/* No Earnings Message */}
                                {earningsData.totalEarnings === 0 && (
                                    <View className="bg-blue-50 rounded-xl p-6 items-center">
                                        <Text className="text-4xl mb-2">🚀</Text>
                                        <Text className="text-blue-800 font-semibold text-lg mb-1">Start Earning Today!</Text>
                                        <Text className="text-blue-600 text-center mb-4">
                                            Complete your first delivery to start building your earnings history.
                                        </Text>
                                        
                                        {/* Debug Button */}
                                        <TouchableOpacity 
                                            className="bg-gray-200 px-4 py-2 rounded-lg mt-2"
                                            onPress={async () => {
                                                console.log('🔍 Manual debug investigation triggered');
                                                const debugResult = await DriverService.debugEarningsData(driverData.id);
                                                Alert.alert(
                                                    'Debug Results', 
                                                    `Found ${debugResult?.totalDocuments || 0} documents. Check console for details.`
                                                );
                                            }}
                                        >
                                            <Text className="text-gray-700 text-sm">🔍 Debug Database</Text>
                                        </TouchableOpacity>
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
