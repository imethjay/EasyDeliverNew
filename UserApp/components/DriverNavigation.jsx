import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Alert, 
    Dimensions, 
    ScrollView,
    ActivityIndicator,
    Linking 
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = "AIzaSyBf4JX2mZl3C7lOaD5I3urb4CmbTJzAuNk";

const DriverNavigation = ({ 
    navigation, 
    route,
    driverLocation,
    pickupLocation,
    dropoffLocation,
    deliveryStatus = 'accepted',
    onLocationUpdate,
    onStatusUpdate 
}) => {
    const [region, setRegion] = useState(null);
    const [currentRoute, setCurrentRoute] = useState(null);
    const [routeInfo, setRouteInfo] = useState({
        distance: 0,
        duration: 0,
        instructions: []
    });
    const [isNavigating, setIsNavigating] = useState(false);
    const [currentInstruction, setCurrentInstruction] = useState(null);
    const [nextInstruction, setNextInstruction] = useState(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [locationPermission, setLocationPermission] = useState(false);
    const mapRef = useRef(null);

    // Determine current destination based on delivery status
    const getCurrentDestination = () => {
        switch (deliveryStatus) {
            case 'accepted':
            case 'collecting':
                return pickupLocation;
            case 'in_transit':
                return dropoffLocation;
            default:
                return pickupLocation;
        }
    };

    // Get route color based on delivery status
    const getRouteColor = () => {
        switch (deliveryStatus) {
            case 'accepted':
                return '#3b82f6'; // Blue - heading to pickup
            case 'collecting':
                return '#f97316'; // Orange - at pickup location
            case 'in_transit':
                return '#10b981'; // Green - heading to dropoff
            default:
                return '#6b7280'; // Gray
        }
    };

    // Get status info
    const getStatusInfo = () => {
        switch (deliveryStatus) {
            case 'accepted':
                return { 
                    title: 'Heading to Pickup', 
                    subtitle: 'Navigate to pickup location',
                    icon: 'car-outline',
                    color: '#3b82f6'
                };
            case 'collecting':
                return { 
                    title: 'At Pickup Location', 
                    subtitle: 'Collect the package',
                    icon: 'cube-outline',
                    color: '#f97316'
                };
            case 'in_transit':
                return { 
                    title: 'Heading to Delivery', 
                    subtitle: 'Navigate to delivery location',
                    icon: 'navigate-outline',
                    color: '#10b981'
                };
            default:
                return { 
                    title: 'Navigation', 
                    subtitle: 'Ready to navigate',
                    icon: 'map-outline',
                    color: '#6b7280'
                };
        }
    };

    // Request location permissions
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');
            
            if (status === 'granted') {
                // Get current location if driver location is not provided
                if (!driverLocation) {
                    const location = await Location.getCurrentPositionAsync({});
                    const currentLocation = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };
                    
                    if (onLocationUpdate) {
                        onLocationUpdate(currentLocation);
                    }
                    
                    setRegion({
                        ...currentLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }
            } else {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location permissions to use navigation features.',
                    [{ text: 'OK' }]
                );
            }
        })();
    }, []);

    // Set initial region when driver location is available
    useEffect(() => {
        if (driverLocation && !region) {
            setRegion({
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    }, [driverLocation]);

    // Handle route calculation
    const handleRouteReady = (result) => {
        setRouteInfo({
            distance: result.distance,
            duration: result.duration,
            instructions: result.legs?.[0]?.steps || []
        });

        // Set current and next instructions
        if (result.legs?.[0]?.steps?.length > 0) {
            setCurrentInstruction(result.legs[0].steps[0]);
            if (result.legs[0].steps.length > 1) {
                setNextInstruction(result.legs[0].steps[1]);
            }
        }
    };

    // Auto-fit map to show route
    useEffect(() => {
        if (isMapReady && mapRef.current && driverLocation) {
            const destination = getCurrentDestination();
            if (destination) {
                const coordinates = [driverLocation, destination];
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                    animated: true,
                });
            }
        }
    }, [isMapReady, driverLocation, deliveryStatus]);

    // Start navigation
    const startNavigation = () => {
        const destination = getCurrentDestination();
        if (!destination) {
            Alert.alert('Error', 'Destination not available');
            return;
        }

        setIsNavigating(true);
        
        // You can integrate with external navigation apps here
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open navigation app');
        });
    };

    // Stop navigation
    const stopNavigation = () => {
        setIsNavigating(false);
        setCurrentInstruction(null);
        setNextInstruction(null);
    };

    // Update delivery status
    const updateDeliveryStatus = (newStatus) => {
        if (onStatusUpdate) {
            onStatusUpdate(newStatus);
        }
    };

    // Handle arrived at pickup
    const handleArrivedAtPickup = () => {
        Alert.alert(
            'Arrived at Pickup',
            'Have you arrived at the pickup location?',
            [
                { text: 'Not Yet', style: 'cancel' },
                { 
                    text: 'Yes, Arrived', 
                    onPress: () => updateDeliveryStatus('collecting')
                }
            ]
        );
    };

    // Handle package collected
    const handlePackageCollected = () => {
        Alert.alert(
            'Package Collected',
            'Have you collected the package?',
            [
                { text: 'Not Yet', style: 'cancel' },
                { 
                    text: 'Yes, Collected', 
                    onPress: () => updateDeliveryStatus('in_transit')
                }
            ]
        );
    };

    // Handle package delivered
    const handlePackageDelivered = () => {
        Alert.alert(
            'Package Delivered',
            'Have you delivered the package?',
            [
                { text: 'Not Yet', style: 'cancel' },
                { 
                    text: 'Yes, Delivered', 
                    onPress: () => updateDeliveryStatus('delivered')
                }
            ]
        );
    };

    const statusInfo = getStatusInfo();
    const destination = getCurrentDestination();

    if (!locationPermission) {
        return (
            <View className="flex-1 bg-white justify-center items-center p-6">
                <Ionicons name="location-outline" size={64} color="#6b7280" />
                <Text className="text-gray-600 text-lg mt-4 text-center">Location Permission Required</Text>
                <Text className="text-gray-500 text-center mt-2">
                    Please enable location permissions to use navigation features.
                </Text>
            </View>
        );
    }

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
                        followsUserLocation={isNavigating}
                        onMapReady={() => setIsMapReady(true)}
                    >
                        {/* Header */}
                        <View className="absolute top-10 left-4 right-4 z-10">
                            <View className="flex-row items-center p-4 bg-white rounded-xl shadow-md">
                                <TouchableOpacity 
                                    className="rounded-full p-2 border-2 border-gray-200"
                                    onPress={() => navigation.goBack()}
                                >
                                    <Ionicons name="arrow-back" size={20} color="black" />
                                </TouchableOpacity>
                                <View className="flex-1 ml-3">
                                    <Text className="text-lg font-bold">{statusInfo.title}</Text>
                                    <Text className="text-gray-600 text-sm">{statusInfo.subtitle}</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
                                </View>
                            </View>
                        </View>

                        {/* Navigation Instructions */}
                        {isNavigating && currentInstruction && (
                            <View className="absolute top-32 left-4 right-4 z-10">
                                <View className="bg-blue-600 p-4 rounded-xl shadow-md">
                                    <Text className="text-white font-bold text-lg">
                                        {currentInstruction.maneuver?.instruction || 'Continue straight'}
                                    </Text>
                                    <Text className="text-blue-100 text-sm mt-1">
                                        {currentInstruction.distance?.text || ''} • {currentInstruction.duration?.text || ''}
                                    </Text>
                                    {nextInstruction && (
                                        <Text className="text-blue-200 text-xs mt-2">
                                            Then: {nextInstruction.maneuver?.instruction || 'Continue'}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Route Info Card */}
                        {routeInfo.distance > 0 && !isNavigating && (
                            <View className="absolute top-32 left-4 right-4 z-10">
                                <View className="bg-white p-4 rounded-xl shadow-md">
                                    <View className="flex-row items-center justify-between">
                                        <View>
                                            <Text className="text-gray-600 text-sm">Distance</Text>
                                            <Text className="text-black font-bold text-lg">
                                                {routeInfo.distance.toFixed(1)} km
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className="text-gray-600 text-sm">ETA</Text>
                                            <Text className="text-black font-bold text-lg">
                                                {Math.round(routeInfo.duration)} min
                                            </Text>
                                        </View>
                                        <TouchableOpacity 
                                            className="bg-blue-600 px-4 py-2 rounded-lg"
                                            onPress={startNavigation}
                                        >
                                            <Text className="text-white font-semibold">Start</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Driver location marker */}
                        {driverLocation && (
                            <Marker 
                                coordinate={driverLocation}
                                title="Your Location"
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View className="bg-blue-600 p-2 rounded-full">
                                    <Ionicons name="car" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Pickup location marker */}
                        {pickupLocation && (
                            <Marker 
                                coordinate={pickupLocation}
                                title="Pickup Location"
                                pinColor={deliveryStatus === 'accepted' || deliveryStatus === 'collecting' ? '#3b82f6' : '#9ca3af'}
                            >
                                <View className={`p-2 rounded-full ${
                                    deliveryStatus === 'accepted' || deliveryStatus === 'collecting' 
                                        ? 'bg-blue-600' 
                                        : 'bg-gray-400'
                                }`}>
                                    <Ionicons name="location" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Dropoff location marker */}
                        {dropoffLocation && (
                            <Marker 
                                coordinate={dropoffLocation}
                                title="Delivery Location"
                                pinColor={deliveryStatus === 'in_transit' ? '#10b981' : '#9ca3af'}
                            >
                                <View className={`p-2 rounded-full ${
                                    deliveryStatus === 'in_transit' 
                                        ? 'bg-green-600' 
                                        : 'bg-gray-400'
                                }`}>
                                    <Ionicons name="flag" size={16} color="white" />
                                </View>
                            </Marker>
                        )}

                        {/* Navigation Route */}
                        {driverLocation && destination && GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY" && (
                            <MapViewDirections
                                origin={driverLocation}
                                destination={destination}
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

            {/* Bottom Panel */}
            <ScrollView className="bg-white p-6 flex-1">
                {/* Status Actions */}
                <View className="mb-6">
                    {deliveryStatus === 'accepted' && (
                        <TouchableOpacity 
                            className="bg-blue-600 p-4 rounded-xl mb-3"
                            onPress={handleArrivedAtPickup}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Arrived at Pickup</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {deliveryStatus === 'collecting' && (
                        <TouchableOpacity 
                            className="bg-orange-600 p-4 rounded-xl mb-3"
                            onPress={handlePackageCollected}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="cube" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Package Collected</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {deliveryStatus === 'in_transit' && (
                        <TouchableOpacity 
                            className="bg-green-600 p-4 rounded-xl mb-3"
                            onPress={handlePackageDelivered}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="checkmark-done" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Package Delivered</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Navigation Controls */}
                <View className="flex-row mb-6">
                    {!isNavigating ? (
                        <TouchableOpacity 
                            className="flex-1 bg-blue-600 p-4 rounded-xl mr-2"
                            onPress={startNavigation}
                            disabled={!destination}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="navigate" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Start Navigation</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            className="flex-1 bg-red-600 p-4 rounded-xl mr-2"
                            onPress={stopNavigation}
                        >
                            <View className="flex-row items-center justify-center">
                                <Ionicons name="stop" size={20} color="white" />
                                <Text className="text-white font-bold ml-2">Stop Navigation</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        className="bg-gray-600 p-4 rounded-xl"
                        onPress={() => {
                            if (destination) {
                                const url = `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
                                Linking.openURL(url);
                            }
                        }}
                    >
                        <Ionicons name="map" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Route Information */}
                {routeInfo.distance > 0 && (
                    <View className="bg-gray-50 p-4 rounded-xl mb-4">
                        <Text className="font-bold text-gray-800 mb-2">Route Information</Text>
                        <View className="flex-row justify-between">
                            <View>
                                <Text className="text-gray-600 text-sm">Distance</Text>
                                <Text className="text-gray-800 font-semibold">
                                    {routeInfo.distance.toFixed(1)} km
                                </Text>
                            </View>
                            <View>
                                <Text className="text-gray-600 text-sm">Duration</Text>
                                <Text className="text-gray-800 font-semibold">
                                    {Math.round(routeInfo.duration)} min
                                </Text>
                            </View>
                            <View>
                                <Text className="text-gray-600 text-sm">Status</Text>
                                <Text className="font-semibold" style={{ color: statusInfo.color }}>
                                    {statusInfo.title}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Destination Information */}
                {destination && (
                    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <Text className="text-blue-800 font-bold mb-2">
                            {deliveryStatus === 'accepted' || deliveryStatus === 'collecting' 
                                ? 'Pickup Location' 
                                : 'Delivery Location'
                            }
                        </Text>
                        <Text className="text-blue-600 text-sm">
                            Lat: {destination.latitude.toFixed(6)}
                        </Text>
                        <Text className="text-blue-600 text-sm">
                            Lng: {destination.longitude.toFixed(6)}
                        </Text>
                    </View>
                )}

                {/* API Key Warning */}
                {GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY" && (
                    <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <Text className="text-yellow-800 font-bold mb-2">⚠️ Setup Required</Text>
                        <Text className="text-yellow-700 text-sm">
                            Please add your Google Maps API key to enable turn-by-turn navigation.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

export default DriverNavigation; 