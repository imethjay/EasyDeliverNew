import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useRoute } from '@react-navigation/native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/init';
import LocationService from '../utils/LocationService';

const ProofOfDeliveryScreen = ({ navigation }) => {
    const [image, setImage] = useState(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const route = useRoute();
    const { rideRequest } = route.params || {};

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Camera access is required to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCompleteDelivery = async () => {
        if (!image) {
            Alert.alert('Photo Required', 'Please take a photo as proof of delivery before completing.');
            return;
        }

        if (!rideRequest) {
            Alert.alert('Error', 'Delivery information not found.');
            return;
        }

        try {
            setIsCompleting(true);

            // Update the ride request status to completed
            const requestRef = doc(db, 'rideRequests', rideRequest.id);
            await updateDoc(requestRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                proofOfDeliveryPhoto: image,
                updatedAt: serverTimestamp()
            });

            // Stop location tracking
            console.log('Stopping location tracking - delivery completed');
            await LocationService.stopTracking();

            // Show success message
            Alert.alert(
                'Delivery Completed!', 
                'Thank you for completing the delivery successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('DeliveryComplete', { rideRequest })
                    }
                ]
            );

        } catch (error) {
            console.error('Error completing delivery:', error);
            Alert.alert('Error', 'Failed to complete delivery. Please try again.');
        } finally {
            setIsCompleting(false);
        }
    };
    return (
        <View className="flex-1 bg-white w-full p-5">

            {/* Header */}
            <View className="flex-row items-center  mb-10">
                <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-lg font-bold ml-2 text-center">Proof Of Delevery</Text>
            </View>

            {/* Order Summary Card */}
            <View className="mb-6">
                <Text className="text-base font-semibold mb-2">Order Summary</Text>
                <View className="bg-gray-100 rounded-xl p-4 space-y-3">
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Pickup Location</Text>
                        <Text className="text-gray-800 font-medium">No 20/6 Panadura</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Drop off Location</Text>
                        <Text className="text-gray-800 font-medium">No 20/6 Panadura</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Courier</Text>
                        <Text className="text-gray-800 font-medium">Pronto Lanka</Text>
                    </View>
                    <View className="border-t border-gray-300 my-2" />
                    <View className="flex-row justify-between">
                        <Text className="text-gray-600">Payment Method</Text>
                        <Text className="text-gray-800 font-medium">Cash</Text>
                    </View>
                </View>
            </View>

            {/* Package Photo Upload Box */}
            <View className="mb-10">
                <Text className="text-base font-semibold mb-2">Package photo</Text>

                <TouchableOpacity
                    onPress={handleTakePhoto}
                    className="border border-gray-400 border-dashed rounded-xl h-36 justify-center items-center overflow-hidden"
                >
                    {image ? (
                        <Image source={{ uri: image }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                        <>
                            <Icon name="camera" size={28} color="black" />
                            <Text className="mt-2 text-gray-700">take a photo</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
            {/* Complete Button */}
            <TouchableOpacity 
                className="bg-blue-700 py-4 rounded-[20px] items-center"
                onPress={handleCompleteDelivery}
                disabled={isCompleting}
            >
                <Text className="text-white font-semibold">
                    {isCompleting ? 'Completing...' : 'Complete Delivery'}
                </Text>
            </TouchableOpacity>

        </View>
    );
};

export default ProofOfDeliveryScreen;
