import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(email, password);
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle forgot password press
  const handleForgotPassword = () => {
    // You can implement reset password functionality here
    Alert.alert('Reset Password', 'Password reset functionality will be implemented here.');
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Background with subtle gradient */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9', '#e2e8f0']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View className="flex-1 px-6 pt-16">
        {/* Header Section */}
        <View className="mb-8">
          <View className="mb-3">
            <Text className="text-4xl font-bold text-gray-900 font-poppins">
              Welcome
            </Text>
            <Text className="text-4xl font-bold text-blue-600 font-poppins">
              Back
            </Text>
          </View>
          <Text className="text-lg text-gray-600 font-poppins leading-relaxed">
            Sign in to continue your journey
          </Text>
        </View>

        {/* Form Container */}
        <View className="bg-white rounded-3xl px-6 py-8 shadow-lg shadow-gray-200 mb-6">
          {/* Email Input */}
          <View className="mb-6">
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
          <View className="mb-6">
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

          {/* Remember Me & Forgot Password */}
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity
              onPress={() => setIsChecked(!isChecked)}
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text className="text-gray-600 font-poppins">Remember me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text className="text-blue-600 font-semibold font-poppins">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            onPress={handleLogin}
            activeOpacity={0.8}
            className="mb-4"
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={[0, 0]}
              end={[1, 0]}
              className="py-4 rounded-2xl shadow-lg shadow-blue-200"
            >
              <Text className="text-white font-bold text-center text-lg font-poppins">
                Sign In
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

        

        {/* Sign Up Link */}
        <View className="items-center">
          <TouchableOpacity 
            onPress={() => navigation.navigate('Signup')} 
            activeOpacity={0.7}
          >
            <Text className="text-gray-600 text-base font-poppins">
              Don't have an account?{' '}
              <Text className="text-blue-600 font-semibold">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
