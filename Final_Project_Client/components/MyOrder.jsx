import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/init";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const MyOrder = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUID, setUserUID] = useState(null);

  const menuItems = [
      { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
      { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
      { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
      { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
  ];

  // Get current user UID
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
    } else {
      console.log('No authenticated user found');
      setLoading(false);
    }
  }, []);

  // Fetch real-time ride requests for the current user
  useEffect(() => {
    if (!userUID) return;

    console.log('Setting up real-time orders listener for user:', userUID);
    
    const ordersQuery = query(
      collection(db, 'rideRequests'),
      where('customerId', '==', userUID),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      try {
        const ordersData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Map delivery status to display status
          const getDisplayStatus = (deliveryStatus) => {
            switch (deliveryStatus) {
              case 'accepted':
                return { status: 'On Process', description: 'Driver accepted, coming to pickup', color: 'text-blue-500' };
              case 'collecting':
                return { status: 'On Process', description: 'Driver collecting package', color: 'text-orange-500' };
              case 'in_transit':
                return { status: 'On Process', description: 'Package in transit', color: 'text-blue-500' };
              case 'delivered':
                return { status: 'Delivered', description: 'Package delivered successfully', color: 'text-green-500' };
              case 'cancelled':
                return { status: 'Cancelled', description: 'Delivery cancelled', color: 'text-red-500' };
              default:
                return { status: 'Pending', description: 'Waiting for driver acceptance', color: 'text-yellow-500' };
            }
          };

          const displayStatus = getDisplayStatus(data.deliveryStatus || 'pending');

          ordersData.push({
            id: doc.id,
            trackingNumber: doc.id.substring(0, 10).toUpperCase(),
            status: displayStatus.status,
            description: displayStatus.description,
            color: displayStatus.color,
            // Include full data for navigation
            fullData: {
              ...data,
              rideRequestId: doc.id
            }
          });
        });

        setOrders(ordersData);
        setLoading(false);
        console.log(`✅ Loaded ${ordersData.length} orders for user`);
      } catch (error) {
        console.error('❌ Error processing orders:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Error listening to orders:', error);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up orders listener');
      unsubscribe();
    };
  }, [userUID]);

  const tabs = ["All", "Pending", "On Process", "Delivered"];

  // Filter orders based on selected tab and search text
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by tab
    if (selectedTab !== "All") {
      filtered = filtered.filter((order) => {
        if (selectedTab === "On Process") {
          return order.status === "On Process";
        }
        return order.status === selectedTab;
      });
    }

    // Filter by search text
    if (searchText.trim()) {
      filtered = filtered.filter((order) =>
        order.trackingNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        order.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const handleOrderPress = (order) => {
    // Navigate based on order status
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      // Navigate to OrderPreview for completed orders
      navigation.navigate('OrderPreview', { order: order.fullData });
    } else {
      // Navigate to RiderConfirmed for active orders
      navigation.navigate('RiderConfirmed', {
        packageDetails: order.fullData.packageDetails,
        courierDetails: order.fullData.courierDetails,
        rideDetails: order.fullData.rideDetails,
        distance: order.fullData.distance,
        duration: order.fullData.duration,
        driver: order.fullData.driver,
        rideRequestId: order.fullData.rideRequestId
      });
    }
  };

  const getOrderIcon = (status) => {
    switch (status) {
      case 'Delivered':
        return '✅';
      case 'On Process':
        return '🚛';
      case 'Cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#133BB7" />
        <Text className="mt-4 text-gray-600">Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white w-full">
      {/* Header */}
      <View className="bg-[#133BB7] p-6">
        <Text className="text-white font-bold text-lg">My Orders</Text>
        <View className="bg-white rounded-[20px] flex-row items-center mt-4 px-4">
          <TextInput
            className="flex-1 h-10 outline-none"
            placeholder="Enter tracking number"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around mt-4">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            className={`py-2 px-4 rounded-full ${selectedTab === tab ? "bg-[#133BB7]" : "bg-gray-100"}`}
          >
            <Text
              className={`${selectedTab === tab ? "text-white" : "text-gray-600"} text-sm font-medium`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order Count */}
      <View className="px-4 mt-2">
        <Text className="text-gray-600 text-sm">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
        </Text>
      </View>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-lg">📦</Text>
          <Text className="text-gray-500 mt-2">No orders found</Text>
          {selectedTab !== "All" && (
            <TouchableOpacity 
              className="mt-4 bg-[#133BB7] px-4 py-2 rounded-lg"
              onPress={() => setSelectedTab("All")}
            >
              <Text className="text-white">View All Orders</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOrderPress(item)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center bg-white mx-4 mt-4 rounded-lg shadow-sm p-4 border border-gray-100">
                {/* Icon */}
                <View className="bg-gray-100 rounded-full p-4">
                  <Text className="text-lg">{getOrderIcon(item.status)}</Text>
                </View>

                {/* Details */}
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-800">
                    #{item.trackingNumber}
                  </Text>
                  <Text className="text-gray-500" numberOfLines={2}>
                    {item.description}
                  </Text>
                  {item.fullData?.packageDetails?.packageName && (
                    <Text className="text-gray-400 text-sm mt-1">
                      {item.fullData.packageDetails.packageName}
                    </Text>
                  )}
                </View>

                {/* Status */}
                <View className="items-end">
                  <Text className={`font-bold ${item.color}`}>{item.status}</Text>
                  {item.fullData?.createdAt && (
                    <Text className="text-gray-400 text-xs mt-1">
                      {new Date(item.fullData.createdAt.seconds * 1000).toLocaleDateString()}
                    </Text>
                  )}
                </View>
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
            onPress={() => {
              setActiveTab(item.screen);
              navigation.navigate(item.screen);
            }}
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