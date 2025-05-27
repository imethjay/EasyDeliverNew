import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { generateUniqueId } from "../utils/helpers"; // Import helper function for ID generation

// Google Maps API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE';

const CreateDelivery = () => {
  const [shipmentType, setShipmentType] = useState("Parcel");
  const [packageQuantity, setPackageQuantity] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState("Now");
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const navigation = useNavigation();

  // Fetch suggestions from Google Places API
  const fetchSuggestions = async (text, setterFunction) => {
    if (text.length > 2) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_PLACES_API_KEY}`
        );
        const data = await response.json();
        if (data.predictions) {
          setterFunction(data.predictions);
        }
      } catch (error) {
        console.error("Error fetching place suggestions:", error);
      }
    } else {
      setterFunction([]);
    }
  };

  // Handle pickup location change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(pickupLocation, setPickupSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [pickupLocation]);

  // Handle dropoff location change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(dropoffLocation, setDropoffSuggestions);
    }, 300);
    return () => clearTimeout(timer);
  }, [dropoffLocation]);

  // Function to handle navigation based on delivery option
  const handleConfirm = () => {
    setModalVisible(false);
    
    // Create package details object
    const packageDetails = {
      packageName: packageName || 'Unnamed Package',
      trackingId: generateUniqueId(),
      pickupLocation: pickupLocation,
      dropoffLocation: dropoffLocation,
      shipmentType: shipmentType,
      weight: weight,
      length: length,
      width: width,
      height: height,
      quantity: packageQuantity,
      deliveryOption: deliveryOption
    };
    
    // Navigate to the appropriate screen based on selection
    if (deliveryOption === "Now") {
      navigation.navigate("CourierSelection", { packageDetails });
    } else {
      navigation.navigate("TimePicker", { packageDetails });
    }
  };

  const handlePickupSuggestionSelect = (suggestion) => {
    setPickupLocation(suggestion.description);
    setShowPickupSuggestions(false);
  };

  const handleDropoffSuggestionSelect = (suggestion) => {
    setDropoffLocation(suggestion.description);
    setShowDropoffSuggestions(false);
  };

  // Dismiss keyboard and suggestions when tapping outside
  const dismissAll = () => {
    Keyboard.dismiss();
    setShowPickupSuggestions(false);
    setShowDropoffSuggestions(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={dismissAll}>
          <ScrollView className="flex-1 w-full bg-white px-6 py-6" keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity 
                className="rounded-full p-2 border-2 border-gray-200"
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="black" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold flex-1 text-center">
                Create Delivery
              </Text>
            </View>

            {/* Pickup & Drop-off Fields */}
            <View className="mb-4">
              <View className="bg-gray-100 rounded-2xl overflow-hidden">
                <View className="flex-row items-center">
                  <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                    <Ionicons name="location-outline" size={20} color="gray" />
                  </View>
                  <TextInput
                    className="flex-1 bg-transparent px-3 py-3 text-gray-800"
                    placeholder="Pickup Location"
                    value={pickupLocation}
                    onChangeText={(text) => {
                      setPickupLocation(text);
                      setShowPickupSuggestions(true);
                    }}
                    onFocus={() => setShowPickupSuggestions(true)}
                  />
                  <TouchableOpacity style={{ justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons name="add-circle-outline" size={20} color="gray" />
                  </TouchableOpacity>
                </View>
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView 
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 200 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {pickupSuggestions.map((item) => (
                        <TouchableOpacity 
                          key={item.place_id}
                          className="px-4 py-3 border-b border-gray-100"
                          onPress={() => handlePickupSuggestionSelect(item)}
                        >
                          <Text className="text-gray-800">{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              <View className="bg-gray-100 rounded-2xl overflow-hidden mt-3">
                <View className="flex-row items-center">
                  <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                    <Ionicons name="location-outline" size={20} color="gray" />
                  </View>
                  <TextInput
                    className="flex-1 bg-transparent px-3 py-3 text-gray-800"
                    placeholder="Package Destination"
                    value={dropoffLocation}
                    onChangeText={(text) => {
                      setDropoffLocation(text);
                      setShowDropoffSuggestions(true);
                    }}
                    onFocus={() => setShowDropoffSuggestions(true)}
                  />
                  <TouchableOpacity style={{ justifyContent: 'center', marginRight: 8 }}>
                    <Ionicons name="add-circle-outline" size={20} color="gray" />
                  </TouchableOpacity>
                </View>
                {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView 
                      nestedScrollEnabled={true}
                      style={{ maxHeight: 200 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {dropoffSuggestions.map((item) => (
                        <TouchableOpacity 
                          key={item.place_id}
                          className="px-4 py-3 border-b border-gray-100"
                          onPress={() => handleDropoffSuggestionSelect(item)}
                        >
                          <Text className="text-gray-800">{item.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Shipment Type */}
            <Text className="text-sm font-semibold mb-3">Shipment Type</Text>
            <View className="flex-row space-x-4 w-full gap-4 mb-4">
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-[20px] ${
                  shipmentType === "Envelope"
                    ? "bg-[#133BB7]"
                    : "bg-gray-100 border border-gray-300"
                }`}
                onPress={() => setShipmentType("Envelope")}
              >
                <Ionicons name="mail-outline" size={18} color={shipmentType === "Envelope" ? "white" : "gray"} />
                <Text className={`ml-2 ${shipmentType === "Envelope" ? "text-white" : "text-gray-600"}`}>
                  Envelope
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-[20px] ${
                  shipmentType === "Parcel"
                    ? "bg-[#133BB7]"
                    : "bg-gray-100 border border-gray-300"
                }`}
                onPress={() => setShipmentType("Parcel")}
              >
                <Ionicons name="cube-outline" size={18} color={shipmentType === "Parcel" ? "white" : "gray"} />
                <Text className={`ml-2 ${shipmentType === "Parcel" ? "text-white" : "text-gray-600"}`}>
                  Parcel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Package Dimensions */}
            <View className="flex-row gap-3 space-x-3 mb-3">
              <TextInput 
                className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" 
                placeholder="Weight KG" 
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
              <TextInput 
                className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" 
                placeholder="Length CM" 
                value={length}
                onChangeText={setLength}
                keyboardType="numeric"
              />
              <TextInput 
                className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" 
                placeholder="Width CM" 
                value={width}
                onChangeText={setWidth}
                keyboardType="numeric"
              />
            </View>

            {/* Package Quantity & Height */}
            <View className="flex-row space-x-3 gap-3 mb-3">
              <View className="flex-1 flex-row items-center bg-gray-100 px-4 py-3 rounded-2xl">
                <TouchableOpacity onPress={() => setPackageQuantity((prev) => Math.max(prev - 1, 1))}>
                  <Ionicons name="remove-circle-outline" size={24} color="gray" />
                </TouchableOpacity>
                <Text className="mx-4 text-gray-800">{packageQuantity}</Text>
                <TouchableOpacity onPress={() => setPackageQuantity((prev) => prev + 1)}>
                  <Ionicons name="add-circle-outline" size={24} color="gray" />
                </TouchableOpacity>
              </View>
              <TextInput 
                className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" 
                placeholder="Height CM" 
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            </View>

            {/* Name Your Package */}
            <TextInput
              className="bg-gray-100 px-4 py-3 rounded-2xl text-gray-800 mb-6"
              placeholder="Name your package"
              value={packageName}
              onChangeText={setPackageName}
            />

            {/* Next Button */}
            <TouchableOpacity
              className="bg-[#133BB7] rounded-[20px] py-3 shadow-md"
              onPress={() => {
                if (!pickupLocation || !dropoffLocation) {
                  alert('Please enter pickup and destination locations');
                  return;
                }
                setModalVisible(true);
              }}
            >
              <Text className="text-center text-white font-bold text-lg">Next</Text>
            </TouchableOpacity>

            {/* Modal for Delivery Scheduling */}
            <Modal
              animationType="slide"
              transparent={true}
              visible={modalVisible}
              onRequestClose={() => setModalVisible(false)}
            >
              <View className="flex-1 justify-end bg-black bg-opacity-50">
                <View className="bg-white p-6 rounded-t-2xl">
                  <Text className="text-lg font-bold mb-4">When do you need a delivery?</Text>
                  
                  {/* Delivery Options */}
                  <TouchableOpacity
                    className="flex-row items-center py-3 border-b border-gray-200"
                    onPress={() => setDeliveryOption("Now")}
                  >
                    <Ionicons name="radio-button-on" size={20} color={deliveryOption === "Now" ? "#133BB7" : "gray"} />
                    <Text className="ml-4 text-gray-800 text-lg">Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center py-3"
                    onPress={() => setDeliveryOption("Schedule for later")}
                  >
                    <Ionicons name="radio-button-on" size={20} color={deliveryOption === "Schedule for later" ? "#133BB7" : "gray"} />
                    <Text className="ml-4 text-gray-800 text-lg">Schedule for later</Text>
                  </TouchableOpacity>

                  {/* Confirm Button */}
                  <TouchableOpacity
                    className="mt-6 bg-[#133BB7] py-3 rounded-2xl"
                    onPress={handleConfirm}
                  >
                    <Text className="text-center text-white font-bold text-lg">Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 50,
    backgroundColor: '#ecf0f1',
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
});

export default CreateDelivery;