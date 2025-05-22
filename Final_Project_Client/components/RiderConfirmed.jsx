import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Linking } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/init";

const RiderConfirmed = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { packageDetails, courierDetails, rideDetails, distance, duration, driver } = route.params || {};
    const [pickup, setPickup] = useState(null);
    const [dropoff, setDropoff] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [estimatedArrival, setEstimatedArrival] = useState('15 min');
    const mapRef = useRef(null);

    // Fetch coordinates for pickup and dropoff locations
    useEffect(() => {
        const getCoordinates = async () => {
            try {
                if (packageDetails) {
                    // In a real app, use the actual geocoding from the FindRide component
                    // For now, we'll simulate with random locations
                    const baseLocation = { latitude: 6.9271, longitude: 79.8612 }; // Colombo, Sri Lanka
                    setPickup({
                        latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                        longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                    });
                    setDropoff({
                        latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.05,
                        longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.05
                    });
                    
                    // Simulate driver location (initially closer to pickup)
                    setDriverLocation({
                        latitude: baseLocation.latitude + (Math.random() - 0.5) * 0.03,
                        longitude: baseLocation.longitude + (Math.random() - 0.5) * 0.03
                    });
                }
            } catch (error) {
                console.error("Error getting coordinates:", error);
            }
        };

        getCoordinates();
    }, [packageDetails]);

    // Fit all markers in the map view
    useEffect(() => {
        if (pickup && dropoff && driverLocation && mapRef.current) {
            mapRef.current.fitToCoordinates([pickup, dropoff, driverLocation], {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
            });
        }
    }, [pickup, dropoff, driverLocation]);

    // Simulate driver movement (in a real app, this would be from Firestore updates)
    useEffect(() => {
        if (!pickup || !driverLocation) return;

        const interval = setInterval(() => {
            // Move driver slightly closer to pickup
            setDriverLocation(prev => {
                if (!prev) return prev;
                
                const latDiff = pickup.latitude - prev.latitude;
                const lngDiff = pickup.longitude - prev.longitude;
                
                return {
                    latitude: prev.latitude + latDiff * 0.1,
                    longitude: prev.longitude + lngDiff * 0.1
                };
            });
            
            // Update estimated arrival time
            setEstimatedArrival(prev => {
                const mins = parseInt(prev);
                return `${Math.max(1, mins - 1)} min`;
            });
        }, 3000);
        
        return () => clearInterval(interval);
    }, [pickup, driverLocation]);

    const handleCallDriver = () => {
        if (driver && driver.phoneNumber) {
            Linking.openURL(`tel:${driver.phoneNumber}`);
        } else {
            Alert.alert("Contact Information", "Driver's phone number is not available.");
        }
    };

    const handleChatDriver = () => {
        // Navigate to chat screen with the driver
        navigation.navigate("ChatScreen", { recipientId: driver?.uid, recipientName: driver?.fullName });
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    return (
        <View className="flex-1 w-full bg-white">
            {/* Map View */}
            <View className="w-full h-[65%]">
                <MapView
                    ref={mapRef}
                    style={{ width: "100%", height: "100%" }}
                    initialRegion={{
                        latitude: pickup?.latitude || 6.9271,
                        longitude: pickup?.longitude || 79.8612,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
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
                    
                    {/* Markers */}
                    {pickup && <Marker coordinate={pickup} title="Pickup Location" pinColor="blue" />}
                    {dropoff && <Marker coordinate={dropoff} title="Drop-off Location" pinColor="red" />}
                    {driverLocation && (
                        <Marker 
                            coordinate={driverLocation} 
                            title={`${driver?.fullName || 'Driver'} is on the way`}
                        >
                            <View className="bg-blue-600 p-2 rounded-full">
                                <Ionicons name="car" size={16} color="white" />
                            </View>
                        </Marker>
                    )}
                    
                    {/* Direction Lines */}
                    {pickup && dropoff && (
                        <MapViewDirections
                            origin={pickup}
                            destination={dropoff}
                            apikey="AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE"
                            strokeWidth={4}
                            strokeColor="blue"
                        />
                    )}
                    
                    {driverLocation && pickup && (
                        <MapViewDirections
                            origin={driverLocation}
                            destination={pickup}
                            apikey="AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE"
                            strokeWidth={3}
                            strokeColor="green"
                            strokeDashArray={[5, 5]}
                        />
                    )}
                </MapView>
            </View>

            {/* Driver Info */}
            <View className="p-4 bg-white rounded-t-3xl shadow -mt-10 mb-2 items-center">
                {/* Vehicle Image */}
                <Image
                    source={rideDetails?.icon || require("../assets/icon/bike.png")}
                    className="w-12 h-12 mb-2"
                    style={{ width: 48, height: 48, resizeMode: 'contain' }}
                />

                {/* Vehicle Details */}
                <Text className="text-xl font-bold">{driver?.vehicleNumber || "Vehicle"}</Text>
                <Text className="text-gray-500">{rideDetails?.name || "Vehicle"}</Text>
                <Text className="text-blue-600 font-semibold mt-1">Arriving in {estimatedArrival}</Text>
            </View>

            <View className="p-4 bg-white ">
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

                    {/* Call / Chat Buttons */}
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
