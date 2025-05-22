import React, { useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { LineChart } from 'react-native-chart-kit';


const StatsPage = () => {
    const screenWidth = Dimensions.get('window').width;

    const [activeTab, setActiveTab] = useState("Home"); // Default selected tab

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];

    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <Text className="text-xl font-bold mb-1">Statistics</Text>
            <Text className="text-gray-500 text-base mb-4">Overview of your performance</Text>

            {/* Cards */}
            <View className="flex-row justify-between mb-4">
                <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                    <Text className="text-gray-500 text-sm">Total Orders</Text>
                    <Text className="text-2xl font-bold">1,234</Text>
                    <Text className="text-green-600 text-xs">↑ 12%</Text>
                </View>
                <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                    <Text className="text-gray-500 text-sm">Revenue</Text>
                    <Text className="text-2xl font-bold">$8,492</Text>
                    <Text className="text-green-600 text-xs">↑ 8%</Text>
                </View>
            </View>
            <ScrollView>
                {/* Monthly Orders Chart */}
                <View className="bg-gray-100 rounded-xl p-3 mb-4">
                    <Text className="font-semibold text-base mb-2">Monthly Orders</Text>
                    <LineChart
                        data={{
                            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                            datasets: [{ data: [4, 6, 5, 8, 7, 10] }]
                        }}
                        width={screenWidth - wp('10%')}
                        height={hp('25%')}
                        chartConfig={{
                            backgroundGradientFrom: '#fff',
                            backgroundGradientTo: '#fff',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                            labelColor: () => '#9CA3AF',
                            propsForDots: {
                                r: '4',
                                strokeWidth: '1',
                                stroke: '#3B82F6'
                            }
                        }}
                        bezier
                        style={{ borderRadius: 16 }}
                    />
                </View>

                {/* Recent Activity */}
                <Text className="text-lg font-semibold mb-2">Recent Activity</Text>

                <View className="bg-gray-100 rounded-xl p-4 mb-3 relative">
                    <Text className="text-base font-medium">New Order #1234</Text>
                    <Text className="text-gray-500 text-sm">2 minutes ago</Text>
                    <Text className="absolute right-4 top-4 text-blue-500 font-semibold">$124.00</Text>
                </View>

                <View className="bg-gray-100 rounded-xl p-4 mb-3 relative">
                    <Text className="text-base font-medium">New Order #1233</Text>
                    <Text className="text-gray-500 text-sm">15 minutes ago</Text>
                    <Text className="absolute right-4 top-4 text-blue-500 font-semibold">$85.00</Text>
                </View>
            </ScrollView>
            <View
                className="flex-row w-full justify-between bg-white px-8 py-4 border-t border-gray-200"
                style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    backgroundColor: "white",
                }}
            >
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className="items-center"
                        onPress={() => setActiveTab(item.screen)}
                    >
                        <Image
                            source={item.icon}
                            style={{
                                width: 24,
                                height: 24,
                                tintColor: activeTab === item.screen ? "blue" : "gray",
                            }}
                            resizeMode="contain"
                        />
                        <Text
                            className={`text-sm ${activeTab === item.screen ? "text-blue-600" : "text-gray-500"
                                }`}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

        </View>
    );
};

export default StatsPage;
