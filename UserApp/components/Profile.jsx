import React, { useState, useEffect } from "react";
import { useAuth } from "./auth/AuthContext";
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    ScrollView, 
    Alert, 
    ActivityIndicator, 
    TextInput, 
    Modal 
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';

const Profile = ({ navigation }) => {
    const { user, userProfile, logout, updateUserProfile } = useAuth();
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState("Profile");
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingField, setEditingField] = useState(null);
    const [tempValue, setTempValue] = useState("");
    const [updating, setUpdating] = useState(false);

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

    const handleProfileImageUpdate = () => {
        console.log('🖼️ Profile image update requested');
        Alert.alert(
            "Update Profile Picture",
            "Choose an option:",
            [
                {
                    text: "Camera",
                    onPress: () => {
                        console.log('📷 Camera option selected');
                        openImagePicker('camera');
                    }
                },
                {
                    text: "Photo Library", 
                    onPress: () => {
                        console.log('📱 Photo library option selected');
                        openImagePicker('library');
                    }
                },
                {
                    text: "Cancel",
                    style: "cancel",
                    onPress: () => console.log('❌ Image picker cancelled by user')
                }
            ]
        );
    };

    const openImagePicker = async (sourceType) => {
        try {
            console.log(`🎯 Opening image picker with source: ${sourceType}`);
            
            // Request permissions
            if (sourceType === 'camera') {
                console.log('🔒 Requesting camera permissions...');
                const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
                console.log('📋 Camera permission status:', cameraPermission.status);
                
                if (cameraPermission.status !== 'granted') {
                    console.log('❌ Camera permission denied');
                    Alert.alert(
                        'Permission Required',
                        'Sorry, we need camera permissions to take photos. Please enable camera access in your device settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Settings', onPress: () => ImagePicker.openSettingsAsync?.() }
                        ]
                    );
                    return;
                }
                console.log('✅ Camera permission granted');
            } else {
                console.log('🔒 Requesting media library permissions...');
                const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                console.log('📋 Media library permission status:', mediaLibraryPermission.status);
                
                if (mediaLibraryPermission.status !== 'granted') {
                    console.log('❌ Media library permission denied');
                    Alert.alert(
                        'Permission Required',
                        'Sorry, we need photo library permissions to select images. Please enable photo access in your device settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Settings', onPress: () => ImagePicker.openSettingsAsync?.() }
                        ]
                    );
                    return;
                }
                console.log('✅ Media library permission granted');
            }

            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: false,
            };

            console.log('🚀 Launching image picker with options:', options);
            
            let result;
            if (sourceType === 'camera') {
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            console.log('📸 Image picker result:', {
                canceled: result.canceled,
                hasAssets: !!result.assets,
                assetsLength: result.assets?.length
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                console.log('✅ Image selected, processing...');
                handleImageResponse(result.assets[0]);
            } else {
                console.log('❌ No image selected or picker was cancelled');
            }
        } catch (error) {
            console.error('💥 Error in openImagePicker:', error);
            Alert.alert('Error', 'Failed to open image picker. Please try again.');
        }
    };

    const handleImageResponse = async (asset) => {
        console.log('📄 Image response received:', {
            uri: asset?.uri ? 'present' : 'missing',
            type: asset?.type,
            fileName: asset?.fileName,
            fileSize: asset?.fileSize,
            width: asset?.width,
            height: asset?.height
        });

        if (!asset || !asset.uri) {
            console.log('❌ No valid image asset received');
            return;
        }

        setUploadingImage(true);
        try {
            console.log('🔄 Starting image processing...');
            
            // Check file size (if available) - be more restrictive for Base64 storage
            const maxSize = 2 * 1024 * 1024; // 2MB limit for Base64 storage
            if (asset.fileSize && asset.fileSize > maxSize) {
                throw new Error('Image too large. Please select an image under 2MB for profile pictures.');
            }
            console.log(`📏 File size check passed: ${asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(2)}MB` : 'unknown'}`);
            
            // Fetch image data
            console.log('🔄 Fetching image data...');
            const response = await fetch(asset.uri);
            if (!response.ok) {
                throw new Error(`Failed to read image file: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            
            console.log(`📦 Image blob created - Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB, Type: ${blob.type}`);
            
            // Double-check blob size for Base64 storage
            if (blob.size > maxSize) {
                throw new Error('Image too large. Please select an image under 2MB for profile pictures.');
            }
            
            // Convert blob to Base64
            console.log('🔄 Converting image to Base64...');
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.result) {
                        resolve(reader.result);
                    } else {
                        reject(new Error('Failed to convert image to Base64'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read image file'));
                reader.readAsDataURL(blob);
            });
            
            console.log(`✅ Base64 conversion completed - Length: ${base64.length} characters`);
            
            // Validate Base64 size (Firestore has 1MB document limit)
            const base64SizeInBytes = base64.length * 0.75; // Approximate size
            const maxFirestoreSize = 800 * 1024; // 800KB to leave room for other profile data
            
            if (base64SizeInBytes > maxFirestoreSize) {
                throw new Error('Image is too large when converted to Base64. Please select a smaller image or reduce quality.');
            }
            
            console.log(`📊 Base64 size: ${(base64SizeInBytes / 1024).toFixed(2)}KB`);
            
            // Update user profile with Base64 image
            console.log('👤 Updating user profile with Base64 image...');
            await updateUserProfile({ profileImage: base64 });
            
            console.log('🎉 Profile picture updated successfully!');
            Alert.alert('Success', 'Profile picture updated successfully!');
        } catch (error) {
            console.error('💥 Error processing image:', error);
            let errorMessage = 'Failed to update profile picture. Please try again.';
            
            if (error.message.includes('too large')) {
                errorMessage = error.message;
                console.log('📏 Image size error:', error.message);
            } else if (error.message.includes('Base64')) {
                errorMessage = 'Failed to process image. Please try a different image.';
                console.log('🔄 Base64 conversion error:', error.message);
            } else if (error.message) {
                errorMessage = error.message;
                console.log('📝 Custom error message:', error.message);
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            console.log('🏁 Image processing finished, stopping loading indicator');
            setUploadingImage(false);
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

    const handleEditProfile = () => {
        navigation.navigate('EditProfile');
    };

    const openEditModal = (field, currentValue) => {
        setEditingField(field);
        setTempValue(currentValue || '');
        setEditModalVisible(true);
    };

    const handleSaveField = async () => {
        if (!tempValue.trim()) {
            Alert.alert('Error', 'Please enter a valid value');
            return;
        }

        setUpdating(true);
        try {
            const updates = {};
            updates[editingField] = tempValue.trim();
            
            await updateUserProfile(updates);
            setEditModalVisible(false);
            setEditingField(null);
            setTempValue('');
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    // Get user display information
    const getUserDisplayName = () => {
        return userProfile?.name || userProfile?.fullName || user?.displayName || 'User';
    };

    const getUserEmail = () => {
        return userProfile?.email || user?.email || '';
    };

    const getUserPhone = () => {
        return userProfile?.mobile || userProfile?.phoneNumber || '';
    };

    const getUserAddress = () => {
        if (userProfile?.address) {
            let fullAddress = userProfile.address;
            if (userProfile.city) {
                fullAddress += `, ${userProfile.city}`;
            }
            if (userProfile.state) {
                fullAddress += `, ${userProfile.state}`;
            }
            if (userProfile.zipCode) {
                fullAddress += ` ${userProfile.zipCode}`;
            }
            return fullAddress;
        }
        return '';
    };

    const getUserDateOfBirth = () => {
        return userProfile?.dateOfBirth || '';
    };

    const getUserGender = () => {
        return userProfile?.gender || '';
    };

    const getUserEmergencyContact = () => {
        return userProfile?.emergencyContact || '';
    };

    const getUserOccupation = () => {
        return userProfile?.occupation || '';
    };

    const getProfileImageUri = () => {
        const profileImage = userProfile?.profileImage;
        
        // If no profile image, return default
        if (!profileImage) {
            return "https://randomuser.me/api/portraits/women/44.jpg";
        }
        
        // If it's already a Base64 data URI, return as is
        if (profileImage.startsWith('data:image/')) {
            console.log('📸 Using Base64 profile image');
            return profileImage;
        }
        
        // If it's a regular URL, return as is
        if (profileImage.startsWith('http')) {
            console.log('🌐 Using URL profile image');
            return profileImage;
        }
        
        // Fallback to default
        console.log('⚠️ Invalid profile image format, using default');
        return "https://randomuser.me/api/portraits/women/44.jpg";
    };

    const formatFieldLabel = (field) => {
        const labels = {
            name: 'Full Name',
            email: 'Email Address',
            mobile: 'Phone Number',
            address: 'Home Address',
            city: 'City',
            state: 'State',
            zipCode: 'ZIP Code',
            dateOfBirth: 'Date of Birth',
            gender: 'Gender',
            emergencyContact: 'Emergency Contact',
            occupation: 'Occupation'
        };
        return labels[field] || field || 'field';
    };

    const renderEditModal = () => (
        <Modal
            visible={editModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
                <View className="bg-white rounded-2xl p-6 mx-4 w-80">
                    <Text className="text-lg font-bold mb-4">
                        Edit {formatFieldLabel(editingField)}
                    </Text>
                    
                    <TextInput
                        className="border border-gray-300 rounded-lg p-3 mb-4 text-base"
                        value={tempValue}
                        onChangeText={setTempValue}
                        placeholder={`Enter ${(formatFieldLabel(editingField) || 'value').toLowerCase()}`}
                        multiline={editingField === 'address'}
                        numberOfLines={editingField === 'address' ? 3 : 1}
                        autoFocus={true}
                    />
                    
                    <View className="flex-row justify-between">
                        <TouchableOpacity
                            className="flex-1 bg-gray-200 p-3 rounded-lg mr-2"
                            onPress={() => setEditModalVisible(false)}
                            disabled={updating}
                        >
                            <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="flex-1 bg-blue-500 p-3 rounded-lg ml-2"
                            onPress={handleSaveField}
                            disabled={updating}
                        >
                            {updating ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-center text-white font-semibold">Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View className="flex-1 w-full bg-gray-100">
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="flex-row w-full items-center justify-between mb-6">
                    <TouchableOpacity 
                        className="rounded-full p-2 border-2 border-gray-200"
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Ionicons name="arrow-back" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-extrabold">My Profile</Text>
                    <View className="w-10" />
                </View>

                {/* Profile Picture & Basic Info */}
                <View className="items-center mb-6">
                    <View className="relative">
                        <Image
                            source={{
                                uri: getProfileImageUri(),
                            }}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                            onError={(error) => {
                                console.log('⚠️ Profile image failed to load:', error.nativeEvent.error);
                                // The Image component will automatically show a broken image icon
                            }}
                            defaultSource={{
                                uri: "https://randomuser.me/api/portraits/women/44.jpg"
                            }}
                        />
                        {uploadingImage && (
                            <View className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-50 items-center justify-center">
                                <ActivityIndicator size="large" color="white" />
                            </View>
                        )}
                        <TouchableOpacity 
                            className="absolute bottom-2 right-2 bg-blue-500 p-2 rounded-full shadow-lg"
                            onPress={handleProfileImageUpdate}
                            disabled={uploadingImage}
                        >
                            <Ionicons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-2xl font-bold mt-4 text-gray-800">{getUserDisplayName()}</Text>
                    <Text className="text-gray-500 text-base">{getUserEmail()}</Text>
                    {userProfile?.userType && (
                        <View className="bg-blue-100 px-3 py-1 rounded-full mt-2">
                            <Text className="text-blue-600 font-medium capitalize">{userProfile.userType}</Text>
                        </View>
                    )}
                </View>

                {/* Personal Information */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-800">Personal Information</Text>
                        <TouchableOpacity
                            className="bg-blue-50 p-2 rounded-lg"
                            onPress={() => openEditModal('name', getUserDisplayName())}
                        >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                    
                    <View className="space-y-4">
                        <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="person-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Full Name</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserDisplayName() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('name', getUserDisplayName())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Date of Birth</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserDateOfBirth() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('dateOfBirth', getUserDateOfBirth())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between py-2">
                            <View className="flex-row items-center flex-1">
                                <MaterialIcons name="wc" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Gender</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserGender() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('gender', getUserGender())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Contact Information */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-800">Contact Information</Text>
                        <TouchableOpacity
                            className="bg-blue-50 p-2 rounded-lg"
                            onPress={() => openEditModal('mobile', getUserPhone())}
                        >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                    
                    <View className="space-y-4">
                        <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Email Address</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserEmail() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('email', getUserEmail())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="call-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Phone Number</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserPhone() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('mobile', getUserPhone())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center justify-between py-2">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="call-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Emergency Contact</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {getUserEmergencyContact() || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('emergencyContact', getUserEmergencyContact())}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Address Information */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-800">Address Information</Text>
                        <TouchableOpacity
                            className="bg-blue-50 p-2 rounded-lg"
                            onPress={() => openEditModal('address', userProfile?.address)}
                        >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                    
                    <View className="space-y-4">
                        <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="location-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">Home Address</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {userProfile?.address || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('address', userProfile?.address)}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-between">
                            <View className="flex-1 mr-2">
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                                    <View className="flex-row items-center flex-1">
                                        <Ionicons name="business-outline" size={20} color="#6B7280" />
                                        <View className="ml-3">
                                            <Text className="text-sm text-gray-500">City</Text>
                                            <Text className="text-base text-gray-800 font-medium">
                                                {userProfile?.city || 'Not set'}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => openEditModal('city', userProfile?.city)}>
                                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-1 ml-2">
                                <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                                    <View className="flex-row items-center flex-1">
                                        <Ionicons name="map-outline" size={20} color="#6B7280" />
                                        <View className="ml-3">
                                            <Text className="text-sm text-gray-500">State</Text>
                                            <Text className="text-base text-gray-800 font-medium">
                                                {userProfile?.state || 'Not set'}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => openEditModal('state', userProfile?.state)}>
                                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View className="flex-row items-center justify-between py-2">
                            <View className="flex-row items-center flex-1">
                                <Ionicons name="mail-outline" size={20} color="#6B7280" />
                                <View className="ml-3">
                                    <Text className="text-sm text-gray-500">ZIP Code</Text>
                                    <Text className="text-base text-gray-800 font-medium">
                                        {userProfile?.zipCode || 'Not set'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => openEditModal('zipCode', userProfile?.zipCode)}>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Additional Information */}
                <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-800">Additional Information</Text>
                        <TouchableOpacity
                            className="bg-blue-50 p-2 rounded-lg"
                            onPress={() => openEditModal('occupation', getUserOccupation())}
                        >
                            <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                    
                    <View className="flex-row items-center justify-between py-2">
                        <View className="flex-row items-center flex-1">
                            <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
                            <View className="ml-3">
                                <Text className="text-sm text-gray-500">Occupation</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {getUserOccupation() || 'Not set'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => openEditModal('occupation', getUserOccupation())}>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Actions */}
                <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Account Actions</Text>
                    
                    <TouchableOpacity 
                        className="flex-row items-center justify-between py-3 border-b border-gray-100"
                        onPress={() => navigation.navigate('ChangePassword')}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
                            <Text className="ml-3 text-base text-gray-800">Change Password</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="flex-row items-center justify-between py-3 border-b border-gray-100"
                        onPress={() => navigation.navigate('PrivacySettings')}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
                            <Text className="ml-3 text-base text-gray-800">Privacy & Security</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="flex-row items-center justify-between py-3"
                        onPress={() => navigation.navigate('HelpSupport')}
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
                            <Text className="ml-3 text-base text-gray-800">Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
                    <TouchableOpacity 
                        onPress={handleLogout}
                        className="flex-row items-center justify-center py-4 bg-red-500 rounded-xl"
                        activeOpacity={0.8}
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" />
                        <Text className="text-white font-bold text-base ml-2">Logout</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Modal */}
            {renderEditModal()}

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
