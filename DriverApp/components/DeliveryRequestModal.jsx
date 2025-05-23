import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // You can change the icon set
import { formatCurrency } from '../utils/helpers';

const DeliveryRequestModal = ({ visible, rideRequest, onAccept, onDecline }) => {
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds for better UX
    const { packageDetails, courierDetails, rideDetails, distance, duration } = rideRequest || {};

    useEffect(() => {
        if (!visible) return;

        setTimeLeft(60); // Reset to 60 seconds on open
        console.log('📱 Delivery request modal opened - 60 seconds to respond');

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    console.log('⏰ Request timed out - auto declining');
                    onDecline(); // Auto-decline on timeout
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [visible, onDecline]);

    const formatTime = (sec) => `${Math.floor(sec / 60)}:${(sec % 60) < 10 ? '0' : ''}${sec % 60}`;

    if (!rideRequest) return null;

    // Calculate earnings based on ride details and distance
    const calculateEarnings = () => {
        // Base rate calculation
        let baseRate = 0;
        
        if (rideDetails && rideDetails.price) {
            // Driver gets 80% of the ride price
            baseRate = rideDetails.price * 0.8;
        } else {
            // Fallback calculation if price is not provided
            baseRate = (distance || 5) * 150; // 150 LKR per km base rate
        }
        
        return baseRate;
    };

    const earnings = calculateEarnings();

    // Timer color based on urgency
    const getTimerColor = () => {
        if (timeLeft <= 10) return '#EF4444'; // Red - urgent
        if (timeLeft <= 20) return '#F59E0B'; // Amber - warning
        return '#3B82F6'; // Blue - normal
    };

    return (
        <Modal
            transparent={true}
            animationType="slide"
            visible={visible}
            onRequestClose={onDecline}
        >
            <View className="flex-1 justify-center bg-black/50 px-5">
                <View className="bg-white rounded-xl p-6 border-2 border-blue-500">
                    {/* New Delivery Request Header */}
                    <View className="mb-4">
                        <Text className="text-xl font-bold text-center text-gray-900">🚚 New Delivery Request</Text>
                        <Text className="text-center text-gray-500 text-sm mt-1">
                            A customer needs a delivery in your area
                        </Text>
                    </View>

                    {/* Timer */}
                    <View className="flex-row justify-between items-center mb-6 bg-gray-50 rounded-lg p-3">
                        <Text className="font-semibold text-gray-700 flex-row items-center">
                            <Icon name="clock" size={16} /> Time to respond:
                        </Text>
                        <Text 
                            className="font-bold text-lg"
                            style={{ color: getTimerColor() }}
                        >
                            {formatTime(timeLeft)}
                        </Text>
                    </View>

                    {/* Locations */}
                    <View className="mb-6">
                        <View className="mb-4">
                            <Text className="text-gray-500 text-sm mb-1">📍 Pickup Location</Text>
                            <Text className="font-semibold text-gray-900 text-base">
                                {packageDetails?.pickupLocation || 'Unknown location'}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-gray-500 text-sm mb-1">🎯 Drop-off Location</Text>
                            <Text className="font-semibold text-gray-900 text-base">
                                {packageDetails?.dropoffLocation || 'Unknown location'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-col gap-4">
                        {/* Package Details */}
                        <View className="bg-white rounded-xl p-4 border border-gray-200">
                            {/* Header */}
                            <Text className="text-lg font-bold text-gray-900 mb-4">Package Details</Text>

                            {/* Details Grid */}
                            <View className="flex-row gap-4 justify-between items-center">
                                {/* Weight */}
                                <View className="items-center border py-4 border-gray-200 rounded-xl flex-1">
                                    <Icon name="box" size={20} color="#4B5563" />
                                    <Text className="text-gray-500 text-sm mt-1">Weight</Text>
                                    <Text className="font-semibold text-gray-800">
                                        {packageDetails?.weight ? `${packageDetails.weight} kg` : 'N/A'}
                                    </Text>
                                </View>

                                {/* Size */}
                                <View className="items-center border py-4 border-gray-200 rounded-xl flex-1">
                                    <Icon name="maximize" size={20} color="#4B5563" />
                                    <Text className="text-gray-500 text-sm mt-1">Size</Text>
                                    <Text className="font-semibold text-gray-800">
                                        {packageDetails?.length && packageDetails?.width && packageDetails?.height 
                                            ? `${packageDetails.length}×${packageDetails.width}×${packageDetails.height}` 
                                            : 'Medium'}
                                    </Text>
                                </View>

                                {/* Type */}
                                <View className="items-center border py-4 border-gray-200 rounded-xl flex-1">
                                    <Icon name="tag" size={20} color="#4B5563" />
                                    <Text className="text-gray-500 text-sm mt-1">Type</Text>
                                    <Text className="font-semibold text-gray-800">
                                        {packageDetails?.shipmentType || 'Parcel'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Courier Company */}
                        {courierDetails && (
                            <View className="bg-white rounded-xl p-4 border border-gray-200 mb-2">
                                <Text className="text-gray-500 text-sm mb-1">Courier Company</Text>
                                <View className="flex-row items-center">
                                    {courierDetails.imageUrl ? (
                                        <Image 
                                            source={{ uri: courierDetails.imageUrl }} 
                                            style={{ width: 24, height: 24, marginRight: 8 }} 
                                        />
                                    ) : (
                                        <Icon name="truck" size={20} color="#4B5563" style={{ marginRight: 8 }} />
                                    )}
                                    <Text className="font-bold text-gray-900">
                                        {courierDetails.courierName || 'Unknown Courier'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Estimated Earnings */}
                        <View className="rounded-xl p-4 border bg-white border-gray-200">
                            <Text className="text-2xl font-bold text-gray-900">Estimated Earnings</Text>

                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500 mb-1">
                                    {distance ? `${distance.toFixed(1)} km` : '0.0 km'} • 
                                    {duration ? ` ~${Math.round(duration)} mins` : ' ~0 mins'}
                                </Text>
                                <Text className="text-2xl font-bold text-green-500">
                                    {formatCurrency(earnings)}
                                </Text>
                            </View>
                        </View>

                        {/* Buttons */}
                        <View className="flex-row gap-2 space-x-3">
                            <TouchableOpacity
                                onPress={onDecline}
                                className="flex-1 py-5 bg-red-100 rounded-lg items-center"
                            >
                                <Text className="font-bold text-red-700">Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onAccept}
                                className="flex-1 bg-green-500 py-5 rounded-lg items-center"
                            >
                                <Text className="font-bold text-white">Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default DeliveryRequestModal;
