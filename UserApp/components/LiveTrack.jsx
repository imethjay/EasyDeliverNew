import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Linking, ScrollView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as Location from "expo-location";
import { collection, query, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { auth, db, rtdb } from "../firebase/init";


const GOOGLE_MAPS_API_KEY = "AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE"; 

const LiveTrack = ({ navigation, route }) => {
    const [region, setRegion] = useState(null);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userUID, setUserUID] = useState(null);
    const [pickupCoordinates, setPickupCoordinates] = useState(null);
    const [dropoffCoordinates, setDropoffCoordinates] = useState(null);
    const [routeInfo, setRouteInfo] = useState({
        distance: null,
        duration: null,
        instructions: []
    });
    const [activeRoute, setActiveRoute] = useState('pickup'); 
    const [isMapReady, setIsMapReady] = useState(false);
    const mapRef = useRef(null);

    // Get order data from navigation params or find active order
    const orderData = route?.params?.order;

    // Get current user UID
    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            setUserUID(user.uid);
        } else {
            console.log('No authenticated user found');
            setLoading(false);
        }
    }, []);

    // Get current location permission and set initial region
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.log("Permission to access location was denied");
                setRegion({
                    latitude: 6.9271,
                    longitude: 79.8612,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        })();
    }, []);

    // Geocoding function to convert addresses to coordinates
    const geocodeAddress = async (address) => {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    };

    // Extract coordinates from order data
    useEffect(() => {
        if (currentOrder?.packageDetails) {
            const { pickupLocation, dropoffLocation } = currentOrder.packageDetails;
            
            if (currentOrder.packageDetails.pickupCoordinates) {
                setPickupCoordinates(currentOrder.packageDetails.pickupCoordinates);
            } else if (pickupLocation) {
                geocodeAddress(pickupLocation).then(coords => {
                    if (coords) setPickupCoordinates(coords);
                });
            }

            if (currentOrder.packageDetails.dropoffCoordinates) {
                setDropoffCoordinates(currentOrder.packageDetails.dropoffCoordinates);
            } else if (dropoffLocation) {
                geocodeAddress(dropoffLocation).then(coords => {
                    if (coords) setDropoffCoordinates(coords);
                });
            }
        }
    }, [currentOrder]);

    // Determine active route based on delivery status
    useEffect(() => {
        if (currentOrder?.deliveryStatus) {
            switch (currentOrder.deliveryStatus) {
                case 'accepted':
                case 'collecting':
                    setActiveRoute('pickup');
                    break;
                case 'in_transit':
                    setActiveRoute('dropoff');
                    break;
                default:
                    setActiveRoute('pickup');
            }
        }
    }, [currentOrder?.deliveryStatus]);

    // Fetch current active order if not provided via navigation
    useEffect(() => {
        if (orderData) {
            setCurrentOrder(orderData);
            setLoading(false);
            return;
        }

        if (!userUID) return;

        console.log('Fetching active order for user:', userUID);
        
        const activeOrderQuery = query(
            collection(db, 'rideRequests'),
            where('customerId', '==', userUID),
            where('deliveryStatus', 'in', ['accepted', 'collecting', 'in_transit']),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(activeOrderQuery, (snapshot) => {
            try {
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    const data = doc.data();
                    setCurrentOrder({
                        ...data,
                        rideRequestId: doc.id
                    });
                    console.log('✅ Found active order:', doc.id);
                } else {
                    console.log('No active orders found');
                    setCurrentOrder(null);
                }
                setLoading(false);
            } catch (error) {
                console.error('❌ Error fetching active order:', error);
                setLoading(false);
            }
        }, (error) => {
            console.error('❌ Error listening to active orders:', error);
            setLoading(false);
        });

        return () => {
            console.log('🧹 Cleaning up active order listener');
            unsubscribe();
        };
    }, [userUID, orderData]);

    // Listen to real-time driver location if we have an active order
    useEffect(() => {
        if (!currentOrder?.rideRequestId || !currentOrder?.driver?.id) {
            console.log('⚠️ Missing order data for location tracking:', {
                hasOrder: !!currentOrder,
                rideRequestId: currentOrder?.rideRequestId,
                driverId: currentOrder?.driver?.id
            });
            return;
        }

        console.log('🚗 Setting up driver location listener for:', {
            rideRequestId: currentOrder.rideRequestId,
            driverId: currentOrder.driver.id,
            path: `driverLocations/${currentOrder.rideRequestId}/${currentOrder.driver.id}`
        });

        // Primary: Listen to Firebase Realtime Database
        const locationRef = ref(rtdb, `driverLocations/${currentOrder.rideRequestId}/${currentOrder.driver.id}`);
        
        const locationListener = onValue(locationRef, (snapshot) => {
            try {
                const locationData = snapshot.val();
                
                if (locationData && locationData.latitude && locationData.longitude) {
                    console.log('📍 Received driver location update from Realtime DB:', {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        timestamp: locationData.timestamp,
                        accuracy: locationData.accuracy
                    });
                    setDriverLocation({
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        heading: locationData.heading || 0,
                        speed: locationData.speed || 0
                    });
                } else {
                    console.log('⚠️ No driver location data available in Realtime DB, checking Firestore...');
                    // Fallback to Firestore if Realtime DB has no data
                    checkFirestoreLocation();
                }
            } catch (error) {
                console.error('❌ Error processing driver location update from Realtime DB:', error);
                // Try Firestore as fallback
                checkFirestoreLocation();
            }
        }, (error) => {
            console.error('❌ Error listening to driver location in Realtime DB:', error);
            console.log('🔄 Falling back to Firestore location tracking...');
            // Try Firestore as fallback
            checkFirestoreLocation();
        });

        // Fallback: Check Firestore for driver location
        const checkFirestoreLocation = async () => {
            try {
                const rideRequestRef = doc(db, 'rideRequests', currentOrder.rideRequestId);
                const unsubscribeFirestore = onSnapshot(rideRequestRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        const firestoreLocation = data.currentDriverLocation;
                        
                        if (firestoreLocation && firestoreLocation.latitude && firestoreLocation.longitude) {
                            console.log('📍 Received driver location update from Firestore:', {
                                latitude: firestoreLocation.latitude,
                                longitude: firestoreLocation.longitude,
                                updatedAt: firestoreLocation.updatedAt
                            });
                            setDriverLocation({
                                latitude: firestoreLocation.latitude,
                                longitude: firestoreLocation.longitude,
                                heading: firestoreLocation.heading || 0,
                                speed: 0
                            });
                        } else {
                            console.log('⚠️ No driver location data available in Firestore either');
                            setDriverLocation(null);
                        }
                    }
                }, (error) => {
                    console.error('❌ Error listening to Firestore location:', error);
                    setDriverLocation(null);
                });

                // Store the unsubscribe function for cleanup
                return unsubscribeFirestore;
            } catch (error) {
                console.error('❌ Error setting up Firestore location listener:', error);
                setDriverLocation(null);
            }
        };

        // Set up periodic location check as additional fallback
        const locationCheckInterval = setInterval(() => {
            if (!driverLocation) {
                console.log('🔄 No location received, checking again...');
                checkFirestoreLocation();
            }
        }, 10000); // Check every 10 seconds if no location

        return () => {
            try {
                console.log('🧹 Cleaning up driver location listeners');
                off(locationRef, 'value', locationListener);
                clearInterval(locationCheckInterval);
            } catch (error) {
                console.error('❌ Error cleaning up location listener:', error);
            }
        };
    }, [currentOrder?.rideRequestId, currentOrder?.driver?.id]);

    // Navigate to rating screen when delivery is completed
    useEffect(() => {
        if (currentOrder?.deliveryStatus === 'delivered' && !currentOrder?.isRated) {
            console.log('🎉 Delivery completed, navigating to rating screen');
            navigation.navigate('DeliveryComplete', {
                orderData: currentOrder,
                driver: currentOrder.driver
            });
        }
    }, [currentOrder?.deliveryStatus, currentOrder?.isRated, navigation]);

    // Auto-fit map to show all markers when locations are available
    useEffect(() => {
        if (isMapReady && mapRef.current && driverLocation) {
            const coordinates = [driverLocation];
            
            if (activeRoute === 'pickup' && pickupCoordinates) {
                coordinates.push(pickupCoordinates);
            } else if (activeRoute === 'dropoff' && dropoffCoordinates) {
                coordinates.push(dropoffCoordinates);
            }
            
            if (coordinates.length > 1) {
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                    animated: true,
                });
            }
        }
    }, [isMapReady, driverLocation, pickupCoordinates, dropoffCoordinates, activeRoute]);

    // Get status display info
    const getStatusInfo = (deliveryStatus) => {
        switch (deliveryStatus) {
            case 'accepted':
                return { status: 'Driver Coming', color: '#3b82f6', icon: 'car-outline' };
            case 'collecting':
                return { status: 'Collecting Package', color: '#f97316', icon: 'cube-outline' };
            case 'in_transit':
                return { status: 'On The Way', color: '#10b981', icon: 'navigate-outline' };
            case 'delivered':
                return { status: 'Delivered', color: '#059669', icon: 'checkmark-circle-outline' };
            default:
                return { status: 'Processing', color: '#6b7280', icon: 'time-outline' };
        }
    };

    const handleCallDriver = () => {
        if (currentOrder?.driver?.phoneNumber) {
            Linking.openURL(`tel:${currentOrder.driver.phoneNumber}`);
        } else {
            Alert.alert("Contact Information", "Driver's phone number is not available.");
        }
    };

    const handleChatDriver = () => {
        if (currentOrder?.driver?.uid) {
            navigation.navigate("ChatScreen", { 
                recipientId: currentOrder.driver.uid, 
                recipientName: currentOrder.driver.fullName,
                orderId: currentOrder.rideRequestId || currentOrder.id
            });
        } else {
            Alert.alert("Chat Unavailable", "Unable to start chat with driver.");
        }
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const handleViewFullTracking = () => {
        if (currentOrder) {
            navigation.navigate('RiderConfirmed', {
                packageDetails: currentOrder.packageDetails,
                courierDetails: currentOrder.courierDetails,
                rideDetails: currentOrder.rideDetails,
                distance: currentOrder.distance,
                duration: currentOrder.duration,
                driver: currentOrder.driver,
                rideRequestId: currentOrder.rideRequestId
            });
        }
    };

    const handleRouteReady = (result) => {
        setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            instructions: result.legs?.[0]?.steps || []
        });
    };

    const getDestinationCoordinates = () => {
        if (activeRoute === 'pickup') {
            return pickupCoordinates;
        } else if (activeRoute === 'dropoff') {
            return dropoffCoordinates;
        }
        return null;
    };

    const getRouteColor = () => {
        switch (currentOrder?.deliveryStatus) {
            case 'accepted':
                return '#3b82f6'; 
            case 'collecting':
                return '#f97316'; 
            case 'in_transit':
                return '#10b981'; 
            default:
                return '#6b7280'; 
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#133BB7" />
                <Text className="mt-4 text-gray-600">Loading tracking information...</Text>
            </View>
        );
    }

    if (!currentOrder) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <Ionicons name="package-outline" size={64} color="gray" />
                <Text className="text-gray-600 text-lg mt-4">No Active Deliveries</Text>
                <Text className="text-gray-500 text-center mt-2 px-8">
                    You don't have any active deliveries to track at the moment.
                </Text>
                <TouchableOpacity 
                    className="mt-6 bg-[#133BB7] px-6 py-3 rounded-lg"
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text className="text-white font-semibold">Create New Delivery</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusInfo = getStatusInfo(currentOrder.deliveryStatus);
    const destinationCoordinates = getDestinationCoordinates();

    return (
        <View className="flex-1">
            {/* Map View */}
            <View className="h-[60%] w-full">
                {region && (
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1, width: Dimensions.get("window").width }}
                        initialRegion={region}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                        onMapReady={() => setIsMapReady(true)}
                    >
                        {/* Header */}
                        <View className="absolute top-10 left-4 right-4 z-10">
                            <View className="flex-row items-center p-4 bg-white rounded-xl shadow-md">
                                <TouchableOpacity 
                                    className="rounded-full p-2 border-2 border-gray-200"
                                    onPress={handleBackPress}
                                >
                                    <Ionicons name="arrow-back" size={20} color="black" />
                                </TouchableOpacity>
                                <Text className="flex-1 text-center text-lg font-extrabold">Live Navigation</Text>
                                <View className="flex-row items-center">
                                    <View className={`w-2 h-2 rounded-full mr-2 ${driverLocation ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <Text className={`text-xs ${driverLocation ? 'text-green-600' : 'text-red-600'}`}>
                                        {driverLocation ? 'Live' : 'Offline'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Route Status Card */}
                        {routeInfo.distance && routeInfo.duration && (
                            <View className="absolute top-24 left-4 right-4 z-10 mt-4">
                                <View className="bg-white p-3 rounded-lg shadow-md">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center">
                                            <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
                                            <Text className="ml-2 font-semibold" style={{ color: statusInfo.color }}>
                                                {statusInfo.status}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Text className="text-gray-600 text-sm mr-3">
                                                {routeInfo.distance.toFixed(1)} km
                                            </Text>
                                            <Text className="text-gray-800 font-semibold">
                                                {Math.round(routeInfo.duration)} min
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-500 text-xs mt-1">
                                        {activeRoute === 'pickup' ? 'To pickup location' : 'To delivery location'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* User location marker */}
                        <Marker coordinate={region}>
                            <View className="bg-blue-600 p-2 rounded-full">
                                <Ionicons name="person" size={16} color="white" />
                            </View>
                        </Marker>

                        {/* Driver location marker */}
                        {driverLocation && (
                            <Marker 
                                coordinate={driverLocation}
                                title={`${currentOrder.driver?.fullName || 'Driver'} is on the way`}
                                rotation={driverLocation.heading || 0}
                            >
                                <View className="bg-green-600 p-2 rounded-full">
                                    <Ionicons name="car" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Pickup location marker */}
                        {pickupCoordinates && (
                            <Marker 
                                coordinate={pickupCoordinates}
                                title="Pickup Location"
                                pinColor={activeRoute === 'pickup' ? '#3b82f6' : '#9ca3af'}
                            >
                                <View className={`p-2 rounded-full ${activeRoute === 'pickup' ? 'bg-blue-600' : 'bg-gray-400'}`}>
                                    <Ionicons name="location" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Dropoff location marker */}
                        {dropoffCoordinates && (
                            <Marker 
                                coordinate={dropoffCoordinates}
                                title="Delivery Location"
                                pinColor={activeRoute === 'dropoff' ? '#10b981' : '#9ca3af'}
                            >
                                <View className={`p-2 rounded-full ${activeRoute === 'dropoff' ? 'bg-green-600' : 'bg-gray-400'}`}>
                                    <Ionicons name="flag" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Navigation Route */}
                        {driverLocation && destinationCoordinates && GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY" && (
                            <MapViewDirections
                                origin={driverLocation}
                                destination={destinationCoordinates}
                                apikey={GOOGLE_MAPS_API_KEY}
                                strokeWidth={4}
                                strokeColor={getRouteColor()}
                                optimizeWaypoints={true}
                                onReady={handleRouteReady}
                                onError={(errorMessage) => {
                                    console.error('MapViewDirections error:', errorMessage);
                                }}
                            />
                        )}
                    </MapView>
                )}
            </View>

            {/* Package Details */}
            <ScrollView className="bg-white p-6 flex-1">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold">Package Information</Text>
                    <TouchableOpacity 
                        className="bg-blue-100 px-3 py-1 rounded-full"
                        onPress={handleViewFullTracking}
                    >
                        <Text className="text-blue-600 text-sm font-semibold">Full View</Text>
                    </TouchableOpacity>
                </View>

                {/* Package Details */}
                {currentOrder.packageDetails && (
                    <View className="bg-gray-50 p-4 rounded-xl mb-4">
                        <Text className="font-semibold text-gray-800 mb-1">
                            {currentOrder.packageDetails.packageName}
                        </Text>
                        <Text className="text-gray-600 text-sm">
                            {currentOrder.packageDetails.shipmentType}
                            {currentOrder.packageDetails.weight && ` • ${currentOrder.packageDetails.weight} kg`}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-2">
                            From: {currentOrder.packageDetails.pickupLocation}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                            To: {currentOrder.packageDetails.dropoffLocation}
                        </Text>
                    </View>
                )}

                {/* Navigation Info */}
                {routeInfo.distance && routeInfo.duration && (
                    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-blue-800 font-bold">Navigation Info</Text>
                            <View className="flex-row items-center">
                                <Ionicons name="navigate" size={16} color="#1e40af" />
                                <Text className="text-blue-600 ml-1 font-semibold">
                                    {activeRoute === 'pickup' ? 'To Pickup' : 'To Delivery'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between">
                            <View>
                                <Text className="text-blue-600 text-sm">Distance</Text>
                                <Text className="text-blue-800 font-bold">{routeInfo.distance.toFixed(1)} km</Text>
                            </View>
                            <View>
                                <Text className="text-blue-600 text-sm">ETA</Text>
                                <Text className="text-blue-800 font-bold">{Math.round(routeInfo.duration)} min</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Delivery Details */}
                <View className="flex-row justify-between mt-3 bg-gray-100 p-4 rounded-xl">
                    <View>
                        <Text className="text-gray-500 text-sm">Delivery Service</Text>
                        <Text className="text-black font-bold">
                            {currentOrder.rideDetails?.name || 'EasyDeliver'}
                        </Text>
                    </View>
                    <View>
                        <Text className="text-gray-500 text-sm">Status</Text>
                        <Text className="font-bold" style={{ color: statusInfo.color }}>
                            {statusInfo.status}
                        </Text>
                    </View>
                </View>

                {/* Delivery PIN */}
                {currentOrder.deliveryPin && currentOrder.deliveryStatus !== 'delivered' && (
                    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                        <Text className="text-blue-800 font-bold text-sm mb-1">Collection PIN</Text>
                        <Text className="text-blue-600 font-bold text-2xl">{currentOrder.deliveryPin}</Text>
                    </View>
                )}

                {/* Delivery Person Details */}
                {currentOrder.driver && (
                    <View className="flex-row items-center bg-[#133BB7] p-4 mt-4 rounded-full">
                        {currentOrder.driver.profileImage ? (
                            <Image
                                source={{ uri: currentOrder.driver.profileImage }}
                                className="w-10 h-10 rounded-full"
                            />
                        ) : (
                            <View className="w-10 h-10 rounded-full bg-white items-center justify-center">
                                <Text className="text-blue-600 font-bold">
                                    {currentOrder.driver.fullName?.charAt(0) || 'D'}
                                </Text>
                            </View>
                        )}
                        <View className="ml-3">
                            <Text className="font-bold text-white">
                                {currentOrder.driver.fullName || 'Driver'}
                            </Text>
                            <Text className="text-white">
                                {currentOrder.driver.vehicleNumber || 'Delivery person'}
                            </Text>
                        </View>
                        <View className="flex-row ml-auto">
                            <TouchableOpacity 
                                className="p-2 bg-white rounded-full"
                                onPress={handleCallDriver}
                            >
                                <Ionicons name="call" size={24} color="blue" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="p-2 ml-2 bg-white rounded-full"
                                onPress={handleChatDriver}
                            >
                                <Ionicons name="chatbubble-ellipses" size={24} color="blue" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Location Status */}
                <View className="flex-row items-center justify-center mt-4">
                    <View className={`w-2 h-2 rounded-full mr-2 ${driverLocation ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Text className={`text-xs ${driverLocation ? 'text-green-600' : 'text-red-600'}`}>
                        {driverLocation ? 'Live location active' : 'Location unavailable'}
                    </Text>
                </View>

                {/* API Key Warning */}
                {GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" && (
                    <View className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Text className="text-yellow-800 font-semibold text-sm mb-2">⚠️ Setup Required:</Text>
                        <Text className="text-yellow-700 text-xs">
                            Please add your Google Maps API key to enable navigation directions.
                        </Text>
                    </View>
                )}

                {/* Debug Information (only show when location is unavailable) */}
                {!driverLocation && currentOrder && (
                    <View className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <Text className="text-yellow-800 font-semibold text-sm mb-2">🔍 Debug Information:</Text>
                        <Text className="text-yellow-700 text-xs">Order ID: {currentOrder.rideRequestId || 'N/A'}</Text>
                        <Text className="text-yellow-700 text-xs">Driver ID: {currentOrder.driver?.id || 'N/A'}</Text>
                        <Text className="text-yellow-700 text-xs">Driver Name: {currentOrder.driver?.fullName || 'N/A'}</Text>
                        <Text className="text-yellow-700 text-xs">Delivery Status: {currentOrder.deliveryStatus || 'N/A'}</Text>
                        <Text className="text-yellow-700 text-xs">
                            Expected Path: driverLocations/{currentOrder.rideRequestId}/{currentOrder.driver?.id}
                        </Text>
                        <Text className="text-yellow-600 text-xs mt-2">
                            💡 If this persists, ask the driver to restart their app or check location permissions.
                        </Text>
                        <Text className="text-yellow-600 text-xs">
                            🔧 Driver should ensure location tracking is enabled and they are online.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

export default LiveTrack;
