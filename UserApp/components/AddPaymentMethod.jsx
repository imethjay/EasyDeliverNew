import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const AddPaymentMethod = ({ navigation }) => {
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    return (
        <ScrollView className="flex-1 w-full px-4 bg-white">
            {/* Header */}
            <View className="flex-row items-center mt-6 mb-4">
                <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={22} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-lg font-bold ml-2 text-center">Add payment method</Text>
            </View>

            {/* Card Number */}
            <Text className="text-gray-700 font-medium mt-4">Card number</Text>
            <View className="flex-row items-center bg-gray-100 p-4 rounded-[20px] mt-1">
                <TextInput
                    className="flex-1 text-lg"
                    placeholder="Enter card number"
                    keyboardType="numeric"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                />
                <Image source={require("../assets/icon/visa.png")} className="w-8 h-6 mr-2" />
                <Image source={require("../assets/icon/mastercard.png")} className="w-8 h-6" />
            </View>

            {/* Expiry Date & CVV */}
            <View className="flex-row mt-4">
                <View className="flex-1 mr-2">
                    <Text className="text-gray-700 font-medium">Expire date</Text>
                    <TextInput
                        className="bg-gray-100 p-4 rounded-[20px] mt-1 text-lg"
                        placeholder="MM/YY"
                        keyboardType="numeric"
                        value={expiryDate}
                        onChangeText={setExpiryDate}
                    />
                </View>
                <View className="flex-1 ml-2">
                    <Text className="text-gray-700 font-medium">CVV</Text>
                    <TextInput
                        className="bg-gray-100 p-4 rounded-[20px] mt-1 text-lg"
                        placeholder="***"
                        keyboardType="numeric"
                        secureTextEntry
                        value={cvv}
                        onChangeText={setCvv}
                    />
                </View>
            </View>

            {/* First Name & Last Name */}
            <View className="flex-row mt-4">
                <View className="flex-1 mr-2">
                    <Text className="text-gray-700 font-medium">First name</Text>
                    <TextInput
                        className="bg-gray-100 p-4 rounded-[20px] mt-1 text-lg"
                        placeholder="Enter first name"
                        value={firstName}
                        onChangeText={setFirstName}
                    />
                </View>
                <View className="flex-1 ml-2">
                    <Text className="text-gray-700 font-medium">Last name</Text>
                    <TextInput
                        className="bg-gray-100 p-4 rounded-[20px] mt-1 text-lg"
                        placeholder="Enter last name"
                        value={lastName}
                        onChangeText={setLastName}
                    />
                </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
                className={`w-full py-4 rounded-[20px] mt-6 ${cardNumber && expiryDate && cvv && firstName && lastName ? "bg-blue-800" : "bg-gray-400"
                    }`}
                disabled={!cardNumber || !expiryDate || !cvv || !firstName || !lastName}
            >
                <Text className="text-center text-white font-bold text-lg">Save</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default AddPaymentMethod;
