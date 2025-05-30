import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./auth/AuthContext";
import PaymentMethodService from "../utils/PaymentMethodService";

const AddPaymentMethod = ({ navigation }) => {
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    // Format card number as user types
    const handleCardNumberChange = (text) => {
        const cleanText = text.replace(/\s/g, '');
        const formattedText = PaymentMethodService.formatCardNumber(cleanText);
        setCardNumber(formattedText);
    };

    // Format expiry date as user types
    const handleExpiryDateChange = (text) => {
        let cleanText = text.replace(/\D/g, '');
        if (cleanText.length >= 2) {
            cleanText = cleanText.substring(0, 2) + '/' + cleanText.substring(2, 4);
        }
        setExpiryDate(cleanText);
    };

    // Handle CVV input
    const handleCvvChange = (text) => {
        const cleanText = text.replace(/\D/g, '');
        setCvv(cleanText.substring(0, 4)); 
    };

    // Validate form data
    const validateForm = () => {
        if (!cardNumber || !expiryDate || !cvv || !firstName || !lastName) {
            Alert.alert("Error", "Please fill in all fields");
            return false;
        }

        if (!PaymentMethodService.validateCardNumber(cardNumber)) {
            Alert.alert("Error", "Please enter a valid card number");
            return false;
        }

        if (!PaymentMethodService.validateExpiryDate(expiryDate)) {
            Alert.alert("Error", "Please enter a valid expiry date (MM/YY)");
            return false;
        }

        if (cvv.length < 3) {
            Alert.alert("Error", "Please enter a valid CVV");
            return false;
        }

        return true;
    };

    // Save payment method
    const handleSave = async () => {
        if (!validateForm()) return;

        if (!user) {
            Alert.alert("Error", "You must be logged in to add a payment method");
            return;
        }

        setLoading(true);
        try {
            const paymentMethodData = {
                cardNumber: cardNumber.replace(/\s/g, ''),
                expiryDate,
                firstName,
                lastName,
            };

            await PaymentMethodService.addPaymentMethod(user.uid, paymentMethodData);
            
            Alert.alert(
                "Success", 
                "Payment method added successfully",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error) {
            console.error("Error saving payment method:", error);
            Alert.alert("Error", "Failed to save payment method. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Get card type icon
    const getCardTypeIcon = () => {
        const cardType = PaymentMethodService.detectCardType(cardNumber);
        switch (cardType) {
            case 'Visa':
                return require("../assets/icon/visa.png");
            case 'Mastercard':
                return require("../assets/icon/mastercard.png");
            default:
                return require("../assets/icon/visa.png");
        }
    };

    return (
        <ScrollView className="flex-1 w-full px-4 bg-white">
            {/* Header */}
            <View className="flex-row items-center mt-6 mb-4">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200"
                    onPress={() => navigation.goBack()}
                >
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
                    onChangeText={handleCardNumberChange}
                    maxLength={19} // 16 digits + 3 spaces
                />
                {cardNumber.length > 0 && (
                    <Image source={getCardTypeIcon()} className="w-8 h-6" />
                )}
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
                        onChangeText={handleExpiryDateChange}
                        maxLength={5}
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
                        onChangeText={handleCvvChange}
                        maxLength={4}
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
                className={`w-full py-4 rounded-[20px] mt-6 ${
                    cardNumber && expiryDate && cvv && firstName && lastName && !loading
                        ? "bg-blue-800" 
                        : "bg-gray-400"
                }`}
                disabled={!cardNumber || !expiryDate || !cvv || !firstName || !lastName || loading}
                onPress={handleSave}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-center text-white font-bold text-lg">Save</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};

export default AddPaymentMethod;
