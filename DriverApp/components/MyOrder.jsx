import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from '../firebase/init';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const MyOrder = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driver, setDriver] = useState(null);

  const menuItems = [
      { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
      { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
      { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
      { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
  ];

  const tabs = ["All", "Pending", "On process", "Finished", "Cancelled"];

  // Fetch driver data and orders on component mount
  useEffect(() => {
    fetchDriverAndOrders();
  }, []);

  // Set up real-time listener for orders
  useEffect(() => {
    if (!driver) return;

    console.log('📦 Setting up real-time orders listener for driver:', driver.id);
    
    const ordersQuery = query(
      collection(db, 'rideRequests'),
      where('driverId', '==', driver.id)
    );

    const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
      const deliveries = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        deliveries.push({
          id: doc.id,
          trackingNumber: data.packageDetails?.trackingId || doc.id.substring(0, 10),
          status: mapFirebaseStatusToDisplay(data.status),
          description: getStatusDescription(data.status, data.cancellationReason),
          color: getStatusColor(data.status),
          packageName: data.packageDetails?.packageName || 'Package',
          from: data.packageDetails?.pickupLocation || 'Unknown',
          to: data.packageDetails?.dropoffLocation || 'Unknown',
          acceptedAt: data.acceptedAt,
          completedAt: data.completedAt,
          cancelledAt: data.cancelledAt,
          cancellationReason: data.cancellationReason,
          createdAt: data.createdAt,
          fullData: data
        });
      });

      // Sort by most recent first
      deliveries.sort((a, b) => {
        const timeA = a.acceptedAt?.toMillis() || a.createdAt?.toMillis() || 0;
        const timeB = b.acceptedAt?.toMillis() || b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setOrders(deliveries);
      setLoading(false);
      console.log('✅ Loaded', deliveries.length, 'orders for driver');
    }, (error) => {
      console.error('❌ Error fetching orders:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [driver]);

  const fetchDriverAndOrders = async () => {
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
      
      if (!driverSnapshot.empty) {
        const driverData = {
          id: driverSnapshot.docs[0].id,
          ...driverSnapshot.docs[0].data()
        };
        setDriver(driverData);
      } else {
        console.log('No driver found for user');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
      setLoading(false);
    }
  };

  // Map Firebase status to display status
  const mapFirebaseStatusToDisplay = (firebaseStatus) => {
    switch (firebaseStatus) {
      case 'searching':
        return 'Pending';
      case 'accepted':
        return 'On Process';
      case 'completed':
        return 'Finished';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  // Get status description
  const getStatusDescription = (status, cancellationReason) => {
    switch (status) {
      case 'searching':
        return 'Waiting for driver assignment';
      case 'accepted':
        return 'In transit to destination';
      case 'completed':
        return 'Successfully delivered';
      case 'cancelled':
        return cancellationReason ? `Cancelled: ${cancellationReason}` : 'Delivery cancelled';
      default:
        return 'Status unknown';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'searching':
        return 'text-yellow-500';
      case 'accepted':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Filter orders based on selected tab and search text
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by tab
    if (selectedTab !== "All") {
      filtered = filtered.filter((order) => order.status === selectedTab);
    }

    // Filter by search text
    if (searchText.trim()) {
      filtered = filtered.filter((order) =>
        order.trackingNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        order.packageName.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDriverAndOrders();
    setRefreshing(false);
  };

  // Handle navigation for bottom nav items
  const handleNavigation = (screenName) => {
    setActiveTab(screenName);
    
    switch (screenName) {
      case "Home":
        navigation.navigate("DriverHome");
        break;
      case "Delivery":
        // Already on delivery page, do nothing
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

  // Handle order item press
  const handleOrderPress = (order) => {
    if (order.status === 'On Process') {
      // Navigate to active delivery
      navigation.navigate('OrderPreview', { rideRequest: order.fullData });
    }
    // Could add more navigation logic for other statuses
  };

  const filteredOrders = getFilteredOrders();

  return (
    <View className="flex-1 bg-white w-full">
      {/* Header */}
      <View className="bg-[#133BB7] p-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.navigate("DriverHome")} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">My Orders</Text>
        </View>
        <View className="bg-white rounded-[20px] flex-row items-center mt-4 px-4">
          <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 h-10 outline-none"
            placeholder="Enter tracking number or package name"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close" size={20} color="gray" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around mt-4 px-4">
        {tabs.map((tab) => {
          const tabCount = tab === "All" ? orders.length : orders.filter(order => order.status === tab).length;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className={`py-2 px-3 rounded-full flex-row items-center ${selectedTab === tab ? "bg-[#133BB7]" : "bg-gray-100"}`}
            >
              <Text
                className={`${selectedTab === tab ? "text-white" : "text-gray-600"} text-sm font-medium`}
              >
                {tab}
              </Text>
              {tabCount > 0 && (
                <View className={`ml-2 rounded-full px-2 py-1 ${selectedTab === tab ? "bg-white/20" : "bg-gray-300"}`}>
                  <Text className={`text-xs ${selectedTab === tab ? "text-white" : "text-gray-600"}`}>
                    {tabCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading State */}
      {loading && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#133BB7" />
          <Text className="mt-4 text-gray-600">Loading your orders...</Text>
        </View>
      )}

      {/* Orders List */}
      {!loading && (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#133BB7"]} />
          }
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center py-12">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="receipt-outline" size={48} color="gray" />
              </View>
              <Text className="text-gray-600 text-lg font-medium mb-2">
                {searchText ? 'No matching orders found' : 
                 selectedTab === "All" ? 'No orders yet' : `No ${selectedTab.toLowerCase()} orders`}
              </Text>
              <Text className="text-gray-400 text-center px-8">
                {searchText ? 'Try adjusting your search terms' :
                 selectedTab === "All" ? 'Start accepting deliveries to see your order history' :
                 `You don't have any ${selectedTab.toLowerCase()} orders at the moment`}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="mx-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-100"
              onPress={() => handleOrderPress(item)}
              activeOpacity={0.7}
            >
              <View className="p-4">
                {/* Header Row */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 rounded-full p-2 mr-3">
                      <Text className="text-lg">📦</Text>
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800 text-base">
                        {item.packageName}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        #{item.trackingNumber}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Status Badge */}
                  <View className={`px-3 py-1 rounded-full ${
                    item.status === 'Finished' ? 'bg-green-100' : 
                    item.status === 'On Process' ? 'bg-blue-100' : 
                    item.status === 'Pending' ? 'bg-yellow-100' : 
                    item.status === 'Cancelled' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <Text className={`font-medium text-sm ${
                      item.status === 'Finished' ? 'text-green-700' : 
                      item.status === 'On Process' ? 'text-blue-700' : 
                      item.status === 'Pending' ? 'text-yellow-700' : 
                      item.status === 'Cancelled' ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Route Information */}
                <View className="bg-gray-50 rounded-lg p-3 mb-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>
                      <Text className="font-medium">From: </Text>
                      {item.from}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="flag" size={16} color="#6B7280" />
                    <Text className="text-gray-600 text-sm ml-2 flex-1" numberOfLines={1}>
                      <Text className="font-medium">To: </Text>
                      {item.to}
                    </Text>
                  </View>
                </View>

                {/* Status Description */}
                <Text className="text-gray-500 text-sm mb-2">{item.description}</Text>

                {/* Timestamp */}
                <Text className="text-gray-400 text-xs">
                  {item.status === 'Cancelled' && item.cancelledAt ? 
                    `Cancelled: ${new Date(item.cancelledAt.toMillis()).toLocaleDateString()}` :
                    item.status === 'Finished' && item.completedAt ?
                    `Completed: ${new Date(item.completedAt.toMillis()).toLocaleDateString()}` :
                    item.acceptedAt ? 
                    `Accepted: ${new Date(item.acceptedAt.toMillis()).toLocaleDateString()}` :
                    item.createdAt ? 
                    `Created: ${new Date(item.createdAt.toMillis()).toLocaleDateString()}` :
                    'No date available'
                  }
                </Text>

                {/* Action Indicator */}
                {item.status === 'On Process' && (
                  <View className="flex-row items-center justify-end mt-2">
                    <Text className="text-blue-600 text-sm font-medium mr-1">View Details</Text>
                    <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                  </View>
                )}
                
                {/* Cancellation Info */}
                {item.status === 'Cancelled' && item.cancellationReason && (
                  <View className="mt-2 bg-red-50 px-3 py-2 rounded-lg">
                    <Text className="text-red-700 text-xs font-medium">
                      Reason: {item.cancellationReason}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Bottom Navigation */}
      <View
        className="flex-row justify-between bg-white px-8 py-4 border-t border-gray-200"
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
              className={`text-sm ${
                activeTab === item.screen ? "text-blue-600" : "text-gray-500"
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

export default MyOrder;
