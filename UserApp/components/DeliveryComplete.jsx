import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/init';

const DeliveryComplete = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { orderData, driver } = route.params || {};
    
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (orderData) {
            console.log('🎉 DeliveryComplete received order data:', orderData);
        }
    }, [orderData]);

    const handleSubmitRating = async () => {
        if (rating === 0) {
            Alert.alert('Rating Required', 'Please provide a rating for the driver before continuing.');
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('⭐ Submitting driver rating:', rating);

            if (!orderData?.rideRequestId) {
                throw new Error('No ride request ID available');
            }

            const rideRequestRef = doc(db, 'rideRequests', orderData.rideRequestId);
            
            // Update with customer rating
            const updateData = {
                customerRating: rating,
                customerRatedAt: serverTimestamp(),
                isRated: true,
                updatedAt: serverTimestamp()
            };

            await updateDoc(rideRequestRef, updateData);
            
            console.log('✅ Driver rating submitted successfully');

            // Show success message and navigate home
            Alert.alert(
                'Thank You!',
                `Your ${rating}-star rating has been submitted. Thank you for using EasyDeliver!`,
                [
                    {
                        text: 'Continue',
                        onPress: () => {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }],
                            });
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('❌ Error submitting rating:', error);
            Alert.alert('Error', 'Failed to submit rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkipRating = () => {
        Alert.alert(
            'Skip Rating?',
            'Would you like to skip rating the driver?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Skip',
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                        });
                    }
                }
            ]
        );
    };

    if (!orderData) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <Ionicons name="alert-circle-outline" size={64} color="gray" />
                <Text className="text-gray-600 text-lg mt-4">No delivery data available</Text>
                <TouchableOpacity 
                    className="mt-6 bg-[#133BB7] px-6 py-3 rounded-lg"
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text className="text-white font-semibold">Go to Home</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white">
                <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
                    <TouchableOpacity 
                        className="rounded-full p-2 border-2 border-gray-200"
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Ionicons name="close" size={20} color="black" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold">Delivery Complete</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            {/* Success Icon */}
            <View className="items-center py-8 bg-white mb-6">
                <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-4">
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-2">Package Delivered!</Text>
                <Text className="text-gray-600 text-center px-8">
                    Your package has been successfully delivered. We hope you're satisfied with our service.
                </Text>
            </View>

            {/* Driver Details */}
            {driver && (
                <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                    <Text className="text-lg font-bold text-gray-800 mb-3">Your Driver</Text>
                    <View className="flex-row items-center">
                        {driver.profileImage ? (
                            <Image
                                source={{ uri: driver.profileImage }}
                                className="w-16 h-16 rounded-full"
                            />
                        ) : (
                            <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center">
                                <Text className="text-blue-600 font-bold text-xl">
                                    {driver.fullName?.charAt(0) || 'D'}
                                </Text>
                            </View>
                        )}
                        <View className="ml-4 flex-1">
                            <Text className="text-lg font-semibold text-gray-800">
                                {driver.fullName || 'Driver'}
                            </Text>
                            <Text className="text-gray-500">
                                {driver.vehicleNumber || 'Delivery Vehicle'}
                            </Text>
                            {driver.rating && (
                                <View className="flex-row items-center mt-1">
                                    <FontAwesome name="star" size={14} color="#F59E0B" />
                                    <Text className="text-gray-600 ml-1 text-sm">
                                        {driver.rating} rating
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Delivery Summary */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-3">Delivery Summary</Text>
                
                {orderData.packageDetails && (
                    <View className="space-y-3">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">Package</Text>
                            <Text className="text-gray-800 font-medium">
                                {orderData.packageDetails.packageName || 'Package'}
                            </Text>
                        </View>
                        
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">From</Text>
                            <Text className="text-gray-800 font-medium flex-1 text-right ml-4">
                                {orderData.packageDetails.pickupLocation || 'Pickup Location'}
                            </Text>
                        </View>
                        
                        <View className="flex-row justify-between">
                            <Text className="text-gray-600">To</Text>
                            <Text className="text-gray-800 font-medium flex-1 text-right ml-4">
                                {orderData.packageDetails.dropoffLocation || 'Dropoff Location'}
                            </Text>
                        </View>
                        
                        {orderData.courierDetails && (
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Courier</Text>
                                <Text className="text-gray-800 font-medium">
                                    {orderData.courierDetails.courierName || 'Courier Service'}
                                </Text>
                            </View>
                        )}
                        
                        <View className="border-t border-gray-200 pt-3">
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600">Status</Text>
                                <Text className="text-green-600 font-bold">DELIVERED</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Rating Section */}
            <View className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-800 mb-2">Rate Your Driver</Text>
                <Text className="text-gray-600 mb-4">
                    How was your experience with the driver? Your feedback helps us improve our service.
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
                    <Text className="text-center text-gray-600 mb-2">
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
                    onPress={handleSubmitRating}
                    disabled={isSubmitting || rating === 0}
                    className={`p-4 rounded-xl mb-3 ${
                        rating > 0 && !isSubmitting ? 'bg-[#133BB7]' : 'bg-gray-400'
                    }`}
                >
                    {isSubmitting ? (
                        <View className="flex-row items-center justify-center">
                            <ActivityIndicator color="white" size="small" />
                            <Text className="text-white font-bold ml-2">Submitting Rating...</Text>
                        </View>
                    ) : (
                        <Text className="text-white text-center font-bold text-lg">
                            Submit Rating
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSkipRating}
                    className="bg-gray-100 p-4 rounded-xl"
                >
                    <Text className="text-gray-700 text-center font-medium">Skip Rating</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default DeliveryComplete;
