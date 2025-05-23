import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from '../firebase/init';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const StatsPage = () => {
    const navigation = useNavigation();
    const screenWidth = Dimensions.get('window').width;
    const [activeTab, setActiveTab] = useState("Home");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOrders: 0,
        revenue: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        monthlyData: [],
        recentActivity: []
    });
    const [driver, setDriver] = useState(null);

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];

    useEffect(() => {
        fetchDriverStats();
    }, []);

    const fetchDriverStats = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            
            if (!user) {
                navigation.navigate('Login');
                return;
            }

            // Get driver data
            const driversQuery = query(
                collection(db, 'drivers'),
                where('uid', '==', user.uid)
            );
            
            const driverSnapshot = await getDocs(driversQuery);
            
            if (driverSnapshot.empty) {
                console.log('No driver found for user');
                setLoading(false);
                return;
            }

            const driverData = {
                id: driverSnapshot.docs[0].id,
                ...driverSnapshot.docs[0].data()
            };
            setDriver(driverData);

            // Fetch all orders for this driver
            const ordersQuery = query(
                collection(db, 'rideRequests'),
                where('driverId', '==', driverData.id),
                orderBy('acceptedAt', 'desc')
            );
            
            const ordersSnapshot = await getDocs(ordersQuery);
            const orders = [];
            
            ordersSnapshot.forEach(doc => {
                orders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log('📊 Loaded', orders.length, 'orders for stats');

            // Calculate statistics
            const completedOrders = orders.filter(order => order.status === 'completed');
            const pendingOrders = orders.filter(order => order.status === 'accepted');
            const cancelledOrders = orders.filter(order => order.status === 'cancelled');
            
            // Calculate revenue (assuming driver gets 80% of ride price)
            const totalRevenue = completedOrders.reduce((sum, order) => {
                const price = order.rideDetails?.price || 0;
                return sum + (price * 0.8); // Driver gets 80%
            }, 0);

            // Get monthly data for chart (last 6 months)
            const monthlyData = getMonthlyOrderData(orders);
            
            // Get recent activity (last 10 orders)
            const recentActivity = orders.slice(0, 10).map(order => ({
                id: order.id,
                packageName: order.packageDetails?.packageName || 'Package',
                trackingId: order.packageDetails?.trackingId || order.id.substring(0, 8),
                status: order.status,
                acceptedAt: order.acceptedAt,
                completedAt: order.completedAt,
                cancelledAt: order.cancelledAt,
                cancellationReason: order.cancellationReason,
                revenue: order.rideDetails?.price ? (order.rideDetails.price * 0.8) : 0
            }));

            setStats({
                totalOrders: orders.length,
                revenue: totalRevenue,
                completedOrders: completedOrders.length,
                pendingOrders: pendingOrders.length,
                cancelledOrders: cancelledOrders.length,
                monthlyData,
                recentActivity
            });

        } catch (error) {
            console.error('❌ Error fetching driver stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate monthly order data for the chart
    const getMonthlyOrderData = (orders) => {
        const months = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        
        // Generate last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: monthNames[date.getMonth()],
                year: date.getFullYear(),
                count: 0
            });
        }
        
        // Count orders per month
        orders.forEach(order => {
            const orderDate = order.acceptedAt ? new Date(order.acceptedAt.toMillis()) : null;
            if (!orderDate) return;
            
            const orderMonth = orderDate.getMonth();
            const orderYear = orderDate.getFullYear();
            
            const monthIndex = months.findIndex(m => 
                m.month === monthNames[orderMonth] && m.year === orderYear
            );
            
            if (monthIndex !== -1) {
                months[monthIndex].count++;
            }
        });
        
        return {
            labels: months.map(m => m.month),
            datasets: [{ data: months.map(m => m.count) }]
        };
    };

    // Format currency for display
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Handle navigation for bottom nav items
    const handleNavigation = (screenName) => {
        setActiveTab(screenName);
        
        switch (screenName) {
            case "Home":
                navigation.navigate("DriverHome");
                break;
            case "Delivery":
                navigation.navigate("MyOrder");
                break;
            case "Notifications":
                navigation.navigate("ChatList");
                break;
            case "Account":
                navigation.navigate("Profile");
                break;
            default:
                break;
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#133BB7" />
                <Text className="mt-4 text-gray-600">Loading your statistics...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center mb-4">
                <TouchableOpacity onPress={() => navigation.navigate("DriverHome")} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-bold mb-1">Driver Statistics</Text>
                    <Text className="text-gray-500 text-base mb-4">Overview of your performance</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Stats Cards Row 1 */}
                <View className="flex-row justify-between mb-4">
                    <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                        <Text className="text-gray-500 text-sm">Total Orders</Text>
                        <Text className="text-2xl font-bold">{stats.totalOrders}</Text>
                        <Text className="text-green-600 text-xs">All time</Text>
                    </View>
                    <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                        <Text className="text-gray-500 text-sm">Total Revenue</Text>
                        <Text className="text-2xl font-bold">{formatCurrency(stats.revenue)}</Text>
                        <Text className="text-green-600 text-xs">Earned to date</Text>
                    </View>
                </View>

                {/* Stats Cards Row 2 */}
                <View className="flex-row justify-between mb-4">
                    <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                        <Text className="text-gray-500 text-sm">Completed</Text>
                        <Text className="text-2xl font-bold">{stats.completedOrders}</Text>
                        <Text className="text-blue-600 text-xs">Delivered successfully</Text>
                    </View>
                    <View className="bg-gray-100 rounded-xl p-4 w-[47%]">
                        <Text className="text-gray-500 text-sm">Active</Text>
                        <Text className="text-2xl font-bold">{stats.pendingOrders}</Text>
                        <Text className="text-orange-600 text-xs">In progress</Text>
                    </View>
                </View>

                {/* Stats Cards Row 3 - Cancellation Stats */}
                {stats.cancelledOrders > 0 && (
                    <View className="flex-row justify-between mb-4">
                        <View className="bg-red-50 rounded-xl p-4 w-[47%] border border-red-100">
                            <Text className="text-gray-500 text-sm">Cancelled</Text>
                            <Text className="text-2xl font-bold text-red-600">{stats.cancelledOrders}</Text>
                            <Text className="text-red-500 text-xs">
                                {stats.totalOrders > 0 ? 
                                    `${Math.round((stats.cancelledOrders / stats.totalOrders) * 100)}% of total` :
                                    'No orders yet'
                                }
                            </Text>
                        </View>
                        <View className="bg-green-50 rounded-xl p-4 w-[47%] border border-green-100">
                            <Text className="text-gray-500 text-sm">Success Rate</Text>
                            <Text className="text-2xl font-bold text-green-600">
                                {stats.totalOrders > 0 ? 
                                    `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%` : 
                                    '0%'
                                }
                            </Text>
                            <Text className="text-green-500 text-xs">Completion rate</Text>
                        </View>
                    </View>
                )}

                {/* Monthly Orders Chart */}
                {stats.monthlyData.labels && stats.monthlyData.labels.length > 0 && (
                    <View className="bg-gray-100 rounded-xl p-3 mb-4">
                        <Text className="font-semibold text-base mb-2">Monthly Orders (Last 6 Months)</Text>
                        <LineChart
                            data={stats.monthlyData}
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
                )}

                {/* Recent Activity */}
                <Text className="text-lg font-semibold mb-2">Recent Activity</Text>

                {stats.recentActivity.length > 0 ? (
                    stats.recentActivity.slice(0, 5).map((activity, index) => (
                        <View key={activity.id} className="bg-gray-100 rounded-xl p-4 mb-3">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="text-base font-medium">{activity.packageName}</Text>
                                    <Text className="text-gray-500 text-sm">#{activity.trackingId}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <View className={`px-2 py-1 rounded-full ${
                                            activity.status === 'completed' ? 'bg-green-100' : 
                                            activity.status === 'accepted' ? 'bg-blue-100' : 
                                            activity.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-200'
                                        }`}>
                                            <Text className={`text-xs font-medium ${
                                                activity.status === 'completed' ? 'text-green-700' : 
                                                activity.status === 'accepted' ? 'text-blue-700' : 
                                                activity.status === 'cancelled' ? 'text-red-700' : 'text-gray-700'
                                            }`}>
                                                {activity.status === 'completed' ? 'Delivered' : 
                                                 activity.status === 'accepted' ? 'In Progress' : 
                                                 activity.status === 'cancelled' ? 'Cancelled' :
                                                 activity.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-400 text-xs mt-1">
                                        {activity.status === 'cancelled' && activity.cancelledAt ?
                                            `Cancelled: ${new Date(activity.cancelledAt.toMillis()).toLocaleDateString()}` :
                                            activity.status === 'completed' && activity.completedAt ?
                                            `Completed: ${new Date(activity.completedAt.toMillis()).toLocaleDateString()}` :
                                            activity.acceptedAt ? 
                                            `Accepted: ${new Date(activity.acceptedAt.toMillis()).toLocaleDateString()}` :
                                            'No date available'
                                        }
                                    </Text>
                                    {/* Show cancellation reason if available */}
                                    {activity.status === 'cancelled' && activity.cancellationReason && (
                                        <Text className="text-red-600 text-xs mt-1">
                                            Reason: {activity.cancellationReason}
                                        </Text>
                                    )}
                                </View>
                                <View className="items-end">
                                    <Text className={`font-semibold ${
                                        activity.status === 'cancelled' ? 'text-red-500' : 'text-blue-500'
                                    }`}>
                                        {activity.status === 'cancelled' ? 'Lost' : formatCurrency(activity.revenue)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                ) : (
                    <View className="bg-gray-50 rounded-xl p-6 items-center">
                        <Ionicons name="receipt-outline" size={48} color="gray" />
                        <Text className="text-gray-500 text-center mt-2">No activity yet</Text>
                        <Text className="text-gray-400 text-center text-sm">
                            Start accepting deliveries to see your activity here
                        </Text>
                    </View>
                )}

                {/* Performance Summary */}
                {stats.totalOrders > 0 && (
                    <View className="mt-4 bg-blue-50 rounded-xl p-4">
                        <Text className="text-lg font-semibold mb-2 text-blue-900">Performance Summary</Text>
                        <View className="space-y-2">
                            <View className="flex-row justify-between">
                                <Text className="text-blue-700">Completion Rate:</Text>
                                <Text className="text-blue-900 font-medium">
                                    {Math.round((stats.completedOrders / stats.totalOrders) * 100)}%
                                </Text>
                            </View>
                            {stats.cancelledOrders > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-blue-700">Cancellation Rate:</Text>
                                    <Text className="text-red-600 font-medium">
                                        {Math.round((stats.cancelledOrders / stats.totalOrders) * 100)}%
                                    </Text>
                                </View>
                            )}
                            <View className="flex-row justify-between">
                                <Text className="text-blue-700">Average per Order:</Text>
                                <Text className="text-blue-900 font-medium">
                                    {formatCurrency(stats.completedOrders > 0 ? stats.revenue / stats.completedOrders : 0)}
                                </Text>
                            </View>
                            {stats.completedOrders > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-blue-700">Total Earned:</Text>
                                    <Text className="text-blue-900 font-bold">
                                        {formatCurrency(stats.revenue)}
                                    </Text>
                                </View>
                            )}
                            {stats.cancelledOrders > 0 && (
                                <View className="flex-row justify-between">
                                    <Text className="text-blue-700">Potential Lost Revenue:</Text>
                                    <Text className="text-red-600 font-medium">
                                        {formatCurrency(stats.cancelledOrders * (stats.revenue / Math.max(stats.completedOrders, 1)))}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Navigation */}
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
                        onPress={() => handleNavigation(item.screen)}
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
                            className={`text-sm ${activeTab === item.screen ? "text-blue-600" : "text-gray-500"}`}
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
