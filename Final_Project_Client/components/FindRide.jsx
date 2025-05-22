import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import Animated, { LightSpeedInLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/init";
import { formatCurrency } from "../utils/helpers";

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

const FindRide = () => {
    const [selectedRide, setSelectedRide] = useState(null);
    const [pickup, setPickup] = useState(null);
    const [dropoff, setDropoff] = useState(null);
    const [distance, setDistance] = useState(null);
    const [duration, setDuration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [courierDetails, setCourierDetails] = useState(null);
    const mapRef = useRef(null);
    const navigation = useNavigation();
    const route = useRoute();
    
    // Get package details and selected courier from navigation params
    const { packageDetails, selectedCourier } = route.params || {};

    // Fetch courier details
    useEffect(() => {
        const fetchCourierDetails = async () => {
            if (selectedCourier) {
                try {
                    const courierDoc = await getDoc(doc(db, "couriers", selectedCourier));
                    if (courierDoc.exists()) {
                        setCourierDetails(courierDoc.data());
                    }
                } catch (err) {
                    console.error("Error fetching courier details:", err);
                }
            }
        };

        fetchCourierDetails();
    }, [selectedCourier]);

    // Get geocoded locations from addresses
    useEffect(() => {
        const getLocations = async () => {
            setLoading(true);
            try {
                if (packageDetails) {
                    const pickupCoords = await getGeocodingFromAddress(packageDetails.pickupLocation);
                    const dropoffCoords = await getGeocodingFromAddress(packageDetails.dropoffLocation);
                    
                    if (pickupCoords && dropoffCoords) {
                        setPickup(pickupCoords);
                        setDropoff(dropoffCoords);
                    } else {
                        // Fallback to random locations if geocoding fails
                        const initialLocation = { latitude: 6.9271, longitude: 79.8612 }; // Colombo, Sri Lanka
                        setPickup(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
                        setDropoff(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
                        Alert.alert("Location Error", "Could not find exact locations, showing approximate positions");
                    }
                }
            } catch (error) {
                console.error("Error getting locations:", error);
                // Fallback to random locations
                const initialLocation = { latitude: 6.9271, longitude: 79.8612 };
                setPickup(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
                setDropoff(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
            } finally {
                setLoading(false);
            }
        };

        getLocations();
    }, [packageDetails]);

    // Zoom map to fit both markers
    useEffect(() => {
        if (pickup && dropoff && mapRef.current) {
            mapRef.current.fitToCoordinates([pickup, dropoff], {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
            });
        }
    }, [pickup, dropoff]);

    // Calculate prices based on package dimensions and weight
    const calculatePrices = () => {
        // Base prices
        let baseSmall = 1000;
        let baseMedium = 1200;
        let baseLarge = 1500;
        
        // Adjust based on package weight if available
        if (packageDetails && packageDetails.weight) {
            const weight = parseFloat(packageDetails.weight) || 0;
            if (weight > 5) {
                baseSmall += weight * 50;
                baseMedium += weight * 40;
                baseLarge += weight * 30;
            }
        }
        
        // Adjust based on distance
        if (distance) {
            const distanceKm = distance / 1000;
            baseSmall += distanceKm * 30;
            baseMedium += distanceKm * 25;
            baseLarge += distanceKm * 20;
        }
        
        return [
            { id: 1, name: "Standard", price: baseSmall, icon: require("../assets/icon/bike.png") },
            { id: 2, name: "Premium", price: baseMedium, icon: require("../assets/icon/ez_large.png") },
            { id: 3, name: "Express", price: baseLarge, icon: require("../assets/icon/ez_xl.png") },
        ];
    };

    const rideOptions = calculatePrices();

    const getRandomLocation = (latitude, longitude, range = 0.05) => {
        const randomLat = latitude + (Math.random() - 0.5) * range;
        const randomLng = longitude + (Math.random() - 0.5) * range;
        return { latitude: randomLat, longitude: randomLng };
    };

    const handleBackPress = () => {
        navigation.goBack();
    };

    const handleSelectRide = (id) => {
        setSelectedRide(id);
    };

    const handleConfirm = () => {
        if (!selectedRide) return;
        
        // Find the selected ride option
        const selectedRideDetails = rideOptions.find(r => r.id === selectedRide);
        
        // Navigate to the appropriate screen with all details
        navigation.navigate("MyOrder", {
            packageDetails,
            courierDetails,
            rideDetails: selectedRideDetails,
            distance,
            duration
        });
    };

    return (
        <ScrollView className="flex-1 w-full bg-gray-100">
            {/* Map View */}
            <View className="w-full h-[60vh] overflow-hidden">
                {/* Live Tracking Header */}
                <View className="absolute left-4 right-4 z-10 flex-row items-center p-4 shadow-md bg-white rounded-xl mt-8">
                    <TouchableOpacity 
                        className="p-2 border-2 border-gray-200 rounded-full"
                        onPress={handleBackPress}
                    >
                        <Ionicons name="arrow-back" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-extrabold">Live Tracking</Text>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center bg-gray-100" style={{ height: '100%' }}>
                        <ActivityIndicator size="large" color="#133BB7" />
                        <Text className="mt-4 text-gray-600">Loading map data...</Text>
                    </View>
                ) : (
                    /* Google Map */
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1, width: "100%", height: "100%" }}
                        initialRegion={{
                            latitude: 6.9271,
                            longitude: 79.8612,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {/* Pickup & Drop-off Markers */}
                        {pickup && <Marker coordinate={pickup} title="Pickup Location" pinColor="blue" />}
                        {dropoff && <Marker coordinate={dropoff} title="Drop-off Location" pinColor="red" />}

                        {/* Route Line between Pickup & Drop-off */}
                        {pickup && dropoff && (
                            <MapViewDirections
                                origin={pickup}
                                destination={dropoff}
                                apikey="AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE"
                                strokeWidth={5}
                                strokeColor="blue"
                                onReady={(result) => {
                                    setDistance(result.distance);
                                    setDuration(result.duration);
                                }}
                            />
                        )}
                    </MapView>
                )}
            </View>

            {/* Package Information */}
            {packageDetails && (
                <View className="px-4 my-4">
                    <Animated.View entering={LightSpeedInLeft} className="bg-white shadow-md rounded-2xl p-4">
                        <View className="flex-row items-center">
                            <View className="bg-blue-100 p-2 rounded-lg">
                                <Ionicons name="cube-outline" size={24} color="#133BB7" />
                            </View>
                            <View className="ml-3">
                                <Text className="text-black font-bold">{packageDetails.packageName}</Text>
                                <Text className="text-gray-500 text-sm">{packageDetails.shipmentType} • {packageDetails.weight ? `${packageDetails.weight} kg` : 'Weight not specified'}</Text>
                            </View>
                        </View>
                        
                        <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
                            <View>
                                <Text className="text-gray-500 text-xs">FROM</Text>
                                <Text className="text-black" numberOfLines={1}>{packageDetails.pickupLocation}</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-gray-500 text-xs">TO</Text>
                                <Text className="text-black" numberOfLines={1}>{packageDetails.dropoffLocation}</Text>
                            </View>
                        </View>
                        
                        {distance && duration && (
                            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
                                <Text className="text-gray-500">Distance: {distance.toFixed(1)} km</Text>
                                <Text className="text-gray-500">Est. Time: {Math.round(duration)} min</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            )}

            {/* Selected Courier Information */}
            {courierDetails && (
                <View className="px-4 mb-4">
                    <Animated.View entering={LightSpeedInLeft} className="bg-white shadow-md rounded-2xl p-4">
                        <Text className="text-black font-bold mb-2">Selected Courier</Text>
                        <View className="flex-row items-center">
                            {courierDetails.imageUrl ? (
                                <Image 
                                    source={{ uri: courierDetails.imageUrl }} 
                                    style={{ width: 40, height: 40 }}
                                    defaultSource={require("../assets/icon/pronto.png")}
                                />
                            ) : (
                                <View className="bg-gray-200 rounded-full w-10 h-10 items-center justify-center">
                                    <Text className="text-gray-700 font-bold">{courierDetails.courierName.charAt(0)}</Text>
                                </View>
                            )}
                            <View className="ml-3">
                                <Text className="text-black font-bold">{courierDetails.courierName}</Text>
                                <Text className="text-gray-500 text-sm">{courierDetails.branchNumber}</Text>
                            </View>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Ride Selection */}
            <View className="flex-1 px-4">
                <Animated.View entering={LightSpeedInLeft} className="bg-white shadow-md rounded-2xl p-4">
                    <Text className="text-black text-lg font-semibold mb-3 text-center">Select Service Level</Text>
                    
                    {/* Ride Options */}
                    <View className="flex-row justify-around w-full">
                        {rideOptions.map((ride) => (
                            <TouchableOpacity
                                key={ride.id}
                                className={`items-center p-3 rounded-xl ${selectedRide === ride.id ? "border-2 border-blue-600 bg-gray-100" : "border border-gray-200 bg-white"}`}
                                style={{ width: '30%', minHeight: 100 }}
                                onPress={() => handleSelectRide(ride.id)}
                                activeOpacity={0.7}
                            >
                                <Image 
                                    source={ride.icon} 
                                    className="w-12 h-12 mb-2"
                                    style={{ width: 48, height: 48, resizeMode: 'contain' }}
                                />
                                <Text className="text-black text-sm font-semibold">{ride.name}</Text>
                                <Text className="text-gray-600 text-sm">{formatCurrency(ride.price)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Payment Method */}
                <TouchableOpacity className="bg-white shadow-md rounded-2xl p-4 mt-4 flex-row items-center" 
                onPress={() => navigation.navigate("PaymentUpdates")} >
                    <Image 
                        source={require("../assets/icon/cash.png")} 
                        className="w-8 h-8"
                        style={{ width: 32, height: 32, resizeMode: 'contain' }} 
                    />
                    <Text className="ml-3 text-black text-lg font-semibold">Cash</Text>
                    <Image 
                        source={require("../assets/icon/rightnav.png")} 
                        className="w-6 h-6 ml-auto"
                        style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                    />
                </TouchableOpacity>

                {/* Next Button */}
                <TouchableOpacity
                    className={`w-full py-4 rounded-xl mt-6 mb-6 ${selectedRide ? "bg-blue-800" : "bg-gray-400"}`}
                    disabled={!selectedRide}
                    onPress={handleConfirm}
                >
                    <Text className="text-center text-white font-bold text-lg">Confirm</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default FindRide;