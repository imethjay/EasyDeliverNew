import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';

const companies = [
  { label: 'Company A', value: 'companyA' },
  { label: 'Company B', value: 'companyB' },
  { label: 'Company C', value: 'companyC' },
];

const Register = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [company, setCompany] = useState(null);
  const [userType, setUserType] = useState('courier');
  const [agreed, setAgreed] = useState(false);
  const [licenseImage, setLicenseImage] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setLicenseImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white px-6 py-10">
      <Text className="text-2xl font-bold mb-1 text-black">Registering you as a</Text>
      <Text className="text-2xl font-bold mb-6 text-black">driver,</Text>

      <TextInput
        placeholder="Vehicle Number"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
        className="border border-gray-300 rounded-[20px] px-4 py-5 mb-4  bg-white"
      />

      <TextInput
        placeholder="Vehicle Type"
        value={vehicleType}
        onChangeText={setVehicleType}
        className="border border-gray-300 rounded-[20px] px-4 py-5 mb-4 bg-white"
      />

      <View className="flex-row mb-4">
        <TouchableOpacity
          onPress={() => setUserType('courier')}
          className={`flex-1 rounded-[20px] py-5 mr-2 ${userType === 'courier' ? 'bg-blue-800' : 'bg-white border border-gray-300'}`}>
          <Text className={`text-center ${userType === 'courier' ? 'text-white font-semibold' : 'text-black'}`}>Courier Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setUserType('individual')}
          className={`flex-1 rounded-[20px] py-5 ${userType === 'individual' ? 'bg-blue-800' : 'bg-white border border-gray-300'}`}>
          <Text className={`text-center ${userType === 'individual' ? 'text-white font-semibold' : 'text-black'}`}>Individual</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-4">
        <Dropdown
          data={companies}
          className = "py-5"
          labelField="label"
          valueField="value"
          placeholder="Select your company"
          value={company}
          onChange={item => setCompany(item.value)}
          style={{ height: 55, borderRadius: 20, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }}
          placeholderStyle={{ color: '#888' }}
          selectedTextStyle={{ color: '#000' }}
        />
      </View>

      <TouchableOpacity
        onPress={pickImage}
        className="border border-gray-300 rounded-[20px] py-6 mb-4 justify-center items-center">
        {licenseImage ? (
          <Image source={{ uri: licenseImage }} style={{ width: 80, height: 80, borderRadius: 10 }} />
        ) : (
          <>
            <Image
              source={require('../assets/icon/upload.png')}
              style={{ width: 40, height: 40, tintColor: 'gray' }}
              resizeMode="contain"
            />
            <Text className="text-gray-600 mt-2">Upload your driver's license here</Text>
          </>
        )}
      </TouchableOpacity>

      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => setAgreed(!agreed)} className="w-5 h-5 border border-gray-400 mr-2 justify-center items-center">
          {agreed && <View className="w-3 h-3 bg-blue-800 rounded-sm" />}
        </TouchableOpacity>
        <Text className="text-xs text-gray-500">
          By creating account you agree to our{' '}
          <Text className="text-red-400 font-semibold">Terms and conditions</Text>
        </Text>
      </View>

      <TouchableOpacity className="bg-blue-800 py-4 rounded-[20px]">
        <Text className="text-white text-center font-bold text-base">Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Register;
