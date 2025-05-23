import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';

const { width } = Dimensions.get('window');

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  // Focus states for inputs
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [zipCodeFocused, setZipCodeFocused] = useState(false);
  
  const { signup } = useAuth();

  const handleSignup = async () => {
    try {
      // Validate required fields
      if (!email || !password || !name || !mobile || !address || !city || !zipCode) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const userProfile = {
        name,
        mobile,
        address,
        city,
        zipCode,
        email
      };

      await signup(email, password, userProfile);
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Background with subtle gradient */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        className="flex-1 px-6 pt-12"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        <View className="mb-6">
          <View className="mb-3">
            <Text className="text-3xl font-bold text-gray-900 font-poppins">
              Create
            </Text>
            <Text className="text-3xl font-bold text-blue-600 font-poppins">
              Account
            </Text>
          </View>
          <Text className="text-base text-gray-600 font-poppins leading-relaxed">
            Join us and start your delivery journey
          </Text>
        </View>

        {/* Form Container */}
        <View className="bg-white rounded-3xl px-6 py-6 shadow-lg shadow-gray-200 mb-6">
          
          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Full Name</Text>
            <View className={`relative border-2 rounded-2xl ${nameFocused || name ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
              <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={nameFocused || name ? '#3b82f6' : '#9ca3af'} 
                />
              </View>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                className="w-full px-12 py-4 text-base text-gray-800 font-poppins"
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Email Address</Text>
            <View className={`relative border-2 rounded-2xl ${emailFocused || email ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
              <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={emailFocused || email ? '#3b82f6' : '#9ca3af'} 
                />
              </View>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                className="w-full px-12 py-4 text-base text-gray-800 font-poppins"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Password</Text>
            <View className={`relative border-2 rounded-2xl ${passwordFocused || password ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
              <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={passwordFocused || password ? '#3b82f6' : '#9ca3af'} 
                />
              </View>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!isPasswordVisible}
                className="w-full px-12 py-4 text-base text-gray-800 font-poppins pr-14"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mobile Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Mobile Number</Text>
            <View className={`relative border-2 rounded-2xl ${mobileFocused || mobile ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
              <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <Ionicons 
                  name="call-outline" 
                  size={20} 
                  color={mobileFocused || mobile ? '#3b82f6' : '#9ca3af'} 
                />
              </View>
              <TextInput
                placeholder="Enter your mobile number"
                placeholderTextColor="#9ca3af"
                className="w-full px-12 py-4 text-base text-gray-800 font-poppins"
                value={mobile}
                onChangeText={setMobile}
                onFocus={() => setMobileFocused(true)}
                onBlur={() => setMobileFocused(false)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Address Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Address</Text>
            <View className={`relative border-2 rounded-2xl ${addressFocused || address ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
              <View className="absolute left-4 top-6 z-10">
                <Ionicons 
                  name="location-outline" 
                  size={20} 
                  color={addressFocused || address ? '#3b82f6' : '#9ca3af'} 
                />
              </View>
              <TextInput
                placeholder="Enter your complete address"
                placeholderTextColor="#9ca3af"
                className="w-full px-12 py-4 text-base text-gray-800 font-poppins min-h-[80px]"
                value={address}
                onChangeText={setAddress}
                onFocus={() => setAddressFocused(true)}
                onBlur={() => setAddressFocused(false)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* City and Zip Code Row */}
          <View className="flex-row mb-4 space-x-3">
            {/* City Input */}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">City</Text>
              <View className={`relative border-2 rounded-2xl ${cityFocused || city ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Ionicons 
                    name="business-outline" 
                    size={20} 
                    color={cityFocused || city ? '#3b82f6' : '#9ca3af'} 
                  />
                </View>
                <TextInput
                  placeholder="City"
                  placeholderTextColor="#9ca3af"
                  className="w-full px-12 py-4 text-base text-gray-800 font-poppins"
                  value={city}
                  onChangeText={setCity}
                  onFocus={() => setCityFocused(true)}
                  onBlur={() => setCityFocused(false)}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Zip Code Input */}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 mb-2 font-poppins">Zip Code</Text>
              <View className={`relative border-2 rounded-2xl ${zipCodeFocused || zipCode ? 'border-blue-500' : 'border-gray-200'} transition-colors`}>
                <View className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <Ionicons 
                    name="pin-outline" 
                    size={20} 
                    color={zipCodeFocused || zipCode ? '#3b82f6' : '#9ca3af'} 
                  />
                </View>
                <TextInput
                  placeholder="Zip"
                  placeholderTextColor="#9ca3af"
                  className="w-full px-12 py-4 text-base text-gray-800 font-poppins"
                  value={zipCode}
                  onChangeText={setZipCode}
                  onFocus={() => setZipCodeFocused(true)}
                  onBlur={() => setZipCodeFocused(false)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity 
            onPress={handleSignup}
            activeOpacity={0.8}
            className="mt-4"
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={[0, 0]}
              end={[1, 0]}
              className="py-4 rounded-2xl shadow-lg shadow-blue-200"
            >
              <Text className="text-white font-bold text-center text-lg font-poppins">
                Create Account
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="px-4 text-gray-500 font-poppins">OR</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Login Link */}
        <View className="items-center">
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            activeOpacity={0.7}
          >
            <Text className="text-gray-600 text-base font-poppins">
              Already have an account?{' '}
              <Text className="text-blue-600 font-semibold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SignupScreen;
