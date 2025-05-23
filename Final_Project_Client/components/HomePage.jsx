import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { auth, db } from "../firebase/init";

const HomePage = () => {
  const { width } = useWindowDimensions();
  const [trackingID, setTrackingID] = useState("");
  const [currentShipment, setCurrentShipment] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUID, setUserUID] = useState(null);
  const navigation = useNavigation();

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

  // Real-time listener for active orders
  useEffect(() => {
    if (!userUID) return;

    console.log('Setting up real-time orders listener for homepage:', userUID);
    
    const ordersQuery = query(
      collection(db, 'rideRequests'),
      where('customerId', '==', userUID),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      try {
        const ordersData = [];
        let activeOrder = null;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const orderData = {
            id: doc.id,
            trackingId: doc.id.substring(0, 10).toUpperCase(),
            item: data.packageDetails?.packageName || 'Package',
            from: data.packageDetails?.pickupLocation || 'Unknown',
            to: data.packageDetails?.dropoffLocation || 'Unknown',
            status: getDeliveryStatusDisplay(data.deliveryStatus || 'pending'),
            deliveryStatus: data.deliveryStatus || 'pending',
            image: require("../assets/icon/package.png"),
            fullData: { ...data, rideRequestId: doc.id }
          };

          ordersData.push(orderData);

          // Set the first active order as current shipment
          if (!activeOrder && ['accepted', 'collecting', 'in_transit'].includes(data.deliveryStatus)) {
            activeOrder = orderData;
          }
        });

        setTrackingHistory(ordersData);
        setCurrentShipment(activeOrder);
        setLoading(false);
        console.log(`✅ Loaded ${ordersData.length} orders for homepage`);
      } catch (error) {
        console.error('❌ Error processing orders:', error);
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Error listening to orders:', error);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up homepage orders listener');
      unsubscribe();
    };
  }, [userUID]);

  // Get delivery status display information
  const getDeliveryStatusDisplay = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'accepted':
        return 'Driver Assigned - Coming to pickup';
      case 'collecting':
        return 'Driver collecting package';
      case 'in_transit':
        return 'Package in transit';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Searching for driver';
    }
  };

  // Get status color based on delivery status
  const getStatusColor = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'accepted':
        return 'text-blue-600';
      case 'collecting':
        return 'text-orange-600';
      case 'in_transit':
        return 'text-green-600';
      case 'delivered':
        return 'text-green-700';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const clearSearch = () => {
    setTrackingID("");
  };

  const [activeTab, setActiveTab] = useState("Home"); // Default selected tab
  
  const menuItems = [
    { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
    { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "MyOrder" },
    { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "ChatList" },
    { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Profile" },
  ];

  // Navigation handler for bottom tabs
  const handleTabPress = (screenName) => {
    setActiveTab(screenName);
    if (screenName !== "Home") {
      navigation.navigate(screenName);
    }
  };

  // Handle tracking history item press
  const handleTrackingItemPress = (item) => {
    if (['accepted', 'collecting', 'in_transit'].includes(item.deliveryStatus)) {
      // Navigate to RiderConfirmed for active orders
      navigation.navigate('RiderConfirmed', {
        packageDetails: item.fullData.packageDetails,
        courierDetails: item.fullData.courierDetails,
        rideDetails: item.fullData.rideDetails,
        distance: item.fullData.distance,
        duration: item.fullData.duration,
        driver: item.fullData.driver,
        rideRequestId: item.fullData.rideRequestId
      });
    } else {
      // Navigate to OrderPreview for completed orders
      navigation.navigate('TrackingDetails', { order: item.fullData });
    }
  };
  

  return (
    <View className="flex-1 w-full bg-gray-100">
      {/* Header Section */}
      <View
        className="rounded-b-3xl px-6"
        style={{
          backgroundColor: "#1E40AF",
          paddingBottom: hp("5%"),
        }}
      >
        <Text
          className="text-white font-bold"
          style={{
            fontSize: width < 400 ? wp("6%") : wp("5%"),
            marginTop: hp("5%"),
          }}
        >
          Let's track your package.
        </Text>
        <Text
          className="text-white"
          style={{
            fontSize: wp("4%"),
            marginTop: hp("1%"),
          }}
        >
          Please enter your tracking number
        </Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-full px-4 py-2 mt-4">
          <Image
            source={require("../assets/icon/search.png")}
            style={{ width: 25, height: 25, tintColor: "gray" }}
            resizeMode="contain"
          />
          <TextInput
            placeholder="Enter Tracking ID"
            className="flex-1 text-base outline-none"
            style={{ fontSize: wp("4%") }}
            value={trackingID}
            onChangeText={setTrackingID}
          />
        
            <TouchableOpacity onPress={clearSearch} className="p-2">
              <Image source={require("../assets/icon/close.png")} style={{ width: 25, height: 25, tintColor: "gray" }} resizeMode="contain" />
            </TouchableOpacity>
         
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: hp("10%") }}>
        {/* Action Buttons */}
        <View className="flex-row justify-around mt-6">
          <TouchableOpacity 
            className="items-center" 
            onPress={() => navigation.navigate("CreateDelivery")}
          >
            <View
              className="p-4"
              style={{
                backgroundColor: "#1e40af",
                borderRadius: wp("50%"),
                width: wp("16%"),
                height: wp("16%"),
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/icon/truck.png")}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              Create Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="items-center" 
            onPress={() => navigation.navigate("MyOrder")}
          >
            <View
              className="p-4"
              style={{
                backgroundColor: "#1e40af",
                borderRadius: wp("50%"),
                width: wp("16%"),
                height: wp("16%"),
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../assets/icon/history.png")}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              My Orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Shipment Section */}
        <View className="px-6 mt-8">
          <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>
            Current Shipment
          </Text>
          {loading ? (
            <View className="bg-white rounded-xl p-4 shadow-sm justify-center items-center" style={{ height: 120 }}>
              <ActivityIndicator size="large" color="#1E40AF" />
              <Text className="text-gray-500 mt-2">Loading your orders...</Text>
            </View>
          ) : currentShipment ? (
            <TouchableOpacity 
              className="bg-white rounded-xl p-4 shadow-sm"
              onPress={() => handleTrackingItemPress(currentShipment)}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className="bg-gray-200 rounded-full"
                  style={{
                    width: wp("14%"),
                    height: wp("14%"),
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={require("../assets/icon/package.png")}
                    style={{ width: 35, height: 35 }}
                    resizeMode="contain"
                  />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-base" style={{ fontSize: wp("4%") }}>
                    {currentShipment.item}
                  </Text>
                  <Text className="text-gray-500 text-sm" style={{ fontSize: wp("3.5%") }}>
                    #Tracking ID: {currentShipment.trackingId}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600" style={{ fontSize: wp("3.8%") }}>
                <Text className="font-semibold">From: </Text>{currentShipment.from}
              </Text>
              <Text className="text-gray-600 mb-2" style={{ fontSize: wp("3.8%") }}>
                <Text className="font-semibold">To: </Text>{currentShipment.to}
              </Text>
              <Text className={`font-medium ${getStatusColor(currentShipment.deliveryStatus)}`} style={{ fontSize: wp("4%") }}>
                Status: {currentShipment.status}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-white rounded-xl p-4 shadow-sm justify-center items-center" style={{ height: 120 }}>
              <Text className="text-gray-500 text-center" style={{ fontSize: wp("4%") }}>
                No active deliveries
              </Text>
              <Text className="text-gray-400 text-center mt-2" style={{ fontSize: wp("3.5%") }}>
                Create a new delivery to get started
              </Text>
            </View>
          )}
        </View>

        {/* Recent Orders Section */}
        <View className="px-6 mt-8">
          <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>Recent Orders</Text>
          {trackingHistory.slice(0, 3).map((item, index) => (
            <TouchableOpacity 
              key={index} 
              className="bg-white rounded-xl p-4 shadow-sm mb-4 flex-row items-center"
              onPress={() => handleTrackingItemPress(item)}
            >
              <Image source={item.image} style={{ width: 25, height: 25, marginRight: 10 }} resizeMode="contain" />
              <View className="flex-1">
                <Text className="font-semibold text-base" style={{ fontSize: wp("4%") }}>{item.item}</Text>
                <Text className="text-gray-500 text-sm" style={{ fontSize: wp("3.5%") }}>#Tracking ID: {item.trackingId}</Text>
                <Text className={`text-sm mt-1 ${getStatusColor(item.deliveryStatus)}`} style={{ fontSize: wp("3.5%") }}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {trackingHistory.length > 3 && (
            <TouchableOpacity 
              className="bg-blue-50 rounded-xl p-4 justify-center items-center"
              onPress={() => navigation.navigate("MyOrder")}
            >
              <Text className="text-blue-600 font-medium" style={{ fontSize: wp("4%") }}>
                View All Orders ({trackingHistory.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

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

export default HomePage;