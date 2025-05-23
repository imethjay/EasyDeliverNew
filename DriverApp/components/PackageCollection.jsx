import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/init';

const PackageCollection = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { rideRequest } = route.params || {};
    
    const [enteredPin, setEnteredPin] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [pickupLocation, setPickupLocation] = useState(null);
    const [collectionStatus, setCollectionStatus] = useState('ready'); // ready, collecting, validating, completed

    const { packageDetails } = rideRequest || {};

    // Debug logging to check packageDetails data
    useEffect(() => {
        if (rideRequest) {
            console.log('🔍 PackageCollection received rideRequest:', {
                id: rideRequest.id,
                packageDetails: rideRequest.packageDetails,
                pickupLocation: rideRequest.packageDetails?.pickupLocation,
                dropoffLocation: rideRequest.packageDetails?.dropoffLocation
            });
        }
    }, [rideRequest]);

    // Get geocoding for pickup location
    const getGeocodingFromAddress = async (address) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng,
                };
            }
            return null;
        } catch (error) {
            console.error("Error in geocoding:", error);
            return null;
        }
    };

    // Set pickup location coordinates
    useEffect(() => {
        const getPickupCoordinates = async () => {
            if (packageDetails?.pickupLocation) {
                const coords = await getGeocodingFromAddress(packageDetails.pickupLocation);
                if (coords) {
                    setPickupLocation(coords);
                } else {
                    // Fallback to default location
                    setPickupLocation({ latitude: 6.9271, longitude: 79.8612 });
                }
            }
        };
        getPickupCoordinates();
    }, [packageDetails]);

    const handleStartCollection = async () => {
        setCollectionStatus('collecting');

        try {
            console.log('🔍 Starting collection process for order:', rideRequest.id);
            
            const rideRequestRef = doc(db, 'rideRequests', rideRequest.id);
            
            console.log('📝 Updating status to collecting...');
            await updateDoc(rideRequestRef, {
                deliveryStatus: 'collecting',
                collectionStartedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log('✅ Status updated to collecting');

            Alert.alert(
                'Collection Started',
                'Please ask the customer for the 4-digit PIN to collect the package.',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('❌ Error starting collection:', error);
            Alert.alert('Error', 'Failed to start collection process. Please try again.');
            setCollectionStatus('ready');
        }
    };

    const handlePackageCollected = async () => {
        if (!enteredPin.trim()) {
            Alert.alert('PIN Required', 'Please enter the 4-digit PIN provided by the customer.');
            return;
        }

        if (enteredPin.length !== 4) {
            Alert.alert('Invalid PIN', 'PIN must be 4 digits.');
            return;
        }

        setIsValidating(true);
        setCollectionStatus('validating');

        // Add timeout to prevent hanging operations
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), 30000); // 30 second timeout
        });

        try {
            console.log('🔍 Starting PIN validation process for order:', rideRequest.id);
            
            const rideRequestRef = doc(db, 'rideRequests', rideRequest.id);

            // Get the current ride request to validate PIN
            console.log('📖 Fetching current ride request data...');
            const rideRequestDoc = await Promise.race([
                getDoc(rideRequestRef),
                timeoutPromise
            ]);
            
            if (!rideRequestDoc.exists()) {
                console.error('❌ Ride request document not found');
                Alert.alert('Error', 'Delivery request not found.');
                return;
            }

            const rideData = rideRequestDoc.data();
            console.log('📋 Retrieved ride data, validating PIN...');
            
            // Validate PIN
            if (rideData.deliveryPin !== enteredPin) {
                console.log('❌ PIN validation failed - incorrect PIN');
                Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect. Please check with the customer and try again.');
                setEnteredPin('');
                setCollectionStatus('collecting');
                return;
            }

            console.log('✅ PIN validation successful');
            setCollectionStatus('completed');
            
            // PIN is correct - update delivery status to in_transit
            console.log('📝 Updating status to in_transit...');
            await Promise.race([
                updateDoc(rideRequestRef, {
                    deliveryStatus: 'in_transit',
                    packageCollectedAt: serverTimestamp(),
                    collectionPinValidated: true,
                    updatedAt: serverTimestamp()
                }),
                timeoutPromise
            ]);
            console.log('✅ Status updated to in_transit');

            // Show success message first
            console.log('🎉 Package collection completed successfully');
            Alert.alert(
                'Package Collected Successfully!',
                'PIN verified. You can now proceed to the delivery location.',
                [
                    {
                        text: 'Start Delivery',
                        onPress: () => {
                            try {
                                console.log('🚚 Navigating to OrderPreview...');
                                navigation.navigate('OrderPreview', { 
                                    rideRequest: {
                                        ...rideRequest,
                                        deliveryStatus: 'in_transit'
                                    }
                                });
                                console.log('✅ Navigation completed successfully');
                            } catch (navigationError) {
                                console.error('❌ Navigation error:', navigationError);
                                Alert.alert(
                                    'Navigation Error',
                                    'Unable to navigate to order preview. Returning to previous screen.',
                                    [
                                        {
                                            text: 'OK',
                                            onPress: () => navigation.goBack()
                                        }
                                    ]
                                );
                            }
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('❌ Error validating PIN:', error);
            setCollectionStatus('collecting');
            if (error.message === 'Operation timed out') {
                Alert.alert('Timeout', 'The operation is taking too long. Please check your internet connection and try again.');
            } else {
                Alert.alert('Error', 'Failed to validate PIN. Please try again.');
            }
        } finally {
            setIsValidating(false);
        }
    };

    const handleCallCustomer = () => {
        if (packageDetails?.customerPhone) {
            Alert.alert(
                'Call Customer',
                `Call ${packageDetails.customerPhone}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Call', 
                        onPress: () => {
                            const phoneUrl = `tel:${packageDetails.customerPhone}`;
                            Linking.openURL(phoneUrl).catch(err => {
                                console.error('Error opening phone app:', err);
                                Alert.alert('Error', 'Cannot open phone app');
                            });
                        }
                    }
                ]
            );
        } else {
            Alert.alert('Contact Information', 'Customer phone number is not available.');
        }
    };

    // Get status information for UI
    const getStatusInfo = () => {
        switch (collectionStatus) {
            case 'ready':
                return {
                    title: 'Ready for Collection',
                    message: 'Tap "Start Collection" when you arrive at the pickup location',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    icon: 'location-outline'
                };
            case 'collecting':
                return {
                    title: 'Collecting Package',
                    message: 'Ask the customer for the 4-digit PIN',
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    icon: 'cube-outline'
                };
            case 'validating':
                return {
                    title: 'Validating PIN',
                    message: 'Please wait while we verify the PIN...',
                    color: 'text-purple-600',
                    bgColor: 'bg-purple-50',
                    icon: 'key-outline'
                };
            case 'completed':
                return {
                    title: 'Collection Complete',
                    message: 'Package collected successfully!',
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    icon: 'checkmark-circle-outline'
                };
            default:
                return {
                    title: 'Collection',
                    message: 'Preparing for collection...',
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                    icon: 'ellipsis-horizontal'
                };
        }
    };

    const statusInfo = getStatusInfo();

    if (!rideRequest) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Ionicons name="alert-circle-outline" size={64} color="gray" />
                <Text className="text-gray-600 text-lg mt-4">No delivery data found</Text>
                <TouchableOpacity 
                    className="bg-blue-600 px-6 py-3 rounded-lg mt-4"
                    onPress={() => navigation.navigate("DriverHome")}
                >
                    <Text className="text-white font-medium">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-blue-600 p-6 pb-8">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold ml-4">Package Collection</Text>
                </View>

                {/* Status Card */}
                <View className="bg-white rounded-xl p-4">
                    <View className="flex-row items-center">
                        <View className={`p-3 rounded-full ${statusInfo.bgColor} mr-4`}>
                            <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color.replace('text-', '#')} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-800 mb-1">{statusInfo.title}</Text>
                            <Text className="text-gray-600 text-sm">{statusInfo.message}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Map View */}
            {pickupLocation && (
                <View className="h-64 mx-4 rounded-xl overflow-hidden mb-4 shadow-sm">
                    <MapView
                        style={{ flex: 1 }}
                        region={{
                            latitude: pickupLocation.latitude,
                            longitude: pickupLocation.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Marker
                            coordinate={pickupLocation}
                            title="Pickup Location"
                            description={packageDetails?.pickupLocation}
                        />
                    </MapView>
                </View>
            )}

            {/* Package Information */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-3">Package Information</Text>
                
                {packageDetails && (
                    <>
                        <View className="mb-3">
                            <Text className="font-semibold text-gray-800 mb-1">{packageDetails.packageName}</Text>
                            <Text className="text-gray-600">{packageDetails.shipmentType}</Text>
                            {packageDetails.weight && (
                                <Text className="text-gray-500 text-sm">Weight: {packageDetails.weight} kg</Text>
                            )}
                        </View>

                        <View className="space-y-2">
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Pickup Address</Text>
                                <Text className="text-gray-800">{packageDetails.pickupLocation}</Text>
                            </View>
                            
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Delivery Address</Text>
                                <Text className="text-gray-800">{packageDetails.dropoffLocation}</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* PIN Entry Section - Only show when collecting */}
            {collectionStatus === 'collecting' && (
                <View className="mx-4 bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <Text className="text-orange-800 font-bold text-lg mb-2">Enter Collection PIN</Text>
                    <Text className="text-orange-600 text-sm mb-4">
                        Ask the customer for the 4-digit PIN to verify package collection.
                    </Text>
                    
                    <View className="flex-row items-center space-x-4">
                        <TextInput
                            value={enteredPin}
                            onChangeText={setEnteredPin}
                            placeholder="Enter 4-digit PIN"
                            keyboardType="numeric"
                            maxLength={4}
                            className="flex-1 bg-white border border-orange-300 rounded-lg px-4 py-3 text-lg font-bold text-center"
                            style={{ letterSpacing: 4 }}
                        />
                        <TouchableOpacity
                            onPress={handlePackageCollected}
                            disabled={isValidating || enteredPin.length !== 4}
                            className={`px-6 py-3 rounded-lg ${
                                enteredPin.length === 4 && !isValidating 
                                    ? 'bg-orange-600' 
                                    : 'bg-gray-400'
                            }`}
                        >
                            {isValidating ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text className="text-white font-bold">Verify</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            <View className="mx-4 mb-6">
                {collectionStatus === 'ready' && (
                    <TouchableOpacity
                        onPress={handleStartCollection}
                        className="bg-blue-600 p-4 rounded-xl mb-3"
                    >
                        <Text className="text-white text-center font-bold text-lg">Start Collection</Text>
                    </TouchableOpacity>
                )}

                {/* Customer Contact */}
                <View className="flex-row space-x-3">
                    <TouchableOpacity
                        onPress={handleCallCustomer}
                        className="flex-1 bg-gray-100 p-4 rounded-xl flex-row items-center justify-center"
                    >
                        <FontAwesome name="phone" size={20} color="#4B5563" />
                        <Text className="text-gray-700 font-medium ml-2">Call Customer</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={() => {
                            if (rideRequest?.customerId) {
                                navigation.navigate('ChatScreen', {
                                    recipientId: rideRequest.customerId,
                                    recipientName: packageDetails?.senderName || "Customer",
                                    orderId: rideRequest.id
                                });
                            }
                        }}
                        className="flex-1 bg-blue-100 p-4 rounded-xl flex-row items-center justify-center"
                    >
                        <Ionicons name="chatbubble-ellipses" size={20} color="#2563EB" />
                        <Text className="text-blue-700 font-medium ml-2">Chat Customer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default PackageCollection; 