import React,{ useState } from "react";
import { View, Text, TextInput, TouchableOpacity,CheckBox , ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons"; 

const RegistrationForm = () => {
    const [isChecked, setIsChecked] = useState(false);
    return (
        <View className="flex-1 w-full p-10  bg-white">
            
            {/* Header */}
            <Text className="text-3xl font-poppins text-left font-bold mt-6 text-black">Getting Started</Text>
            <Text className="text-base font-poppins text-left text-gray-600 mb-6">
                Seems you are new here,{"\n"}Let’s set up your profile.
            </Text>

      
            {/* Full Name */}
            <View className="mb-4">
                <TextInput
                    placeholder="Full Name"
                    className="w-full border  border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                />
            </View>

            {/* Email */}
            <View className="mb-3">
                <TextInput
                    placeholder="Email"
                    className="w-full border border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                />
            </View>

            {/* Address */}
            <View className="mb-3">
                <TextInput
                    placeholder="Address"
                    className="w-full border border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                />
            </View>

            {/* City and Zip Code */}
            <View className="flex-row gap-1 justify-between   mb-3  ">
                <View>
                    <TextInput
                        placeholder="City"
                        className="w-36 border border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                    />
                </View>
                <View className="">
                    <TextInput
                        placeholder="Zip Code"
                        className="w-36 border border-gray-300 rounded-[20px] px-4 py-3 text-base font-poppins"
                    />
                </View>
            </View>


            {/* Confirm Password */}
            <View className="mb-3">
                <TextInput
                    placeholder="Confirm Password"
                    secureTextEntry
                    className="w-full border text-[#24FF00] border-[#24FF00] rounded-[20px] px-4 py-3 text-base font-poppins"
                />
            </View>

            {/* Terms and Conditions */}
            <TouchableOpacity
                onPress={() => setIsChecked(!isChecked)}
                className="flex-row items-center mb-6"
                activeOpacity={0.7}
            >
                {/* Checkbox Icon */}
                <View className="w-5 h-5  border border-gray-400 rounded flex items-center justify-center mr-2">
                    {isChecked && <Ionicons name="checkmark" size={18} color="blue" />}
                </View>
                
                <Text className="text-gray-600 text-sm font-poppins">
                    By creating an account, you agree to our{"\n"}
                    <Text className="text-orange-600">Terms and Conditions</Text>
                </Text>
            </TouchableOpacity>
            {/* Continue Button */}
            <TouchableOpacity className="w-full bg-blue-800 py-3 rounded-[20px]">
                <Text className="text-white text-center text-base font-poppins">Continue</Text>
            </TouchableOpacity>

            {/* Already have an account */}
            <Text className="text-center text-gray-400 text-sm font-poppins mt-2">
                Already have an account?{" "}
                <Text className="text-gray-600 font-semibold">Login</Text>
            </Text>
        </View>
    );
};

export default RegistrationForm;
