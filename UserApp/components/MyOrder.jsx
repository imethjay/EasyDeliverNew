import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/init";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { getDeliveryStatusDisplay, formatScheduledTime, safeConvertToDate } from "../utils/helpers";
import ScheduledDeliveryService from "../utils/ScheduledDeliveryService";

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

  // Get current user UID and start scheduled delivery monitoring
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserUID(user.uid);
      // Start monitoring scheduled deliveries for automatic activation
      ScheduledDeliveryService.startMonitoring(user.uid);
    } else {
      console.log('No authenticated user found');
      setLoading(false);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (user) {
        ScheduledDeliveryService.stopMonitoring(user.uid);
      }
    };
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
          
          // Safely convert scheduled date/time
          const getScheduledDateTime = (data) => {
            return safeConvertToDate(data.scheduledDateTime || data.scheduledTimestamp);
          };

          const scheduledDateTime = getScheduledDateTime(data);
          
          // Use enhanced status display logic that handles scheduled deliveries
          const statusInfo = getDeliveryStatusDisplay(
            data.status, 
            data.deliveryStatus, 
            scheduledDateTime
          );

          // Map status colors to proper Tailwind CSS classes
          const getStatusColorClass = (color) => {
            switch (color) {
              case '#3B82F6': return 'text-blue-500';
              case '#F59E0B': return 'text-yellow-500';
              case '#10B981': return 'text-green-500';
              case '#059669': return 'text-green-600';
              case '#EF4444': return 'text-red-500';
              case '#6B7280': return 'text-gray-500';
              default: return 'text-gray-500';
            }
          };

          // Enhanced estimated delivery calculation for scheduled orders
          const getEstimatedDelivery = (status, deliveryStatus, createdAt, scheduledDateTime) => {
            // For scheduled deliveries
            if (status === 'scheduled' || deliveryStatus === 'scheduled') {
              if (scheduledDateTime) {
                try {
                  return formatScheduledTime(scheduledDateTime);
                } catch (error) {
                  console.warn('Error formatting scheduled time:', error);
                  return 'Scheduled delivery';
                }
              }
              return 'Scheduled delivery';
            }
            
            if (!createdAt) return 'Calculating...';
            
            try {
              const now = new Date();
              const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
              
              if (isNaN(created.getTime())) {
                return 'Calculating...';
              }
              
              switch (deliveryStatus) {
                case 'accepted':
                  const eta = new Date(created.getTime() + 90 * 60 * 1000);
                  return eta > now ? `ETA: ${eta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Updating...';
                case 'collecting':
                  const collectEta = new Date(now.getTime() + 60 * 60 * 1000);
                  return `ETA: ${collectEta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                case 'in_transit':
                  const transitEta = new Date(now.getTime() + 45 * 60 * 1000);
                  return `ETA: ${transitEta.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                case 'delivered':
                  return `Delivered at ${created.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                default:
                  return 'Pending assignment';
              }
            } catch (error) {
              console.warn('Error calculating estimated delivery:', error);
              return 'Calculating...';
            }
          };

          // Calculate progress for scheduled deliveries
          const getProgress = (status, deliveryStatus) => {
            if (status === 'scheduled' || deliveryStatus === 'scheduled') {
              return statusInfo.isReady ? 15 : 5; // 15% if ready, 5% if still scheduled
            }
            
            switch (deliveryStatus) {
              case 'accepted': return 25;
              case 'collecting': return 50;
              case 'in_transit': return 75;
              case 'delivered': return 100;
              case 'cancelled': return 0;
              default: return 10;
            }
          };

          // Safely get creation date for display
          const getCreationDate = (createdAt) => {
            return safeConvertToDate(createdAt);
          };

          const creationDate = getCreationDate(data.createdAt);

          ordersData.push({
            id: doc.id,
            trackingNumber: doc.id.substring(0, 10).toUpperCase(),
            status: statusInfo.text.includes('Scheduled') ? 'Scheduled' : 
                    statusInfo.text.includes('Delivered') ? 'Delivered' :
                    statusInfo.text.includes('Cancelled') ? 'Cancelled' : 'On Process',
            description: statusInfo.text,
            color: getStatusColorClass(statusInfo.color),
            progress: getProgress(data.status, data.deliveryStatus),
            estimatedDelivery: getEstimatedDelivery(data.status, data.deliveryStatus, data.createdAt, scheduledDateTime),
            deliveryStatus: data.deliveryStatus || 'pending',
            isRated: data.isRated || false,
            customerRating: data.customerRating || null,
            isScheduled: data.status === 'scheduled' || data.deliveryStatus === 'scheduled',
            scheduledDateTime: scheduledDateTime,
            creationDate: creationDate,
            deliveryPin: data.deliveryPin,
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

  const tabs = ["All", "Scheduled", "Pending", "Active", "Delivered"];

  // Filter orders based on selected tab and search text
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by tab
    if (selectedTab !== "All") {
      filtered = filtered.filter((order) => {
        if (selectedTab === "Active") {
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
    // Navigate to DeliveryDetails for all orders
    navigation.navigate('DeliveryDetails', {
      order: {
        ...order.fullData,
        trackingId: order.trackingNumber,
        item: order.fullData?.packageDetails?.packageName || 'Package',
        from: order.fullData?.packageDetails?.pickupLocation || 'Unknown',
        to: order.fullData?.packageDetails?.dropoffLocation || 'Unknown',
        status: order.description,
        deliveryStatus: order.deliveryStatus,
        rideRequestId: order.fullData.rideRequestId || order.id
      }
    });
  };

  const getOrderIcon = (status, deliveryStatus, isScheduled) => {
    // Handle scheduled deliveries first
    if (isScheduled || status === 'scheduled' || deliveryStatus === 'scheduled') {
      return '⏰'; // Clock icon for scheduled
    }
    
    switch (deliveryStatus) {
      case 'delivered':
        return '✅'; // Green checkmark
      case 'cancelled':
        return '❌'; // Red X
      case 'in_transit':
        return '🚚'; // Truck
      case 'collecting':
        return '📦'; // Package being collected
      case 'accepted':
        return '🚗'; // Car (driver assigned)
      default:
        return '🔍'; // Search (looking for driver)
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
      <View className="bg-[#133BB7] px-6 pt-12 pb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white font-bold text-xl">My Orders</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('CreateDelivery')}
            className="bg-white/20 rounded-full p-2"
          >
            <Text className="text-white text-lg">➕</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white rounded-2xl flex-row items-center px-4 py-2 shadow-sm">
          <Image
            source={require("../assets/icon/search.png")}
            style={{ width: 20, height: 20, tintColor: "#9CA3AF", marginRight: 12 }}
            resizeMode="contain"
          />
          <TextInput
            className="flex-1 h-10 text-gray-700"
            placeholder="Search by tracking ID or item name"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchText('')}
              className="ml-2 p-1"
            >
              <Image
                source={require("../assets/icon/close.png")}
                style={{ width: 18, height: 18, tintColor: "#9CA3AF" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="mt-2" style={{ height: 64 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingHorizontal: 16, 
            paddingVertical: 12,
            alignItems: 'center'
          }}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              className={`py-2 px-4 rounded-2xl ${
                selectedTab === tab ? "bg-[#133BB7]" : "bg-gray-100"
              } ${index !== tabs.length - 1 ? "mr-3" : ""}`}
              style={{
                height: 40,
                minWidth: 70,
                justifyContent: 'center',
                alignItems: 'center',
                ...(selectedTab === tab && {
                  shadowColor: "#133BB7",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                })
              }}
            >
              <Text
                className={`${
                  selectedTab === tab ? "text-white font-semibold" : "text-gray-700 font-medium"
                } text-sm`}
                numberOfLines={1}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Order Count */}
      <View className="px-4 py-2 bg-gray-50 mx-4 rounded-lg mt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-1">📋</Text>
            <Text className="text-gray-700 text-sm font-medium">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} found
            </Text>
          </View>
          {selectedTab !== "All" && (
            <TouchableOpacity 
              onPress={() => setSelectedTab("All")}
              className="bg-blue-100 px-3 py-1 rounded-full"
            >
              <Text className="text-blue-600 text-xs font-medium">View All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <View className="bg-gray-100 rounded-full p-6 mb-4">
            <Text className="text-gray-400 text-4xl">📦</Text>
          </View>
          <Text className="text-gray-700 text-lg font-medium mb-2">
            {searchText.trim() ? 'No matching orders' : 'No orders found'}
          </Text>
          <Text className="text-gray-500 text-center text-sm mb-6">
            {searchText.trim() 
              ? `No orders match "${searchText.trim()}"` 
              : selectedTab === "All" 
                ? 'You haven\'t placed any orders yet. Start by creating your first delivery!'
                : `No ${selectedTab.toLowerCase()} orders found`
            }
          </Text>
          <View className="flex-row space-x-3">
            {selectedTab !== "All" && (
              <TouchableOpacity 
                className="bg-[#133BB7] px-6 py-3 rounded-lg flex-row items-center"
                onPress={() => setSelectedTab("All")}
              >
                <Text className="text-white font-medium mr-1">View All Orders</Text>
                <Text className="text-white">📋</Text>
              </TouchableOpacity>
            )}
            {!searchText.trim() && selectedTab === "All" && (
              <TouchableOpacity 
                className="bg-green-500 px-6 py-3 rounded-lg flex-row items-center"
                onPress={() => navigation.navigate('CreateDelivery')}
              >
                <Text className="text-white font-medium mr-1">Create Delivery</Text>
                <Text className="text-white">➕</Text>
              </TouchableOpacity>
            )}
          </View>
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
              <View className={`mx-4 mt-4 rounded-xl shadow-sm p-4 border ${item.isScheduled ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                {/* Scheduled Delivery Banner */}
                {item.isScheduled && (
                  <View className="bg-blue-500 rounded-lg p-3 mb-3 flex-row items-center">
                    <FontAwesome name="clock-o" size={16} color="white" />
                    <Text className="text-white font-medium text-sm flex-1 ml-2">
                      Scheduled Delivery
                    </Text>
                    {item.deliveryPin && (
                      <View className="bg-white rounded px-2 py-1">
                        <Text className="text-blue-600 font-bold text-xs">PIN: {item.deliveryPin}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Header Row */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className={`rounded-full p-2 mr-3 ${item.isScheduled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Text className="text-lg">{getOrderIcon(item.status, item.deliveryStatus, item.isScheduled)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">
                        #{item.trackingNumber}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {item.creationDate && 
                          item.creationDate.toLocaleDateString()
                        }
                      </Text>
                    </View>
                  </View>
                  <View className="items-end flex-shrink-0" style={{ width: '45%' }}>
                    <Text className={`font-bold text-sm ${item.color} text-right`}>{item.status}</Text>
                    <Text className={`text-xs mt-1 ${item.isScheduled ? 'text-blue-600 font-medium' : 'text-gray-500'} text-right`} numberOfLines={3}>
                      {item.estimatedDelivery}
                    </Text>
                  </View>
                </View>

                {/* Package Details */}
                {item.fullData?.packageDetails?.packageName && (
                  <Text className="text-gray-700 font-medium mb-2">
                    📦 {item.fullData.packageDetails.packageName}
                  </Text>
                )}
                
                {/* Route Info */}
                {item.fullData?.packageDetails && (
                  <View className="mb-3 bg-gray-50 rounded-lg p-3">
                    <View className="flex-row items-center mb-1">
                      <Text className="text-gray-500 text-sm flex-1">
                        📍 From: {item.fullData.packageDetails.pickupLocation}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-gray-500 text-sm flex-1">
                        🎯 To: {item.fullData.packageDetails.dropoffLocation}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Status Description */}
                <Text className="text-gray-600 text-sm mb-3">{item.description}</Text>

                {/* Progress Bar - For all orders except cancelled */}
                {item.deliveryStatus !== 'cancelled' && (
                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-500">
                        {item.isScheduled ? 'Scheduling Progress' : 'Delivery Progress'}
                      </Text>
                      <Text className="text-xs text-gray-500">{item.progress}%</Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2">
                      <View 
                        className="rounded-full h-2"
                        style={{
                          width: `${item.progress}%`,
                          backgroundColor: item.isScheduled ? '#3B82F6' : getProgressColor(item.deliveryStatus)
                        }}
                      />
                    </View>
                  </View>
                )}

                {/* Scheduled Time Details - Only for scheduled deliveries */}
                {item.isScheduled && item.scheduledDateTime && (
                  <View className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        <FontAwesome name="calendar" size={14} color="#1E40AF" />
                        <Text className="text-blue-800 text-sm font-medium ml-2">Pickup Time:</Text>
                      </View>
                      {item.deliveryPin && (
                        <View className="bg-blue-600 rounded px-2 py-1">
                          <Text className="text-white text-xs font-bold">PIN: {item.deliveryPin}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-blue-700 font-semibold text-sm">
                      {(() => {
                        try {
                          const scheduleDate = item.scheduledDateTime;
                          if (!scheduleDate || isNaN(scheduleDate.getTime())) {
                            return 'Date not available';
                          }
                          
                          // Simple format for better readability
                          const today = new Date();
                          const isToday = scheduleDate.toDateString() === today.toDateString();
                          const tomorrow = new Date(today);
                          tomorrow.setDate(today.getDate() + 1);
                          const isTomorrow = scheduleDate.toDateString() === tomorrow.toDateString();
                          
                          if (isToday) {
                            return `Today at ${scheduleDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                          } else if (isTomorrow) {
                            return `Tomorrow at ${scheduleDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                          } else {
                            return scheduleDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                        } catch (error) {
                          console.warn('Error formatting scheduled date:', error);
                          return 'Date not available';
                        }
                      })()}
                    </Text>
                    {item.deliveryPin && (
                      <Text className="text-blue-600 text-xs mt-2">
                        💡 Share this PIN with the driver for package collection
                      </Text>
                    )}
                  </View>
                )}

                {/* Driver Info - Only if driver is assigned */}
                {item.fullData?.driver && (
                  <View className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <View className="flex-row items-center mb-2">
                      <FontAwesome name="user" size={14} color="#059669" />
                      <Text className="text-green-800 text-sm font-medium ml-2">Driver Assigned</Text>
                    </View>
                    <Text className="text-green-700 font-semibold">{item.fullData.driver.fullName || item.fullData.driver.name}</Text>
                    <Text className="text-green-600 text-sm">{item.fullData.driver.vehicleNumber || item.fullData.driver.vehicle} • {item.fullData.driver.phoneNumber || item.fullData.driver.phone}</Text>
                  </View>
                )}

                {/* Navigation Actions - Only for active orders with driver assigned */}
                {item.fullData?.driver && ['accepted', 'collecting', 'in_transit'].includes(item.deliveryStatus) && (
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <Text className="text-blue-800 text-sm font-medium mb-3 flex-row items-center">
                      <FontAwesome name="map" size={14} color="#1E40AF" />
                      <Text className="ml-2">Track Your Delivery</Text>
                    </Text>
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('LiveTrack', {
                            order: item.fullData
                          });
                        }}
                        className="flex-1 bg-blue-600 py-3 px-4 rounded-lg mr-2"
                      >
                        <View className="flex-row items-center justify-center">
                          <FontAwesome name="location-arrow" size={14} color="white" />
                          <Text className="text-white font-semibold text-sm ml-2">Live Track</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('DriverNavigation', {
                            driverLocation: item.fullData.currentDriverLocation,
                            pickupLocation: item.fullData.packageDetails?.pickupCoordinates,
                            dropoffLocation: item.fullData.packageDetails?.dropoffCoordinates,
                            deliveryStatus: item.deliveryStatus,
                            orderData: item.fullData
                          });
                        }}
                        className="flex-1 bg-green-600 py-3 px-4 rounded-lg"
                      >
                        <View className="flex-row items-center justify-center">
                          <FontAwesome name="route" size={14} color="white" />
                          <Text className="text-white font-semibold text-sm ml-2">Navigate</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Status-specific action buttons */}
                    <View className="mt-2 flex-row space-x-2">
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (item.fullData.driver?.phoneNumber) {
                            const { Linking } = require('react-native');
                            Linking.openURL(`tel:${item.fullData.driver.phoneNumber}`);
                          }
                        }}
                        className="flex-1 bg-gray-600 py-2 px-3 rounded-lg mr-1"
                      >
                        <View className="flex-row items-center justify-center">
                          <FontAwesome name="phone" size={12} color="white" />
                          <Text className="text-white font-medium text-xs ml-1">Call</Text>
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('ChatScreen', {
                            recipientId: item.fullData.driver?.uid,
                            recipientName: item.fullData.driver?.fullName || item.fullData.driver?.name,
                            orderId: item.fullData.rideRequestId || item.id
                          });
                        }}
                        className="flex-1 bg-gray-600 py-2 px-3 rounded-lg ml-1"
                      >
                        <View className="flex-row items-center justify-center">
                          <FontAwesome name="comment" size={12} color="white" />
                          <Text className="text-white font-medium text-xs ml-1">Chat</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    
                    {/* ETA and Status Info */}
                    <View className="mt-3 pt-2 border-t border-blue-200">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <FontAwesome name="clock-o" size={12} color="#1E40AF" />
                          <Text className="text-blue-700 text-xs ml-1">
                            {item.deliveryStatus === 'accepted' ? 'Driver heading to pickup' :
                             item.deliveryStatus === 'collecting' ? 'Collecting package' :
                             item.deliveryStatus === 'in_transit' ? 'On the way to delivery' : 'In progress'}
                          </Text>
                        </View>
                        <Text className="text-blue-600 text-xs font-medium">
                          {item.estimatedDelivery}
                        </Text>
                      </View>
                    </View>
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