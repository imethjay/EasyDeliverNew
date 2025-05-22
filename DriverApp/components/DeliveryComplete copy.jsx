import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

const DeliveryComplete = ({ navigation }) => {
    const [rating, setRating] = useState(0);

    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center mt-6 mb-10">
                <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-lg font-bold ml-2 text-center">Item Delevered</Text>
            </View>

            {/* Delivery Details */}
            <View className="items-center mt-4">
                <Image source={require("../assets/scooter.png")} className="w-24 h-24" />
                <Text className="text-xl font-bold mt-2">Imeth Jay</Text>
                <Text className="text-gray-500">CT 100 - WP BHU 4532</Text>
            </View>

            {/* Rating */}
            <Text className="text-lg font-semibold mt-6 text-center">
                How was the experience?
            </Text>
            <Text className="text-gray-500 text-center">
                (Rate from 1-5 stars about your experience)
            </Text>

            <View className="flex-row justify-center mt-3">
                {[1, 2, 3, 4, 5].map((num) => (
                    <TouchableOpacity key={num} onPress={() => setRating(num)}>
                        <FontAwesome
                            name="star"
                            size={30}
                            color={num <= rating ? "#FFD700" : "#D3D3D3"}
                            className="mx-1"
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Summary */}
            <View className="bg-gray-100 p-4 rounded-xl mt-5">
                <Text className="text-lg font-semibold">Summary</Text>
                <Text className="text-gray-600 mt-2">Pickup Location: No 20/6 Panadura</Text>
                <Text className="text-gray-600">Drop-off Location: No 20/6 Panadura</Text>
                <Text className="text-gray-600">Courier: Pronto Lanka</Text>
                <Text className="text-gray-600">Payment Method: Cash</Text>
            </View>

            {/* Back to Home */}
            <TouchableOpacity
                className="w-full bg-blue-800 py-4 rounded-full mt-6"
                onPress={() => navigation.navigate("Home")}
            >
                <Text className="text-center text-white font-bold text-lg">Back to Home</Text>
            </TouchableOpacity>
        </View>
    );
};

export default DeliveryComplete;
