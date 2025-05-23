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

        // Add timeout to prevent hanging operations
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Operation timed out')), 30000); // 30 second timeout
        });

        try {
            console.log('🔍 Starting PIN validation process for order:', rideRequest.id);
            
            // First, update status to 'collecting' to indicate driver is in collection process
            const rideRequestRef = doc(db, 'rideRequests', rideRequest.id);
            
            console.log('📝 Updating status to collecting...');
            await Promise.race([
                updateDoc(rideRequestRef, {
                    deliveryStatus: 'collecting',
                    collectionStartedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }),
                timeoutPromise
            ]);
            console.log('✅ Status updated to collecting');

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
                // Reset status if PIN is wrong
                await Promise.race([
                    updateDoc(rideRequestRef, {
                        deliveryStatus: 'accepted',
                        updatedAt: serverTimestamp()
                    }),
                    timeoutPromise
                ]);
                Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect. Please check with the customer and try again.');
                setEnteredPin('');
                return;
            }

            console.log('✅ PIN validation successful');
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
                'Package Collected!',
                'PIN verified successfully. You can now proceed to the delivery location.',
                [
                    {
                        text: 'Start Delivery',
                        onPress: () => {
                            try {
                                console.log('🚚 Navigating to OrderPreview...');
                                // Use navigate instead of replace to avoid navigation stack issues
                                navigation.navigate('OrderPreview', { 
                                    rideRequest: {
                                        ...rideRequest,
                                        deliveryStatus: 'in_transit'
                                    }
                                });
                                console.log('✅ Navigation completed successfully');
                            } catch (navigationError) {
                                console.error('❌ Navigation error:', navigationError);
                                // Fallback navigation
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
        if (packageDetails?.senderPhone) {
            Alert.alert(
                'Call Customer',
                `Call ${packageDetails.senderName || 'customer'} at ${packageDetails.senderPhone}?`,
                [
                    { text: 'Cancel' },
                    { text: 'Call', onPress: () => {
                        // Import Linking if needed
                        const { Linking } = require('react-native');
                        Linking.openURL(`tel:${packageDetails.senderPhone}`);
                    }}
                ]
            );
        } else {
            Alert.alert('Contact Info', 'Customer phone number not available.');
        }
    };

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
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center p-4 bg-white shadow-sm">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200"
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-lg font-bold ml-2 text-center">Package Collection</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1">
                {/* Map showing pickup location */}
                <View className="h-64 m-4 rounded-lg overflow-hidden">
                    <MapView
                        style={{ flex: 1 }}
                        initialRegion={{
                            latitude: pickupLocation?.latitude || 6.9271,
                            longitude: pickupLocation?.longitude || 79.8612,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        region={pickupLocation ? {
                            latitude: pickupLocation.latitude,
                            longitude: pickupLocation.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        } : undefined}
                    >
                        {pickupLocation && (
                            <Marker 
                                coordinate={pickupLocation} 
                                title="Pickup Location"
                                pinColor="blue"
                            />
                        )}
                    </MapView>
                </View>

                {/* Pickup Address */}
                <View className="mx-4 p-4 bg-blue-50 rounded-lg mb-4">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <FontAwesome name="map-marker" size={20} color="blue" />
                                <Text className="font-bold text-lg ml-2 text-blue-800">Pickup Location</Text>
                            </View>
                            <Text className="text-gray-700 mt-2">
                                {packageDetails?.pickupLocation || 'Pickup location not specified'}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            className="bg-blue-600 px-4 py-2 rounded-lg ml-3"
                            onPress={() => {
                                const address = encodeURIComponent(packageDetails?.pickupLocation || '');
                                const { Linking } = require('react-native');
                                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${address}`);
                            }}
                        >
                            <FontAwesome name="map" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Customer Information */}
                <View className="mx-4 p-4 bg-gray-50 rounded-lg mb-4">
                    <Text className="font-bold text-lg mb-3">Customer Information</Text>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="font-semibold">{packageDetails?.senderName || 'Customer'}</Text>
                            <Text className="text-gray-600">{packageDetails?.senderPhone || 'Phone not provided'}</Text>
                        </View>
                        {packageDetails?.senderPhone && (
                            <TouchableOpacity 
                                className="bg-green-600 px-4 py-2 rounded-lg"
                                onPress={handleCallCustomer}
                            >
                                <FontAwesome name="phone" size={16} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Package Details */}
                <View className="mx-4 p-4 bg-gray-50 rounded-lg mb-4">
                    <Text className="font-bold text-lg mb-3">Package Details</Text>
                    <Text className="text-gray-700">
                        <Text className="font-semibold">Item:</Text> {packageDetails?.packageName || 'Package'}
                    </Text>
                    <Text className="text-gray-700 mt-1">
                        <Text className="font-semibold">Type:</Text> {packageDetails?.shipmentType || 'Standard'}
                    </Text>
                    {packageDetails?.weight && (
                        <Text className="text-gray-700 mt-1">
                            <Text className="font-semibold">Weight:</Text> {packageDetails.weight} kg
                        </Text>
                    )}
                </View>

                {/* PIN Entry Section */}
                <View className="mx-4 p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <Text className="font-bold text-lg text-orange-800 mb-2">Collection Verification</Text>
                    <Text className="text-orange-700 mb-4">
                        Ask the customer for their 4-digit collection PIN and enter it below:
                    </Text>
                    
                    <TextInput
                        className="bg-white border border-orange-300 rounded-lg px-4 py-3 text-center text-2xl font-bold"
                        placeholder="Enter 4-digit PIN"
                        value={enteredPin}
                        onChangeText={setEnteredPin}
                        maxLength={4}
                        keyboardType="numeric"
                        autoFocus={true}
                    />
                </View>

                {/* Action Button */}
                <View className="mx-4 mb-6">
                    <TouchableOpacity 
                        className={`p-4 rounded-lg flex-row items-center justify-center ${
                            enteredPin.length === 4 ? 'bg-green-600' : 'bg-gray-400'
                        }`}
                        onPress={handlePackageCollected}
                        disabled={enteredPin.length !== 4 || isValidating}
                    >
                        {isValidating ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text className="text-white text-center font-bold ml-2">
                                    Verify PIN & Collect Package
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View className="mx-4 mb-6 p-4 bg-blue-50 rounded-lg">
                    <Text className="font-bold text-blue-800 mb-2">📋 Collection Instructions</Text>
                    <Text className="text-blue-700 text-sm">
                        1. Arrive at the pickup location{'\n'}
                        2. Contact the customer if needed{'\n'}
                        3. Ask for their 4-digit collection PIN{'\n'}
                        4. Enter the PIN to verify package collection{'\n'}
                        5. Proceed to delivery location
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

export default PackageCollection; 