import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Switch } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

const Register = ({ navigation }) => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [selectedRole, setSelectedRole] = useState("Courier Service");
  const [company, setCompany] = useState("");
  const [licenseImage, setLicenseImage] = useState(null);
  const [agree, setAgree] = useState(false);

  // Function to pick an image
  const pickImage = () => {
    launchImageLibrary({ mediaType: "photo" }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setLicenseImage(response.assets[0].uri);
      }
    });
  };

  return (
    <View className="flex-1 bg-gray-100 px-6 py-8">
      <Text className="text-gray-700 text-lg font-semibold">Register</Text>

      <Text className="text-2xl font-bold mt-6 text-gray-900">
        Registering you as a driver,
      </Text>

      {/* Vehicle Number */}
      <TextInput
        className="mt-4 p-4 bg-white rounded-lg shadow-md text-gray-800"
        placeholder="Vehicle Number"
        placeholderTextColor="#A0A0A0"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
      />

      {/* Vehicle Type */}
      <TextInput
        className="mt-4 p-4 bg-white rounded-lg shadow-md text-gray-800"
        placeholder="Vehicle type"
        placeholderTextColor="#A0A0A0"
        value={vehicleType}
        onChangeText={setVehicleType}
      />

      {/* Role Selection */}
      <View className="flex-row justify-between mt-4 bg-white p-2 rounded-lg shadow-md">
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg ${
            selectedRole === "Courier Service" ? "bg-blue-600" : "bg-gray-200"
          }`}
          onPress={() => setSelectedRole("Courier Service")}
        >
          <Text
            className={`text-center font-semibold ${
              selectedRole === "Courier Service" ? "text-white" : "text-gray-700"
            }`}
          >
            Courier Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 rounded-lg ml-2 ${
            selectedRole === "Individual" ? "bg-blue-600" : "bg-gray-200"
          }`}
          onPress={() => setSelectedRole("Individual")}
        >
          <Text
            className={`text-center font-semibold ${
              selectedRole === "Individual" ? "text-white" : "text-gray-700"
            }`}
          >
            Individual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Company Selection */}
      <TextInput
        className="mt-4 p-4 bg-white rounded-lg shadow-md text-gray-800"
        placeholder="Select your company"
        placeholderTextColor="#A0A0A0"
        value={company}
        onChangeText={setCompany}
      />

      {/* Driver License Upload */}
      <TouchableOpacity
        className="mt-4 bg-white p-4 rounded-lg shadow-md flex-row items-center justify-center"
        onPress={pickImage}
      >
        {licenseImage ? (
          <Image source={{ uri: licenseImage }} className="w-14 h-14 rounded-md" />
        ) : (
          <Text className="text-gray-500">📷 Upload your driver's license</Text>
        )}
      </TouchableOpacity>

      {/* Terms & Conditions */}
      <View className="flex-row items-center mt-4">
        <Switch value={agree} onValueChange={setAgree} />
        <Text className="text-gray-600 ml-2 text-sm">
          By creating an account you agree to our{" "}
          <Text className="text-blue-500">Terms and conditions</Text>
        </Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        className={`mt-6 py-4 rounded-lg ${
          agree ? "bg-blue-600" : "bg-gray-400"
        } shadow-md`}
        disabled={!agree}
        onPress={() => navigation.navigate("NextScreen")}
      >
        <Text className="text-center text-white font-semibold text-lg">Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Register;
