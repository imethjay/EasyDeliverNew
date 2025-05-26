import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./auth/AuthContext";
import PaymentMethodService from "../utils/PaymentMethodService";
import { useFocusEffect } from "@react-navigation/native";

const PaymentMethodSelection = ({ navigation, route }) => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Get the callback function from route params if provided
    const { onPaymentMethodSelected } = route.params || {};

    // Load payment methods when component mounts
    useEffect(() => {
        loadPaymentMethods();
    }, []);

    // Refresh payment methods when screen comes into focus (e.g., returning from AddPaymentMethod)
    useFocusEffect(
        React.useCallback(() => {
            loadPaymentMethods();
        }, [])
    );

    const loadPaymentMethods = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const methods = await PaymentMethodService.getUserPaymentMethods(user.uid);
            setPaymentMethods(methods);
            console.log(`Loaded ${methods.length} payment methods for user`);
        } catch (error) {
            console.error("Error loading payment methods:", error);
            
            // Handle specific Firestore errors gracefully
            if (error.message && error.message.includes('index')) {
                console.log("Firestore index not created yet, showing empty state");
                setPaymentMethods([]);
            } else {
                Alert.alert("Error", "Failed to load payment methods. You can still use cash payment.");
                setPaymentMethods([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddPaymentMethod = () => {
        navigation.navigate("AddPaymentMethod");
    };

    const handleNext = () => {
        if (!selectedMethod) {
            Alert.alert("Error", "Please select a payment method");
            return;
        }

        // If callback function is provided, call it with selected method
        if (onPaymentMethodSelected) {
            onPaymentMethodSelected(selectedMethod);
        }
        
        navigation.goBack();
    };

    const getCardIcon = (cardType) => {
        switch (cardType) {
            case 'Visa':
                return require("../assets/icon/visa.png");
            case 'Mastercard':
                return require("../assets/icon/mastercard.png");
            default:
                return require("../assets/icon/visa.png");
        }
    };

    const renderPaymentMethod = (method) => {
        const isSelected = selectedMethod?.id === method.id;
        
        return (
            <TouchableOpacity
                key={method.id}
                className={`flex-row items-center p-4 rounded-lg mb-2 border ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onPress={() => setSelectedMethod(method)}
            >
                <Image source={getCardIcon(method.cardType)} className="w-8 h-8 mr-3" />
                <Text className="text-lg">{method.cardHolderName} {method.cardNumberMasked}</Text>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" className="ml-auto" />
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#133BB7" />
                <Text className="mt-4 text-gray-600">Loading payment methods...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 w-full px-4 bg-white">
            {/* Header */}
            <View className="flex-row items-center mt-6 mb-10">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200"
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-extrabold flex-1 text-center">Payment method</Text>
            </View>

            {/* Payment Methods */}
            <Text className="text-lg font-medium mb-4">Payment Methods</Text>
            
            {/* Cash Option */}
            <TouchableOpacity
                className={`flex-row items-center p-4 rounded-lg mb-2 border ${
                    selectedMethod?.type === 'cash' ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
                onPress={() => setSelectedMethod({ type: 'cash', name: 'Cash' })}
            >
                <Image source={require("../assets/icon/cash.png")} className="w-8 h-8 mr-3" />
                <Text className="text-lg">Cash</Text>
                {selectedMethod?.type === 'cash' && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" className="ml-auto" />
                )}
            </TouchableOpacity>

            {/* Saved Payment Methods */}
            {paymentMethods.length > 0 ? (
                paymentMethods.map(renderPaymentMethod)
            ) : (
                <View className="p-4 bg-gray-50 rounded-lg mb-2">
                    <Text className="text-gray-500 text-center">No saved payment methods yet</Text>
                    <Text className="text-gray-400 text-sm text-center mt-1">Add a card below for faster checkout</Text>
                </View>
            )}

            {/* Add Payment Method */}
            <TouchableOpacity 
                className="flex-row items-center p-4"
                onPress={handleAddPaymentMethod}
            >
                <View className="w-4 h-4 bg-blue-600 rounded-full mr-3"></View>
                <Text className="text-lg text-blue-600">Add payment method</Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
                className={`w-full py-4 rounded-[20px] mt-10 ${
                    selectedMethod ? "bg-blue-800" : "bg-gray-400"
                }`}
                disabled={!selectedMethod}
                onPress={handleNext}
            >
                <Text className="text-center text-white font-bold text-lg">Next</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default PaymentMethodSelection; 