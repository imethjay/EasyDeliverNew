import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { auth, db } from '../firebase/init';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import DeliveryRequestModal from "./DeliveryRequestModal";

const DriverHome = () => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [trackingID, setTrackingID] = useState("");
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [rideRequestsListener, setRideRequestsListener] = useState(null);

  useEffect(() => {
    fetchDriverData();
    return () => {
      // Clean up listeners when component unmounts
      if (rideRequestsListener) {
        rideRequestsListener();
      }
    };
  }, []);

  // Toggle driver availability and listen for ride requests
  useEffect(() => {
    if (!driver) return;

    const updateDriverStatus = async () => {
      try {
        const driverRef = doc(db, 'drivers', driver.id);
        await updateDoc(driverRef, {
          isOnline,
          isAvailable: isOnline,
          lastUpdated: serverTimestamp()
        });
        
        // Set up or remove the ride requests listener based on driver status
        if (isOnline) {
          setupRideRequestsListener();
        } else if (rideRequestsListener) {
          rideRequestsListener();
          setRideRequestsListener(null);
        }
      } catch (error) {
        console.error('Error updating driver status:', error);
        Alert.alert('Error', 'Failed to update your availability status');
      }
    };

    updateDriverStatus();
  }, [isOnline, driver]);

  // Set up a listener for new ride requests
  const setupRideRequestsListener = () => {
    if (!driver) return;

    // Query for ride requests matching this driver's criteria
    const q = query(
      collection(db, 'rideRequests'),
      where('status', '==', 'searching'),
      where('courierDetails.id', '==', driver.courierId),
      where('rideDetails.vehicleType', '==', driver.vehicleType)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      querySnapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const requestData = {
            id: change.doc.id,
            ...change.doc.data()
          };
          
          // Show the delivery request modal
          setIncomingRequest(requestData);
          setShowRequestModal(true);
        }
      });
    }, (error) => {
      console.error('Error setting up ride requests listener:', error);
    });

    setRideRequestsListener(unsubscribe);
  };

  const fetchDriverData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      if (!user) {
        // No user is signed in
        navigation.navigate('Login');
        return;
      }

      // Query Firestore for driver data
      const driversRef = collection(db, 'drivers');
      const q = query(driversRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No driver record found');
        setDriver(null);
      } else {
        const driverData = querySnapshot.docs[0].data();
        setDriver({
          id: querySnapshot.docs[0].id,
          ...driverData
        });
        
        // Set online status based on stored value
        setIsOnline(driverData.isOnline || false);
        
        // For demo, creating sample tracking history
        setTrackingHistory([
          { id: "EX123456", item: "JBL Earbuds", from: "Panadura", to: "Colombo", status: "In Transit", image: require("../assets/icon/package.png") },
          { id: "EX789012", item: "Laptop", from: "Galle", to: "Kandy", status: "Delivered", image: require("../assets/icon/package.png") },
        ]);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
      Alert.alert('Error', 'Failed to load your profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const clearSearch = () => {
    setTrackingID("");
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      // Update the ride request status
      const requestRef = doc(db, 'rideRequests', incomingRequest.id);
      await updateDoc(requestRef, {
        status: 'accepted',
        driverId: driver.id,
        driverName: driver.fullName,
        driverPhone: driver.phoneNumber || '',
        vehicleNumber: driver.vehicleNumber,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update driver availability
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        isAvailable: false,
        currentRideId: incomingRequest.id,
        updatedAt: serverTimestamp()
      });
      
      // Navigate to the delivery details screen
      navigation.navigate('OrderPreview', { rideRequest: incomingRequest });
      
      // Close the modal
      setShowRequestModal(false);
      setIncomingRequest(null);
    } catch (error) {
      console.error('Error accepting ride request:', error);
      Alert.alert('Error', 'Failed to accept the delivery request');
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    
    try {
      // Update the ride request with decline info
      const requestRef = doc(db, 'rideRequests', incomingRequest.id);
      await updateDoc(requestRef, {
        declinedDrivers: [
          ...(incomingRequest.declinedDrivers || []),
          {
            driverId: driver.id,
            declinedAt: serverTimestamp()
          }
        ],
        updatedAt: serverTimestamp()
      });
      
      // Close the modal
      setShowRequestModal(false);
      setIncomingRequest(null);
    } catch (error) {
      console.error('Error declining ride request:', error);
    }
  };

  const [activeTab, setActiveTab] = useState("Home"); // Default selected tab
  
  const menuItems = [
    { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
    { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
    { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
    { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
  ];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text className="mt-4 text-gray-600">Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 w-full bg-gray-100">
      {/* Delivery Request Modal */}
      <DeliveryRequestModal 
        visible={showRequestModal}
        rideRequest={incomingRequest}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />
      
      {/* Header Section */}
      <View
        className="rounded-b-3xl px-6"
        style={{
          backgroundColor: "#1E40AF",
          paddingBottom: hp("5%"),
        }}
      >
        <View className="flex-row justify-between items-center" style={{ marginTop: hp("5%") }}>
          <View>
            <Text
              className="text-white font-bold"
              style={{
                fontSize: width < 400 ? wp("6%") : wp("5%"),
              }}
            >
              {driver ? `Hello, ${driver.fullName.split(' ')[0]}!` : 'Welcome!'}
            </Text>
            <Text
              className="text-white"
              style={{
                fontSize: wp("4%"),
                marginTop: hp("1%"),
              }}
            >
              {driver && driver.status === 'pending' 
                ? '⏳ Account pending approval' 
                : driver && driver.status === 'approved'
                ? '✅ Account approved' 
                : driver && driver.status === 'suspended'
                ? '⚠️ Account suspended'
                : ''}
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white font-bold">Logout</Text>
          </TouchableOpacity>
        </View>

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
        {/* Online Status Toggle */}
        {driver && driver.status === 'approved' && (
          <View className="mx-6 mt-6 bg-white rounded-xl p-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-lg font-semibold">Available for Deliveries</Text>
                <Text className="text-gray-500">
                  {isOnline ? 'You are online and can receive delivery requests' : 'Go online to receive delivery requests'}
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#4ade80" }}
                thumbColor={isOnline ? "#ffffff" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setIsOnline}
                value={isOnline}
              />
            </View>
          </View>
        )}
        
        {/* Driver Info Card */}
        {driver && (
          <View className="px-6 mt-4">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2">Driver Information</Text>
              <View className="flex-row items-center mb-2">
                <Text className="font-medium w-24">Vehicle:</Text>
                <Text>{driver.vehicleType} ({driver.vehicleNumber})</Text>
              </View>
              {driver.courierName && (
                <View className="flex-row items-center mb-2">
                  <Text className="font-medium w-24">Company:</Text>
                  <Text>{driver.courierName}</Text>
                </View>
              )}
              <View className="flex-row items-center">
                <Text className="font-medium w-24">Status:</Text>
                <View className={`px-2 py-1 rounded-full ${
                  driver.status === 'approved' ? 'bg-green-100' : 
                  driver.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <Text className={`${
                    driver.status === 'approved' ? 'text-green-800' : 
                    driver.status === 'pending' ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {driver.status === 'approved' ? 'Approved' : 
                     driver.status === 'pending' ? 'Pending Approval' : 'Suspended'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row justify-around mt-6">
          <TouchableOpacity className="items-center">
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
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center">
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
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>

        {/* Only show if driver is approved */}
        {driver && driver.status === 'approved' && (
          <>
            {/* Current Shipment Section */}
            <View className="px-6 mt-8">
              <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>
                Current Shipment
              </Text>
              <View className="bg-white rounded-xl p-4 shadow-sm">
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
                  <View className="ml-4">
                    <Text className="font-semibold text-base" style={{ fontSize: wp("4%") }}>
                      JBL Earbuds
                    </Text>
                    <Text className="text-gray-500 text-sm" style={{ fontSize: wp("3.5%") }}>
                      #Tracking ID: EX123456
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600" style={{ fontSize: wp("3.8%") }}>
                  <Text className="font-semibold">From: </Text>20/6, Panadura
                </Text>
                <Text className="text-gray-600 mb-2" style={{ fontSize: wp("3.8%") }}>
                  <Text className="font-semibold">Shipping to: </Text>20/6, Panadura
                </Text>
                <Text className="text-blue-600 font-medium" style={{ fontSize: wp("4%") }}>
                  Status: Your Package is in transit
                </Text>
              </View>
            </View>

            {/* Tracking History */}
            <View className="px-6 mt-8">
              <Text className="text-lg font-semibold mb-4" style={{ fontSize: wp("4.5%") }}>Tracking History</Text>
              {trackingHistory.map((item, index) => (
                <TouchableOpacity key={index} className="bg-white rounded-xl p-4 shadow-sm mb-4 flex-row items-center">
                  <Image source={item.image} style={{ width: 25, height: 25, marginRight: 10 }} resizeMode="contain" />
                  <View>
                    <Text className="font-semibold text-base">{item.item}</Text>
                    <Text className="text-gray-500 text-sm">#Tracking ID: {item.id}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        
        {/* Message for pending or suspended drivers */}
        {driver && driver.status === 'pending' && (
          <View className="px-6 mt-8">
            <View className="bg-yellow-50 rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2 text-yellow-800">Account Pending Approval</Text>
              <Text className="text-yellow-700">
                Your account is currently under review. You'll be able to accept deliveries once your account is approved.
                This typically takes 1-2 business days.
              </Text>
            </View>
          </View>
        )}
        
        {driver && driver.status === 'suspended' && (
          <View className="px-6 mt-8">
            <View className="bg-red-50 rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-2 text-red-800">Account Suspended</Text>
              <Text className="text-red-700">
                Your account has been suspended. Please contact customer support or your courier company for more information.
              </Text>
            </View>
          </View>
        )}
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

export default DriverHome;
