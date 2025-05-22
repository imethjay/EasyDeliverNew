import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

// Function to generate a random location within a range
const getRandomLocation = (latitude, longitude, range = 0.05) => {
    const randomLat = latitude + (Math.random() - 0.5) * range;
    const randomLng = longitude + (Math.random() - 0.5) * range;
    return { latitude: randomLat, longitude: randomLng };
};

const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with your key

const RiderConfirmed = ({ navigation }) => {
    const [pickup, setPickup] = useState(null);
    const [dropoff, setDropoff] = useState(null);

    useEffect(() => {
        const initialLocation = { latitude: 6.9271, longitude: 79.8612 }; // Base location (Colombo, Sri Lanka)
        setPickup(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
        setDropoff(getRandomLocation(initialLocation.latitude, initialLocation.longitude));
    }, []);

    return (
        <View className="flex-1 w-full bg-white">
            {/* Map View */}
            <MapView
                style={{ width: "100%", height: "65%" }}
                initialRegion={{
                    latitude: pickup ? pickup.latitude : 6.9271,
                    longitude: pickup ? pickup.longitude : 79.8612,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {pickup && <Marker coordinate={pickup} title="Pickup Location" pinColor="blue" />}
                {dropoff && <Marker coordinate={dropoff} title="Drop-off Location" pinColor="red" />}
                <View className="flex-row items-center p-4 mb-4">
                    <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                        <Ionicons name="arrow-back" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-extrabold">Live Tracking </Text>
                </View>
                {/* Direction Line */}
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

            {/* Rider Info */}
            <View className="p-4 bg-white rounded-t-3xl shadow -mt-10 mb-2 items-center">
                {/* Vehicle Image */}
                <Image
                    source={require("../assets/scooter.png")}
                    className="w-10 h-10 mb-2"
                    resizeMode="contain"
                />

                {/* Vehicle Details */}
                <Text className="text-xl font-bold">BHU 4532</Text>
                <Text className="text-gray-500">CT 100</Text>
            </View>


            <View className="p-4 bg-white ">

                {/* Rider Profile */}
                <View className="flex-row items-center mt-3">
                    <Image
                        source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }}
                        className="w-12 h-12 rounded-full"
                    />
                    <View className="ml-3">
                        <Text className="text-lg font-semibold">Imeth Jay</Text>
                        <Text className="text-gray-500">Top rated driver</Text>
                    </View>

                    {/* Call / Chat Buttons */}
                    <View className="ml-auto flex-row">
                        <TouchableOpacity className="p-3 px-4 bg-blue-800 rounded-full mx-1">
                            <FontAwesome name="phone" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-3 bg-gray-300 rounded-full">
                            <Ionicons name="chatbubble-ellipses" size={20} color="black" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pickup & Drop-off */}
                <View className="mt-4">
                    <Text className="text-gray-600">From:</Text>
                    <Text className="font-semibold">
                        {pickup ? `Lat: ${pickup.latitude.toFixed(4)}, Lng: ${pickup.longitude.toFixed(4)}` : "Loading..."}
                    </Text>
                    <Text className="text-gray-600 mt-2">Shipping to:</Text>
                    <Text className="font-semibold">
                        {dropoff ? `Lat: ${dropoff.latitude.toFixed(4)}, Lng: ${dropoff.longitude.toFixed(4)}` : "Loading..."}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default RiderConfirmed;
