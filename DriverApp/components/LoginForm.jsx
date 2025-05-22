import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, CheckBox, Image } from 'react-native';
import { Ionicons } from "@expo/vector-icons";


const LoginForm = () => {
    const [isChecked, setIsChecked] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    return (
        <View className="flex-1 w-full p-10  bg-white">

            {/* Header */}
            <Text className="text-3xl font-poppins text-left font-bold mt-6 text-black">Let’s get you started</Text>
            <Text className="text-base font-poppins text-left text-gray-600 mb-6">
                Welcome back, you’ve been missed!
            </Text>


            <View className="w-full mb-4 mt-6">
                <TextInput
                    placeholder="Email"
                    className="w-full border border-gray-300  rounded-[20px] px-4 py-3  font-poppins"
                />
            </View>

            <View className="w-full mb-2 relative">
                <TextInput
                    placeholder="Password"
                    secureTextEntry={!isPasswordVisible} // Toggle secureTextEntry
                    className="w-full border border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                />
                <TouchableOpacity
                    className="absolute right-4 top-3"
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                    <Image
                        source={
                            isPasswordVisible
                                ? require("../assets/icon/image.png") // Icon for "show password"
                                : require("../assets/icon/image.png") // Icon for "hide password"
                        }
                        style={{ width: 28, height: 18, tintColor: "gray" }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </View>

            <View className="w-full flex-row justify-between mt-2 items-center mb-12">
                <View className="flex-row items-center ">
                    <TouchableOpacity
                        onPress={() => setIsChecked(!isChecked)}
                        className="flex-row items-center mt-5 mb-6"
                        activeOpacity={0.7}
                    >
                        {/* Checkbox Icon */}
                        <View className="w-5 h-5  border border-gray-400 rounded flex items-center justify-center mr-2">
                            {isChecked && <Ionicons name="checkmark" size={18} color="blue" />}
                        </View>


                    </TouchableOpacity>
                    <Text className="text-gray-700 font-poppins ml-2">Remember me</Text>
                </View>
                <TouchableOpacity>
                    <Text className="text-orange-500 font-bold font-poppins">Forgot Password?</Text>
                </TouchableOpacity>


            </View>

            <View className="items-center">
                <TouchableOpacity className="w-full mt-4 bg-blue-800 py-3 rounded-[20px]">
                    <Text className="text-white font-bold text-center text-base font-poppins">Login</Text>
                </TouchableOpacity>

                <Text className="text-gray-500 text-base font-poppins font-semibold mt-4">OR</Text>

                <TouchableOpacity  >
                    <Text className="text-gray-400 text-base  font-poppins  mt-2">New Member?
                        <Text className="text-gray-600 text-base font-semibold font-poppins mt-2">Sign up</Text>
                    </Text>

                </TouchableOpacity>
            </View>


        </View>


    );
};

export default LoginForm;
