import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/init';

const DeliveryComplete = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { rideRequest, deliveryProof } = route.params || {};
    
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryData, setDeliveryData] = useState(null);

    // Extract delivery details
    useEffect(() => {
        if (rideRequest) {
            console.log('🎉 DeliveryComplete received:', rideRequest);
            setDeliveryData(rideRequest);
        }
    }, [rideRequest]);

    const handleCompleteDelivery = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please provide a rating for your delivery experience.');
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('🏁 Completing delivery for order:', rideRequest?.id);

            if (!rideRequest?.id) {
                throw new Error('No ride request ID available');
            }

            const rideRequestRef = doc(db, 'rideRequests', rideRequest.id);
            
            // Update delivery status to completed
            const updateData = {
                deliveryStatus: 'delivered',
                deliveredAt: serverTimestamp(),
                driverRating: rating,
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Add delivery proof if available
            if (deliveryProof) {
                updateData.deliveryProof = deliveryProof;
            }

            await updateDoc(rideRequestRef, updateData);
            
            console.log('✅ Delivery marked as completed successfully');

            // Show success message
            Alert.alert(
                'Delivery Completed!',
                'The package has been successfully delivered. Great job!',
                [
                    {
                        text: 'Return to Home',
                        onPress: () => {
                            // Reset the navigation stack and go to DriverHome
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'DriverHome' }],
                            });
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('❌ Error completing delivery:', error);
            Alert.alert(
                'Error',
                'Failed to complete delivery. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackPress = () => {
        Alert.alert(
            'Confirm',
            'Are you sure you want to go back? The delivery completion will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go Back', onPress: () => navigation.goBack() }
            ]
        );
    };

    if (!deliveryData) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="mt-4 text-gray-600">Loading delivery details...</Text>
            </View>
        );
    }

    const { packageDetails, courierDetails } = deliveryData;

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Header */}
            <View className="bg-green-600 p-6 pb-8">
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity onPress={handleBackPress}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold ml-4">Delivery Complete</Text>
                </View>

                {/* Success Indicator */}
                <View className="items-center">
                    <View className="bg-white rounded-full p-4 mb-4">
                        <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
                    </View>
                    <Text className="text-white text-2xl font-bold">Well Done!</Text>
                    <Text className="text-green-100 text-center mt-2">
                        Package successfully delivered
                    </Text>
                </View>
            </View>

            {/* Customer Info */}
            <View className="mx-4 -mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <View className="items-center">
                    <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center mb-3">
                        <Ionicons name="person" size={32} color="#6B7280" />
                    </View>
                    <Text className="text-xl font-bold text-gray-800">Customer</Text>
                    <Text className="text-gray-500">Package delivered successfully</Text>
                </View>
            </View>

            {/* Package Details */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-3">Package Details</Text>
                
                {packageDetails && (
                    <>
                        <View className="mb-4">
                            <Text className="font-semibold text-gray-800 text-base mb-1">
                                {packageDetails.packageName}
                            </Text>
                            <Text className="text-gray-600">
                                {packageDetails.shipmentType}
                                {packageDetails.weight ? ` • ${packageDetails.weight} kg` : ''}
                            </Text>
                        </View>

                        <View className="space-y-3">
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">From</Text>
                                <Text className="text-gray-800">{packageDetails.pickupLocation}</Text>
                            </View>
                            
                            <View>
                                <Text className="text-gray-500 text-sm font-medium">To</Text>
                                <Text className="text-gray-800">{packageDetails.dropoffLocation}</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Delivery Summary */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-3">Delivery Summary</Text>
                
                <View className="space-y-3">
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Courier Service</Text>
                        <Text className="text-gray-800 font-medium">
                            {courierDetails?.company || 'Courier Service'}
                        </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Vehicle Type</Text>
                        <Text className="text-gray-800 font-medium">
                            {deliveryData.rideDetails?.name || 'Vehicle'}
                        </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Distance</Text>
                        <Text className="text-gray-800 font-medium">
                            {deliveryData.distance || 'N/A'}
                        </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Duration</Text>
                        <Text className="text-gray-800 font-medium">
                            {deliveryData.duration || 'N/A'}
                        </Text>
                    </View>
                    
                    <View className="border-t border-gray-200 pt-3">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Status</Text>
                            <Text className="text-green-600 font-bold">DELIVERED</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Rating Section */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-2">Rate Your Experience</Text>
                <Text className="text-gray-600 mb-4">
                    How was your delivery experience today?
                </Text>

                <View className="flex-row justify-center items-center mb-4">
                    {[1, 2, 3, 4, 5].map((num) => (
                        <TouchableOpacity 
                            key={num} 
                            onPress={() => setRating(num)}
                            className="mx-2 p-2"
                        >
                            <FontAwesome
                                name="star"
                                size={36}
                                color={num <= rating ? "#F59E0B" : "#D1D5DB"}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                
                {rating > 0 && (
                    <Text className="text-center text-gray-600">
                        {rating === 5 ? "Excellent!" : 
                         rating === 4 ? "Great!" : 
                         rating === 3 ? "Good" : 
                         rating === 2 ? "Fair" : "Needs Improvement"}
                    </Text>
                )}
            </View>

            {/* Action Buttons */}
            <View className="mx-4 mb-6">
                <TouchableOpacity
                    onPress={handleCompleteDelivery}
                    disabled={isSubmitting || rating === 0}
                    className={`p-4 rounded-xl mb-3 ${
                        rating > 0 && !isSubmitting ? 'bg-green-600' : 'bg-gray-400'
                    }`}
                >
                    {isSubmitting ? (
                        <View className="flex-row items-center justify-center">
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white font-bold ml-2">Completing Delivery...</Text>
                        </View>
                    ) : (
                        <Text className="text-white text-center font-bold text-lg">
                            Complete Delivery
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('DriverHome')}
                    className="bg-gray-100 p-4 rounded-xl"
                >
                    <Text className="text-gray-700 text-center font-medium">Return to Home</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default DeliveryComplete;
