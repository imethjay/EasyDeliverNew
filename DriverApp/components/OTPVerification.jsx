import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

const OTPVerification = () => {
    const [otp, setOtp] = useState("");

    return (
       <View className="flex-1 w-full p-10   bg-white">
            <Text className="text-2xl font-bold mb-6 text-center">We have sent you an OTP..</Text>
            
            <TextInput
                placeholder="Enter OTP"
                className="w-full mt-12 border outline-none border-gray-300 rounded-[20px] px-4 py-3 text-base"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
            />

            <TouchableOpacity className="w-full bg-blue-800 py-3 rounded-[20px] mt-10">
                <Text className="text-white text-center text-base font-semibold">Next</Text>
            </TouchableOpacity>
        </View>
    );
};

export default OTPVerification;
