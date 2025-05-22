import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as Location from "expo-location";

const LiveTrack = () => {
    const [region, setRegion] = useState(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.log("Permission to access location was denied");
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

    return (
        <View className="flex-1 ">

            {/* Map View */}
            <View className="h-[60%] w-full">
                {region && (
                    <MapView
                        style={{ flex: 1, width: Dimensions.get("window").width }}
                        initialRegion={region}
                    >
                        <View className="flex-row items-center p-4 mb-4">
                            <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                                <Ionicons name="arrow-back" size={20} color="black" />
                            </TouchableOpacity>
                            <Text className="flex-1 text-center text-lg font-extrabold">Live Tracking </Text>
                        </View>
                        <Marker coordinate={region}>
                            <Ionicons name="location-sharp" size={40} color="red" />
                        </Marker>
                    </MapView>
                )}
            </View>

            {/* Package Details */}
            <View className="bg-white  p-6">
                <Text className="text-lg font-bold">Package Information</Text>

                {/* Delivery Details */}
                <View className="flex-row justify-between mt-3 bg-gray-100 p-4 rounded-xl">
                    <View>
                        <Text className="text-gray-500 text-sm">Delivery Service</Text>
                        <Text className="text-black font-bold">Pronto Lanka</Text>
                    </View>
                    <View>
                        <Text className="text-gray-500 text-sm">Status</Text>
                        <Text className="text-blue-500 font-bold">On The Way</Text>
                    </View>
                </View>

                {/* Delivery Person Details */}
                <View className="flex-row items-center  bg-[#133BB7] p-4 mt-4 rounded-full">
                    <Image
                        source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }}
                        className="w-10 h-10 rounded-full"
                    />
                    <View className="ml-3">
                        <Text className="font-bold text-white">Imeth Jayarathne</Text>
                        <Text className="text-white">Deliver person</Text>
                    </View>
                    <View className="flex-row ml-auto">
                        <TouchableOpacity className="p-2 bg-white rounded-full">
                            <Ionicons name="call" size={24} color="blue" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-2 ml-2  bg-white rounded-full">
                            <Ionicons name="chatbubble-ellipses" size={24} color="blue" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default LiveTrack;
