import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";


const PaymentUpdates = () => {
    const [selectedMethod, setSelectedMethod] = useState(null);

    const paymentMethods = [
        { id: 1, name: "Cash", icon: require("../assets/icon/cash.png") },
        { id: 2, name: "Jay **** 7928", icon: require("../assets/icon/visa.png") },
        { id: 3, name: "Jay **** 2223G", icon: require("../assets/icon/mastercard.png") },
    ];

    return (
        <ScrollView className="flex-1 w-full text-center px-4 bg-white">
            {/* Header */}
            <View className="flex-row items-center mt-6 mb-10">
               <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                         <Ionicons name="arrow-back" size={20} color="black" />
                       </TouchableOpacity>
                <Text className="text-lg font-extrabold  flex-1 text-center">Payment method</Text>
            </View>

            {/* Payment Methods */}
            <Text className="text-lg font- mb-10">Payment Methods</Text>
            {paymentMethods.map((method) => (
                <TouchableOpacity
                    key={method.id}
                    className={`flex-row items-center p-4 rounded-lg mb-2 border ${
                        selectedMethod === method.id ? "border-blue-500" : "border-gray-300"
                    }`}
                    onPress={() => setSelectedMethod(method.id)}
                >
                    <Image source={method.icon } className="w-8 h-8 mr-3" />
                    <Text className="text-lg">{method.name}</Text>
                </TouchableOpacity>
            ))}

            {/* Add Payment Method */}
            <TouchableOpacity className="flex-row items-center p-4">
                <View className="w-4 h-4 bg-blue-600 rounded-full mr-3"></View>
                <Text className="text-lg">Add payment method</Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
                className={`w-full py-4 rounded-[20px] mt-10 ${
                    selectedMethod ? "bg-blue-800" : "bg-gray-400"
                }`}
                disabled={!selectedMethod}
            >
                <Text className="text-center text-white font-bold text-lg">Next</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default PaymentUpdates;
