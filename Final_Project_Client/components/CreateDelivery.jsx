import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// Google Maps API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE';

const CreateDelivery = () => {
  const [shipmentType, setShipmentType] = useState("Parcel");
  const [packageQuantity, setPackageQuantity] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState("Now");
  const navigation = useNavigation();

  // Function to handle navigation based on delivery option
  const handleConfirm = () => {
    setModalVisible(false);
    
    // Navigate to the appropriate screen based on selection
    if (deliveryOption === "Now") {
      navigation.navigate("CourierSelection");
    } else {
      navigation.navigate("TimePicker");
    }
  };

  return (
    <ScrollView className="flex-1 w-full bg-white px-6 py-6">
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
          <GooglePlacesAutocomplete
            placeholder="Pickup Location"
            onPress={(data, details = null) => {
              // 'details' is provided when fetchDetails = true
              console.log(data, details);
            }}
            query={{
              key: 'AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE',
              language: 'en',
            }}
            styles={{
              textInput: {
                backgroundColor: 'transparent',
                paddingLeft: 10,
                height: 50,
                color: '#4B5563',
              },
              textInputContainer: {
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                borderBottomWidth: 0,
                paddingHorizontal: 10,
              },
              listView: {
                backgroundColor: 'white',
                marginTop: 10,
                borderRadius: 10,
                elevation: 3,
                position: 'absolute',
                width: '100%',
                zIndex: 1000,
                top: 50,
              },
              row: {
                padding: 15,
                height: 58,
                flexDirection: 'row',
                alignItems: 'center',
              },
              separator: {
                height: 0.5,
                backgroundColor: '#c8c7cc',
              },
              description: {
                color: '#4B5563',
              },
              poweredContainer: {
                display: 'none',
              },
            }}
            fetchDetails={true}
            enablePoweredByContainer={false}
            renderLeftButton={() => (
              <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                <Ionicons name="location-outline" size={20} color="gray" />
              </View>
            )}
            renderRightButton={() => (
              <TouchableOpacity style={{ justifyContent: 'center', marginRight: 8 }}>
                <Ionicons name="add-circle-outline" size={20} color="gray" />
              </TouchableOpacity>
            )}
          />
        </View>
        
        <View className="bg-gray-100 rounded-2xl overflow-hidden mt-3">
          <GooglePlacesAutocomplete
            placeholder="Package Destination"
            onPress={(data, details = null) => {
              // 'details' is provided when fetchDetails = true
              console.log(data, details);
            }}
            query={{
              key: 'AIzaSyDk4aXK5khZC808S32KRlGir6k0H2RTqsE',
              language: 'en',
            }}
            styles={{
              textInput: {
                backgroundColor: 'transparent',
                paddingLeft: 10,
                height: 50,
                color: '#4B5563',
              },
              textInputContainer: {
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                borderBottomWidth: 0,
                paddingHorizontal: 10,
              },
              listView: {
                backgroundColor: 'white',
                marginTop: 10,
                borderRadius: 10,
                elevation: 3,
                position: 'absolute',
                width: '100%',
                zIndex: 1000,
                top: 50,
              },
              row: {
                padding: 15,
                height: 58,
                flexDirection: 'row',
                alignItems: 'center',
              },
              separator: {
                height: 0.5,
                backgroundColor: '#c8c7cc',
              },
              description: {
                color: '#4B5563',
              },
              poweredContainer: {
                display: 'none',
              },
            }}
            fetchDetails={true}
            enablePoweredByContainer={false}
            renderLeftButton={() => (
              <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                <Ionicons name="location-outline" size={20} color="gray" />
              </View>
            )}
            renderRightButton={() => (
              <TouchableOpacity style={{ justifyContent: 'center', marginRight: 8 }}>
                <Ionicons name="add-circle-outline" size={20} color="gray" />
              </TouchableOpacity>
            )}
          />
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
        <TextInput className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" placeholder="Weight CM" />
        <TextInput className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" placeholder="Length CM" />
        <TextInput className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" placeholder="Width CM" />
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
        <TextInput className="flex-1 bg-gray-100 px-4 py-3 rounded-2xl text-gray-800" placeholder="Height" />
      </View>

      {/* Name Your Package */}
      <TextInput
        className="bg-gray-100 px-4 py-3 rounded-2xl text-gray-800 mb-6"
        placeholder="Name your package"
      />

      {/* Next Button */}
      <TouchableOpacity
        className="bg-[#133BB7] rounded-[20px] py-3 shadow-md"
        onPress={() => setModalVisible(true)}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    paddingTop: 50,
    backgroundColor: '#ecf0f1',
  },
  autocompleteContainer: {
    flex: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
});

export default CreateDelivery;