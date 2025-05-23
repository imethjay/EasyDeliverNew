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
import { FontAwesome } from "@expo/vector-icons";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/init";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const MyOrder = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("MyOrder");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUID, setUserUID] = useState(null);

  const menuItems = [
      { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
      { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "MyOrder" },
      { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "ChatList" },
      { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Profile" },
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
                return { 
                  status: 'On Process', 
                  description: 'Driver assigned and heading to pickup', 
                  color: 'text-blue-500',
                  progress: 25
                };
              case 'collecting':
                return { 
                  status: 'On Process', 
                  description: 'Driver collecting package', 
                  color: 'text-orange-500',
                  progress: 50
                };
              case 'in_transit':
                return { 
                  status: 'On Process', 
                  description: 'Package in transit to destination', 
                  color: 'text-blue-500',
                  progress: 75
                };
              case 'delivered':
                return { 
                  status: 'Delivered', 
                  description: 'Package delivered successfully', 
                  color: 'text-green-500',
                  progress: 100
                };
              case 'cancelled':
                return { 
                  status: 'Cancelled', 
                  description: 'Delivery cancelled', 
                  color: 'text-red-500',
                  progress: 0
                };
              default:
                return { 
                  status: 'Pending', 
                  description: 'Searching for available driver', 
                  color: 'text-yellow-500',
                  progress: 10
                };
            }
          };

          const displayStatus = getDisplayStatus(data.deliveryStatus || 'pending');

          // Calculate estimated delivery time
          const getEstimatedDelivery = (deliveryStatus, createdAt) => {
            if (!createdAt) return 'Calculating...';
            
            const now = new Date();
            const created = createdAt.toDate();
            const timePassed = now - created;
            
            switch (deliveryStatus) {
              case 'accepted':
                const eta = new Date(created.getTime() + 90 * 60 * 1000); // 90 minutes from creation
                return eta > now ? `ETA: ${eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Updating...';
              case 'collecting':
                const collectEta = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes from now
                return `ETA: ${collectEta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              case 'in_transit':
                const transitEta = new Date(now.getTime() + 45 * 60 * 1000); // 45 minutes from now
                return `ETA: ${transitEta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              case 'delivered':
                return `Delivered at ${created.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              default:
                return 'Pending assignment';
            }
          };

          ordersData.push({
            id: doc.id,
            trackingNumber: doc.id.substring(0, 10).toUpperCase(),
            status: displayStatus.status,
            description: displayStatus.description,
            color: displayStatus.color,
            progress: displayStatus.progress,
            estimatedDelivery: getEstimatedDelivery(data.deliveryStatus, data.createdAt),
            deliveryStatus: data.deliveryStatus || 'pending',
            isRated: data.isRated || false,
            customerRating: data.customerRating || null,
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
        order.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (order.fullData?.packageDetails?.packageName || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const handleOrderPress = (order) => {
    // Navigate based on order status
    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      // Navigate to OrderPreview for completed orders
      navigation.navigate('TrackingDetails', { order: order.fullData });
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

  const getOrderIcon = (status, deliveryStatus) => {
    switch (deliveryStatus) {
      case 'delivered':
        return '✅';
      case 'cancelled':
        return '❌';
      case 'accepted':
        return '🚗';
      case 'collecting':
        return '📦';
      case 'in_transit':
        return '🚛';
      default:
        return '🔍';
    }
  };

  // Get progress bar color based on status
  const getProgressColor = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'accepted':
        return '#3B82F6'; // blue
      case 'collecting':
        return '#F97316'; // orange
      case 'in_transit':
        return '#10B981'; // green
      case 'delivered':
        return '#059669'; // dark green
      case 'cancelled':
        return '#EF4444'; // red
      default:
        return '#FCD34D'; // yellow
    }
  };

  // Navigation handler for bottom tabs
  const handleTabPress = (screenName) => {
    setActiveTab(screenName);
    if (screenName !== "MyOrder") {
      navigation.navigate(screenName);
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
          <Image
            source={require("../assets/icon/search.png")}
            style={{ width: 20, height: 20, tintColor: "gray", marginRight: 10 }}
            resizeMode="contain"
          />
          <TextInput
            className="flex-1 h-10 outline-none"
            placeholder="Search by tracking ID or item name"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Image
                source={require("../assets/icon/close.png")}
                style={{ width: 20, height: 20, tintColor: "gray" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around mt-4 px-4">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            className={`py-2 px-4 rounded-full flex-1 mx-1 ${selectedTab === tab ? "bg-[#133BB7]" : "bg-gray-100"}`}
          >
            <Text
              className={`${selectedTab === tab ? "text-white" : "text-gray-600"} text-sm font-medium text-center`}
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
          <Text className="text-gray-500 mt-2 text-center px-8">
            {searchText.trim() ? 'No orders match your search' : 'No orders found'}
          </Text>
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
              <View className="bg-white mx-4 mt-4 rounded-xl shadow-sm p-4 border border-gray-100">
                {/* Header Row */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-gray-100 rounded-full p-2 mr-3">
                      <Text className="text-lg">{getOrderIcon(item.status, item.deliveryStatus)}</Text>
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800">
                        #{item.trackingNumber}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {item.fullData?.createdAt && 
                          new Date(item.fullData.createdAt.seconds * 1000).toLocaleDateString()
                        }
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold text-sm ${item.color}`}>{item.status}</Text>
                    <Text className="text-gray-500 text-xs mt-1">{item.estimatedDelivery}</Text>
                  </View>
                </View>

                {/* Package Details */}
                {item.fullData?.packageDetails?.packageName && (
                  <Text className="text-gray-700 font-medium mb-1">
                    {item.fullData.packageDetails.packageName}
                  </Text>
                )}
                
                {/* Route Info */}
                {item.fullData?.packageDetails && (
                  <View className="mb-3">
                    <Text className="text-gray-500 text-sm">
                      From: {item.fullData.packageDetails.pickupLocation}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      To: {item.fullData.packageDetails.dropoffLocation}
                    </Text>
                  </View>
                )}

                {/* Status Description */}
                <Text className="text-gray-600 text-sm mb-3">{item.description}</Text>

                {/* Progress Bar - Only for active orders */}
                {['accepted', 'collecting', 'in_transit'].includes(item.deliveryStatus) && (
                  <View className="mb-2">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-500">Progress</Text>
                      <Text className="text-xs text-gray-500">{item.progress}%</Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2">
                      <View 
                        className="rounded-full h-2"
                        style={{
                          width: `${item.progress}%`,
                          backgroundColor: getProgressColor(item.deliveryStatus)
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* Driver Info - Only if driver is assigned */}
                {item.fullData?.driver && (
                  <View className="bg-gray-50 rounded-lg p-3 mt-2">
                    <Text className="text-gray-600 text-sm font-medium">Driver Assigned</Text>
                    <Text className="text-gray-800 font-medium">{item.fullData.driver.fullName || item.fullData.driver.name}</Text>
                    <Text className="text-gray-500 text-sm">{item.fullData.driver.vehicleNumber || item.fullData.driver.vehicle} • {item.fullData.driver.phoneNumber || item.fullData.driver.phone}</Text>
                  </View>
                )}

                {/* Rating Section - Only for delivered orders */}
                {item.deliveryStatus === 'delivered' && (
                  <View className="mt-3 pt-3 border-t border-gray-200">
                    {item.isRated ? (
                      <View className="flex-row items-center justify-between">
                        <Text className="text-gray-600 text-sm">Your Rating:</Text>
                        <View className="flex-row items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FontAwesome
                              key={star}
                              name="star"
                              size={16}
                              color={star <= (item.customerRating || 0) ? "#F59E0B" : "#D1D5DB"}
                              style={{ marginHorizontal: 1 }}
                            />
                          ))}
                          <Text className="text-gray-600 text-sm ml-2">({item.customerRating}/5)</Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent triggering the order press
                          navigation.navigate('DeliveryComplete', {
                            orderData: item.fullData,
                            driver: item.fullData.driver
                          });
                        }}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-row items-center justify-between"
                      >
                        <View className="flex-1">
                          <Text className="text-yellow-800 font-medium text-sm">Rate Your Driver</Text>
                          <Text className="text-yellow-600 text-xs">Share your experience with the delivery</Text>
                        </View>
                        <View className="bg-yellow-500 rounded-full px-3 py-1">
                          <Text className="text-white text-xs font-medium">Rate</Text>
                        </View>
                      </TouchableOpacity>
                    )}
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
            onPress={() => handleTabPress(item.screen)}
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