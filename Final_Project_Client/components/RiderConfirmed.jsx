import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Linking } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { db, rtdb } from "../firebase/init";

const RiderConfirmed = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { packageDetails, courierDetails, rideDetails, distance, duration, driver, rideRequestId } = route.params || {};
    const [pickup, setPickup] = useState(null);
    const [dropoff, setDropoff] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [estimatedArrival, setEstimatedArrival] = useState('15 min');
    const [isDriverLocationAvailable, setIsDriverLocationAvailable] = useState(false);
    const [deliveryPin, setDeliveryPin] = useState(null);
    const [deliveryStatus, setDeliveryStatus] = useState('accepted'); // accepted, collecting, in_transit, delivered
    const [lastStatusUpdate, setLastStatusUpdate] = useState(Date.now());
    const [routeCoordinates, setRouteCoordinates] = useState(null); // Single route state
    const [isMapReady, setIsMapReady] = useState(false);
    const [hasMapError, setHasMapError] = useState(false);
    const mapRef = useRef(null);

    // Debounced delivery status setter to prevent rapid updates
    const updateDeliveryStatus = (newStatus) => {
        const now = Date.now();
        if (now - lastStatusUpdate > 2000) { // 2 second debounce
            console.log('📦 Updating delivery status from', deliveryStatus, 'to', newStatus);
            setDeliveryStatus(newStatus);
            setLastStatusUpdate(now);
        } else {
            console.log('⏱️ Debouncing status update, too soon since last update');
        }
    };

    // Calculate which route to show based on delivery status
    const calculateActiveRoute = () => {
        if (!driverLocation || !isMapReady || hasMapError) return null;

        switch (deliveryStatus) {
            case 'accepted':
            case 'collecting':
                if (pickup && pickup.latitude && pickup.longitude) {
                    return {
                        origin: driverLocation,
                        destination: pickup,
                        strokeColor: deliveryStatus === 'collecting' ? '#f97316' : '#3b82f6', // orange : blue
                        key: `driver-to-pickup-${Date.now()}`
                    };
                }
                break;
            case 'in_transit':
                if (dropoff && dropoff.latitude && dropoff.longitude) {
                    return {
                        origin: driverLocation,
                        destination: dropoff,
                        strokeColor: '#10b981', // green
                        key: `driver-to-dropoff-${Date.now()}`
                    };
                }
                break;
            default:
                return null;
        }
        return null;
    };

    // Update route when delivery status or locations change
    useEffect(() => {
        const newRoute = calculateActiveRoute();
        setRouteCoordinates(newRoute);
    }, [deliveryStatus, driverLocation, pickup, dropoff, isMapReady]);

    // Generate 4-digit PIN when component mounts
    useEffect(() => {
        const generateDeliveryPin = async () => {
            try {
                const pin = Math.floor(1000 + Math.random() * 9000).toString();
                setDeliveryPin(pin);
                
                if (rideRequestId) {
                    const rideRequestRef = doc(db, 'rideRequests', rideRequestId);
                    await updateDoc(rideRequestRef, {
                        deliveryPin: pin,
                        deliveryStatus: 'accepted',
                        pinGeneratedAt: new Date().toISOString()
                    });
                    console.log('📌 Generated delivery PIN:', pin);
                }
            } catch (error) {
                console.error('Error generating delivery PIN:', error);
                const fallbackPin = Math.floor(1000 + Math.random() * 9000).toString();
                setDeliveryPin(fallbackPin);
            }
        };

        generateDeliveryPin();
    }, [rideRequestId]);

    // Listen for delivery status changes with error handling
    useEffect(() => {
        if (!rideRequestId) return;

        const rideRequestRef = doc(db, 'rideRequests', rideRequestId);
        const unsubscribe = onSnapshot(rideRequestRef, (doc) => {
            try {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.deliveryStatus && data.deliveryStatus !== deliveryStatus) {
                        console.log('📦 Delivery status updated:', data.deliveryStatus);
                        updateDeliveryStatus(data.deliveryStatus);
                    }
                } else {
                    console.warn('❌ Ride request document does not exist');
                }
            } catch (error) {
                console.error('❌ Error processing delivery status update:', error);
            }
        }, (error) => {
            console.error('❌ Error listening to delivery status changes:', error);
            Alert.alert(
                'Connection Issue', 
                'Unable to get real-time updates. Some information may be outdated.',
                [{ text: 'OK' }]
            );
        });

        return () => {
            try {
                unsubscribe();
            } catch (error) {
                console.error('Error unsubscribing from delivery status:', error);
            }
        };
    }, [rideRequestId]);

    // Function to get geocoding from address
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

    // Fetch actual coordinates for pickup and dropoff locations
    useEffect(() => {
        const getCoordinates = async () => {
            try {
                if (packageDetails) {
                    console.log('Getting coordinates for:', {
                        pickup: packageDetails.pickupLocation,
                        dropoff: packageDetails.dropoffLocation
                    });

                    const [pickupCoords, dropoffCoords] = await Promise.all([
                        getGeocodingFromAddress(packageDetails.pickupLocation),
                        getGeocodingFromAddress(packageDetails.dropoffLocation)
                    ]);
                    
                    if (pickupCoords && dropoffCoords) {
                        setPickup(pickupCoords);
                        setDropoff(dropoffCoords);
                        console.log('✅ Coordinates set successfully:', { pickupCoords, dropoffCoords });
                    } else {
                        console.warn('⚠️ Geocoding failed, using fallback locations');
                        const baseLocation = { latitude: 6.9271, longitude: 79.8612 };
                        setPickup({
                            latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                            longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                        });
                        setDropoff({
                            latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                            longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                        });
                    }
                }
            } catch (error) {
                console.error("❌ Error getting coordinates:", error);
                const baseLocation = { latitude: 6.9271, longitude: 79.8612 };
                setPickup({
                    latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                    longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                });
                setDropoff({
                    latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                    longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                });
                console.log('Using fallback locations due to error');
            }
        };

        getCoordinates();
    }, [packageDetails]);

    // Fit all markers in the map view with error handling
    useEffect(() => {
        if (pickup && dropoff && mapRef.current && isMapReady) {
            try {
                const coordinates = [pickup, dropoff];
                if (driverLocation) {
                    coordinates.push(driverLocation);
                }
                
                setTimeout(() => {
                    try {
                        mapRef.current?.fitToCoordinates(coordinates, {
                            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                            animated: true,
                        });
                    } catch (error) {
                        console.error('❌ Error fitting map coordinates:', error);
                    }
                }, 1000);
            } catch (error) {
                console.error('❌ Error in map fitting effect:', error);
            }
        }
    }, [pickup, dropoff, driverLocation, isMapReady]);

    // Listen to real-time driver location updates
    useEffect(() => {
        if (!rideRequestId || !driver?.id) {
            console.log('⚠️ Missing ride request ID or driver ID for location tracking');
            return;
        }

        console.log('🚗 Setting up driver location listener for:', { rideRequestId, driverId: driver.id });

        const locationRef = ref(rtdb, `driverLocations/${rideRequestId}/${driver.id}`);
        
        const locationListener = onValue(locationRef, (snapshot) => {
            try {
                const locationData = snapshot.val();
                
                if (locationData) {
                    console.log('📍 Received driver location update:', locationData);
                    setDriverLocation({
                        latitude: locationData.latitude,
                        longitude: locationData.longitude,
                        heading: locationData.heading || 0,
                        speed: locationData.speed || 0
                    });
                    setIsDriverLocationAvailable(true);
                    
                    if (locationData.speed > 0) {
                        let targetLocation = null;
                        
                        if (deliveryStatus === 'accepted' || deliveryStatus === 'collecting') {
                            targetLocation = pickup;
                        } else if (deliveryStatus === 'in_transit') {
                            targetLocation = dropoff;
                        }
                        
                        if (targetLocation) {
                            const distance = getDistance(locationData, targetLocation);
                            const estimatedTime = Math.round(distance / (locationData.speed * 3.6));
                            setEstimatedArrival(`${Math.max(1, estimatedTime)} min`);
                        }
                    }
                } else {
                    console.log('⚠️ No driver location data available');
                    setIsDriverLocationAvailable(false);
                }
            } catch (error) {
                console.error('❌ Error processing driver location update:', error);
            }
        }, (error) => {
            console.error('❌ Error listening to driver location:', error);
            setIsDriverLocationAvailable(false);
        });

        return () => {
            try {
                console.log('🧹 Cleaning up driver location listener');
                off(locationRef, 'value', locationListener);
            } catch (error) {
                console.error('❌ Error cleaning up location listener:', error);
            }
        };
    }, [rideRequestId, driver?.id, pickup, dropoff, deliveryStatus]);

    // Helper function to calculate distance between two coordinates
    const getDistance = (coord1, coord2) => {
        const R = 6371e3;
        const φ1 = coord1.latitude * Math.PI/180;
        const φ2 = coord2.latitude * Math.PI/180;
        const Δφ = (coord2.latitude-coord1.latitude) * Math.PI/180;
        const Δλ = (coord2.longitude-coord1.longitude) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };

    const handleCallDriver = () => {
        if (driver && driver.phoneNumber) {
            Linking.openURL(`tel:${driver.phoneNumber}`);
        } else {
            Alert.alert("Contact Information", "Driver's phone number is not available.");
        }
    };

    const handleChatDriver = () => {
        navigation.navigate("ChatScreen", { recipientId: driver?.uid, recipientName: driver?.fullName });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    // Get status display info based on delivery status
    const getStatusInfo = () => {
        switch (deliveryStatus) {
            case 'accepted':
                return {
                    message: 'Driver is coming to collect your package',
                    color: 'text-blue-600',
                    icon: 'time-outline'
                };
            case 'collecting':
                return {
                    message: 'Driver is collecting your package',
                    color: 'text-orange-600',
                    icon: 'cube-outline'
                };
            case 'in_transit':
                return {
                    message: 'Package is on the way to destination',
                    color: 'text-green-600',
                    icon: 'car-outline'
                };
            case 'delivered':
                return {
                    message: 'Package has been delivered',
                    color: 'text-green-800',
                    icon: 'checkmark-circle-outline'
                };
            default:
                return {
                    message: 'Preparing for pickup',
                    color: 'text-gray-600',
                    icon: 'ellipsis-horizontal-outline'
                };
        }
    };

    // Safe MapView renderer with error boundary
    const renderMapView = () => {
        if (hasMapError) {
            return (
                <View className="flex-1 justify-center items-center bg-gray-100">
                    <Ionicons name="map-outline" size={64} color="gray" />
                    <Text className="text-gray-600 text-center mt-4">
                        Map temporarily unavailable
                    </Text>
                    <TouchableOpacity 
                        className="bg-blue-600 px-4 py-2 rounded-lg mt-4"
                        onPress={() => {
                            setHasMapError(false);
                            setIsMapReady(false);
                            setRouteCoordinates(null);
                        }}
                    >
                        <Text className="text-white">Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <MapView
                ref={mapRef}
                style={{ width: "100%", height: "100%" }}
                initialRegion={{
                    latitude: pickup?.latitude || 6.9271,
                    longitude: pickup?.longitude || 79.8612,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                onMapReady={() => {
                    console.log('✅ MapView is ready');
                    setIsMapReady(true);
                }}
                onError={(error) => {
                    console.error('❌ MapView error:', error);
                    setHasMapError(true);
                }}
            >
                {/* Markers - Only render if coordinates are valid */}
                {pickup && pickup.latitude && pickup.longitude && (
                    <Marker coordinate={pickup} title="Pickup Location" pinColor="blue" />
                )}
                {dropoff && dropoff.latitude && dropoff.longitude && (
                    <Marker coordinate={dropoff} title="Drop-off Location" pinColor="red" />
                )}
                {driverLocation && driverLocation.latitude && driverLocation.longitude && (
                    <Marker 
                        coordinate={driverLocation} 
                        title={`${driver?.fullName || 'Driver'} is on the way`}
                    >
                        <View className="bg-blue-600 p-2 rounded-full">
                            <Ionicons name="car" size={16} color="white" />
                        </View>
                    </Marker>
                )}
                
                {/* Single MapViewDirections component - Only render when we have valid route */}
                {routeCoordinates && 
                 routeCoordinates.origin && 
                 routeCoordinates.destination && 
                 routeCoordinates.origin.latitude && 
                 routeCoordinates.origin.longitude && 
                 routeCoordinates.destination.latitude && 
                 routeCoordinates.destination.longitude && (
                    <MapViewDirections
                        key={routeCoordinates.key}
                        origin={routeCoordinates.origin}
                        destination={routeCoordinates.destination}
                        apikey="AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE"
                        strokeWidth={4}
                        strokeColor={routeCoordinates.strokeColor}
                        onError={(errorMessage) => {
                            console.log(`❌ MapViewDirections error:`, errorMessage);
                            // Don't crash, just log and continue
                        }}
                        onReady={() => {
                            console.log(`✅ MapViewDirections ready`);
                        }}
                    />
                )}
            </MapView>
        );
    };

    const statusInfo = getStatusInfo();

    return (
        <View className="flex-1 w-full bg-white">
            {/* Map View */}
            <View className="w-full h-[55%]">
                {/* Map Header */}
                <View className="absolute left-4 right-4 top-10 z-10 flex-row items-center p-4 shadow-md bg-white rounded-xl">
                    <TouchableOpacity 
                        className="rounded-full p-2 border-2 border-gray-200"
                        onPress={handleBackPress}
                    >
                        <Ionicons name="arrow-back" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-extrabold">Live Tracking</Text>
                </View>
                
                {renderMapView()}
            </View>

            {/* Driver Info */}
            <View className="p-4 bg-white rounded-t-3xl shadow -mt-10 mb-2 items-center">
                <Image
                    source={rideDetails?.icon || require("../assets/icon/bike.png")}
                    className="w-12 h-12 mb-2"
                    style={{ width: 48, height: 48, resizeMode: 'contain' }}
                />

                <Text className="text-xl font-bold">{driver?.vehicleNumber || "Vehicle"}</Text>
                <Text className="text-gray-500">{rideDetails?.name || "Vehicle"}</Text>
                
                {/* Dynamic ETA based on delivery status */}
                {deliveryStatus === 'accepted' && (
                    <Text className="text-blue-600 font-semibold mt-1">
                        Arriving for pickup in {estimatedArrival}
                    </Text>
                )}
                {deliveryStatus === 'collecting' && (
                    <Text className="text-orange-600 font-semibold mt-1">
                        Driver is collecting your package
                    </Text>
                )}
                {deliveryStatus === 'in_transit' && (
                    <Text className="text-green-600 font-semibold mt-1">
                        Delivering in {estimatedArrival}
                    </Text>
                )}
                {deliveryStatus === 'delivered' && (
                    <Text className="text-green-800 font-semibold mt-1">
                        Package delivered successfully!
                    </Text>
                )}
                
                <View className="flex-row items-center mt-2">
                    <View className={`w-2 h-2 rounded-full mr-2 ${isDriverLocationAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Text className={`text-xs ${isDriverLocationAvailable ? 'text-green-600' : 'text-red-600'}`}>
                        {isDriverLocationAvailable ? 'Live location active' : 'Location unavailable'}
                    </Text>
                </View>
            </View>

            <View className="p-4 bg-white flex-1">
                {/* Delivery PIN Section */}
                {deliveryPin && deliveryStatus !== 'delivered' && (
                    <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-blue-800 font-bold text-lg mb-1">
                                    Collection PIN
                                </Text>
                                <Text className="text-blue-600 text-sm">
                                    Share this PIN with the driver when they arrive
                                </Text>
                            </View>
                            <View className="bg-blue-600 px-6 py-3 rounded-lg">
                                <Text className="text-white font-bold text-2xl">{deliveryPin}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Delivery Status Section */}
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <View className="flex-row items-center">
                        <Ionicons name={statusInfo.icon} size={24} color="#4B5563" />
                        <View className="ml-3 flex-1">
                            <Text className="font-semibold text-gray-800">Delivery Status</Text>
                            <Text className={`${statusInfo.color} text-sm mt-1`}>
                                {statusInfo.message}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Driver Profile */}
                <View className="flex-row items-center mt-3">
                    {driver?.profileImage ? (
                        <Image
                            source={{ uri: driver.profileImage }}
                            className="w-12 h-12 rounded-full"
                        />
                    ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-300 items-center justify-center">
                            <Text className="text-gray-600 font-bold">{driver?.fullName?.charAt(0) || "D"}</Text>
                        </View>
                    )}
                    
                    <View className="ml-3">
                        <Text className="text-lg font-semibold">{driver?.fullName || "Driver"}</Text>
                        <Text className="text-gray-500">{driver?.rating ? `${driver.rating} ★` : "Courier Driver"}</Text>
                    </View>

                    <View className="ml-auto flex-row">
                        <TouchableOpacity 
                            className="p-3 px-4 bg-blue-800 rounded-full mx-1"
                            onPress={handleCallDriver}
                        >
                            <FontAwesome name="phone" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="p-3 bg-gray-300 rounded-full"
                            onPress={handleChatDriver}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pickup & Drop-off */}
                <View className="mt-4">
                    <Text className="text-gray-600">From:</Text>
                    <Text className="font-semibold" numberOfLines={1}>
                        {packageDetails?.pickupLocation || "Loading..."}
                    </Text>
                    <Text className="text-gray-600 mt-2">Shipping to:</Text>
                    <Text className="font-semibold" numberOfLines={1}>
                        {packageDetails?.dropoffLocation || "Loading..."}
                    </Text>
                </View>
                
                {/* Package Details */}
                {packageDetails && (
                    <View className="mt-4 p-3 bg-gray-100 rounded-lg">
                        <Text className="font-semibold mb-1">{packageDetails.packageName}</Text>
                        <Text className="text-gray-600">
                            {packageDetails.shipmentType}
                            {packageDetails.weight ? ` • ${packageDetails.weight} kg` : ''}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default RiderConfirmed;
