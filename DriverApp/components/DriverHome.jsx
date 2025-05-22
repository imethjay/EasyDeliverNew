import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useWindowDimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const DriverHome = () => {
  const { width } = useWindowDimensions();
  const [trackingID, setTrackingID] = useState("");
  // const navigation = useNavigation();

  const clearSearch = () => {
    setTrackingID("");
  };

  const trackingHistory = [
    { id: "EX123456", item: "JBL Earbuds", from: "Panadura", to: "Colombo", status: "In Transit", image: require("../assets/icon/package.png") },
    { id: "EX789012", item: "Laptop", from: "Galle", to: "Kandy", status: "Delivered", image: require("../assets/icon/package.png") },
  ];

   const [activeTab, setActiveTab] = useState("Home"); // Default selected tab
  
    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];
  

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
          Good Morning Imeth!
        </Text>
        <Text
          className="text-white"
          style={{
            fontSize: wp("4%"),
            marginTop: hp("1%"),
          }}
        >
         
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
          <TouchableOpacity className="items-center" >
            {/* onPress={() => navigation.navigate("CreateDelivery")} */}
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
              {/* <Image
                source={require("../assets/icon/truck.png")}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              /> */}
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              {/* Create Delivery */}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center" >
            {/* onPress={() => navigation.navigate("History")} */}
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
              {/* <Image
                source={require("../assets/icon/history.png")}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              /> */}
            </View>
            <Text className="mt-2 text-base font-medium" style={{ fontSize: wp("4%") }}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>

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
