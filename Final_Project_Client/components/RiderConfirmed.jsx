import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Linking, ScrollView } from "react-native";
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
    const [deliveryTimeline, setDeliveryTimeline] = useState([]);
    const mapRef = useRef(null);

    // Debounced delivery status setter to prevent rapid updates
    const updateDeliveryStatus = (newStatus) => {
        const now = Date.now();
        if (now - lastStatusUpdate > 2000) { // 2 second debounce
            console.log('📦 Updating delivery status from', deliveryStatus, 'to', newStatus);
            setDeliveryStatus(newStatus);
            setLastStatusUpdate(now);
            updateDeliveryTimeline(newStatus);
        } else {
            console.log('⏱️ Debouncing status update, too soon since last update');
        }
    };

    // Update delivery timeline based on status
    const updateDeliveryTimeline = (status) => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        setDeliveryTimeline(prev => {
            const newTimeline = [...prev];
            
            switch (status) {
                case 'accepted':
                    if (!newTimeline.find(item => item.status === 'accepted')) {
                        newTimeline.push({
                            status: 'accepted',
                            title: 'Driver Assigned',
                            description: 'Driver is heading to pickup location',
                            time: timeString,
                            completed: true,
                            icon: 'person-outline'
                        });
                    }
                    break;
                case 'collecting':
                    if (!newTimeline.find(item => item.status === 'collecting')) {
                        newTimeline.push({
                            status: 'collecting',
                            title: 'Package Collection',
                            description: 'Driver is collecting your package',
                            time: timeString,
                            completed: true,
                            icon: 'cube-outline'
                        });
                    }
                    break;
                case 'in_transit':
                    if (!newTimeline.find(item => item.status === 'in_transit')) {
                        newTimeline.push({
                            status: 'in_transit',
                            title: 'In Transit',
                            description: 'Package is on the way to destination',
                            time: timeString,
                            completed: true,
                            icon: 'car-outline'
                        });
                    }
                    break;
                case 'delivered':
                    if (!newTimeline.find(item => item.status === 'delivered')) {
                        newTimeline.push({
                            status: 'delivered',
                            title: 'Delivered',
                            description: 'Package delivered successfully',
                            time: timeString,
                            completed: true,
                            icon: 'checkmark-circle-outline'
                        });
                    }
                    break;
            }
            
            return newTimeline.sort((a, b) => {
                const order = ['accepted', 'collecting', 'in_transit', 'delivered'];
                return order.indexOf(a.status) - order.indexOf(b.status);
            });
        });
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
        // Initialize timeline with accepted status
        updateDeliveryTimeline('accepted');
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

    // Navigate to rating screen when delivery is completed
    useEffect(() => {
        if (deliveryStatus === 'delivered') {
            console.log('🎉 Delivery completed, navigating to rating screen');
            navigation.navigate('DeliveryComplete', {
                orderData: {
                    rideRequestId,
                    packageDetails,
                    courierDetails,
                    rideDetails,
                    distance,
                    duration,
                    deliveryStatus
                },
                driver
            });
        }
    }, [deliveryStatus, navigation, rideRequestId, packageDetails, courierDetails, rideDetails, distance, duration, driver]);

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
            }
        };

        getCoordinates();
    }, [packageDetails]);

    // Listen for real-time driver location updates
    useEffect(() => {
        if (!driver?.uid || !rideRequestId) return;

        const driverLocationRef = ref(rtdb, `driverLocations/${driver.uid}`);
        
        const unsubscribe = onValue(driverLocationRef, (snapshot) => {
            try {
                const locationData = snapshot.val();
                if (locationData && locationData.latitude && locationData.longitude) {
                    const newLocation = {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                    };
                    setDriverLocation(newLocation);
                    setIsDriverLocationAvailable(true);
                    console.log('📍 Driver location updated:', newLocation);
                } else {
                    console.log('❌ No valid driver location data received');
                    setIsDriverLocationAvailable(false);
                }
            } catch (error) {
                console.error('❌ Error processing driver location:', error);
                setIsDriverLocationAvailable(false);
            }
        }, (error) => {
            console.error('❌ Error listening to driver location:', error);
            setIsDriverLocationAvailable(false);
        });

        return () => {
            off(driverLocationRef, 'value', unsubscribe);
        };
    }, [driver?.uid, rideRequestId]);

    const handleCallDriver = () => {
        if (driver && driver.phoneNumber) {
            Linking.openURL(`tel:${driver.phoneNumber}`);
        } else {
            Alert.alert("Contact Information", "Driver's phone number is not available.");
        }
    };

    const handleChatDriver = () => {
        navigation.navigate("ChatScreen", { 
            recipientId: driver?.uid, 
            recipientName: driver?.fullName,
            orderId: rideRequestId
        });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    // Get status display info based on delivery status
    const getStatusInfo = () => {
        switch (deliveryStatus) {
            case 'accepted':
                return {
                    title: 'Driver Assigned',
                    message: 'Driver is coming to collect your package',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    icon: 'time-outline',
                    progress: 25
                };
            case 'collecting':
                return {
                    title: 'Package Collection',
                    message: 'Driver is collecting your package',
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    icon: 'cube-outline',
                    progress: 50
                };
            case 'in_transit':
                return {
                    title: 'In Transit',
                    message: 'Package is on the way to destination',
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    icon: 'car-outline',
                    progress: 75
                };
            case 'delivered':
                return {
                    title: 'Delivered',
                    message: 'Package has been delivered successfully',
                    color: 'text-green-800',
                    bgColor: 'bg-green-50',
                    icon: 'checkmark-circle-outline',
                    progress: 100
                };
            default:
                return {
                    title: 'Preparing',
                    message: 'Preparing for pickup',
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                    icon: 'ellipsis-horizontal-outline',
                    progress: 10
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
        <ScrollView className="flex-1 bg-white">
            {/* Map View */}
            <View className="w-full h-80">
                {/* Map Header */}
                <View className="absolute left-4 right-4 top-10 z-10 flex-row items-center p-4 shadow-md bg-white rounded-xl">
                    <TouchableOpacity 
                        className="rounded-full p-2 border-2 border-gray-200"
                        onPress={handleBackPress}
                    >
                        <Ionicons name="arrow-back" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-extrabold">Live Tracking</Text>
                    {/* Live indicator */}
                    <View className="flex-row items-center">
                        <View className={`w-2 h-2 rounded-full mr-1 ${isDriverLocationAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                        <Text className={`text-xs ${isDriverLocationAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {isDriverLocationAvailable ? 'LIVE' : 'OFFLINE'}
                        </Text>
                    </View>
                </View>
                
                {renderMapView()}
            </View>

            {/* Status Progress Bar */}
            <View className="px-6 py-4 bg-white">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-sm font-medium text-gray-700">{statusInfo.title}</Text>
                    <Text className="text-sm text-gray-500">{statusInfo.progress}%</Text>
                </View>
                <View className="bg-gray-200 rounded-full h-2 mb-2">
                    <View 
                        className="rounded-full h-2 bg-blue-600"
                        style={{ width: `${statusInfo.progress}%` }}
                    />
                </View>
                <Text className={`text-sm ${statusInfo.color}`}>{statusInfo.message}</Text>
            </View>

            {/* Driver Info Card */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <View className="flex-row items-center">
                    {driver?.profileImage ? (
                        <Image
                            source={{ uri: driver.profileImage }}
                            className="w-16 h-16 rounded-full"
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
                            <Text className="text-blue-600 font-bold text-xl">{driver?.fullName?.charAt(0) || "D"}</Text>
                        </View>
                    )}
                    
                    <View className="ml-4 flex-1">
                        <Text className="text-lg font-semibold text-gray-800">{driver?.fullName || "Driver"}</Text>
                        <Text className="text-gray-500">{driver?.vehicleNumber || "Vehicle"}</Text>
                        <Text className="text-gray-400 text-sm">{driver?.rating ? `${driver.rating} ★` : "Courier Driver"}</Text>
                    </View>

                    <View className="flex-row">
                        <TouchableOpacity 
                            className="p-3 bg-blue-600 rounded-full mr-2"
                            onPress={handleCallDriver}
                        >
                            <FontAwesome name="phone" size={16} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="p-3 bg-gray-200 rounded-full"
                            onPress={handleChatDriver}
                        >
                            <Ionicons name="chatbubble-ellipses" size={16} color="gray" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Delivery PIN Section */}
            {deliveryPin && deliveryStatus !== 'delivered' && (
                <View className="mx-4 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
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

            {/* Delivery Timeline */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-semibold text-gray-800 mb-4">Delivery Timeline</Text>
                {deliveryTimeline.map((item, index) => (
                    <View key={item.status} className="flex-row items-start mb-4">
                        <View className="items-center mr-4">
                            <View className={`w-8 h-8 rounded-full ${item.completed ? 'bg-blue-600' : 'bg-gray-300'} items-center justify-center`}>
                                <Ionicons 
                                    name={item.icon} 
                                    size={16} 
                                    color={item.completed ? "white" : "gray"} 
                                />
                            </View>
                            {index < deliveryTimeline.length - 1 && (
                                <View className="w-0.5 h-8 bg-gray-300 mt-2" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-800">{item.title}</Text>
                            <Text className="text-gray-500 text-sm">{item.description}</Text>
                            <Text className="text-gray-400 text-xs mt-1">{item.time}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Package Details */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-semibold text-gray-800 mb-3">Package Details</Text>
                
                {packageDetails && (
                    <>
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-800 text-base mb-1">
                                {packageDetails.packageName}
                            </Text>
                            <Text className="text-gray-600">
                                {packageDetails.shipmentType}
                                {packageDetails.weight ? ` • ${packageDetails.weight} kg` : ''}
                            </Text>
                        </View>
                        
                        <View className="space-y-3">
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Pickup Location</Text>
                                <Text className="text-gray-800 mt-1">{packageDetails.pickupLocation}</Text>
                            </View>
                            
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">Delivery Location</Text>
                                <Text className="text-gray-800 mt-1">{packageDetails.dropoffLocation}</Text>
                            </View>
                            
                            {distance && duration && (
                                <View className="flex-row justify-between bg-gray-50 rounded-lg p-3 mt-3">
                                    <View className="items-center">
                                        <Text className="text-gray-500 text-sm">Distance</Text>
                                        <Text className="font-semibold text-gray-800">{distance}</Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-gray-500 text-sm">Duration</Text>
                                        <Text className="font-semibold text-gray-800">{duration}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
    );
};

export default RiderConfirmed;
