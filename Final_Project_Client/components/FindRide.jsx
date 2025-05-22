import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import Animated, { LightSpeedInLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const getRandomLocation = (latitude, longitude, range = 0.05) => {
    const randomLat = latitude + (Math.random() - 0.5) * range;
    const randomLng = longitude + (Math.random() - 0.5) * range;
    return { latitude: randomLat, longitude: randomLng };
};

const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

const FindRide = () => {
    const [selectedRide, setSelectedRide] = useState(null);
    const [pickup, setPickup] = useState(null);
    const [dropoff, setDropoff] = useState(null);
    const mapRef = useRef(null);
    const navigation = useNavigation();

    useEffect(() => {
        const initialLocation = { latitude: 6.9271, longitude: 79.8612 }; // Base location (Colombo, Sri Lanka)
        setPickup(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
        setDropoff(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
    }, []);

    useEffect(() => {
        if (pickup && dropoff && mapRef.current) {
            mapRef.current.fitToCoordinates([pickup, dropoff], {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [pickup, dropoff]);

    const rideOptions = [
        { id: 1, name: "EZ Bike", price: "1000.00", icon: require("../assets/icon/bike.png") },
        { id: 2, name: "EZ Large", price: "1200.00", icon: require("../assets/icon/ez_large.png") },
        { id: 3, name: "EZ XL", price: "1500.00", icon: require("../assets/icon/ez_xl.png") },
    ];

    const handleBackPress = () => {
        navigation.goBack();
    };

    const handleSelectRide = (id) => {
        setSelectedRide(id);
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

                {/* Google Map */}
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
                            apikey={GOOGLE_MAPS_API_KEY}
                            strokeWidth={5}
                            strokeColor="blue"
                        />
                    )}
                </MapView>
            </View>

            {/* Ride Selection */}
            <View className="flex-1 px-4">
                <Animated.View entering={LightSpeedInLeft} className="bg-white shadow-md rounded-2xl p-4 mt-6">
                    <Text className="text-black text-lg font-semibold mb-3 text-center">Select your ride</Text>
                    
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
                                <Text className="text-gray-600 text-sm">LKR {ride.price}</Text>
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
                >
                    <Text className="text-center text-white font-bold text-lg">Next</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default FindRide;