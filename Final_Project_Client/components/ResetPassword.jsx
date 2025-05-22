import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

const ResetPassword = () => {
    const [mobile, setMobile] = useState("");

    return (
         <View className="flex-1 w-full p-10  bg-white">
                   
            <Text className="text-2xl font-bold mb-6 text-center">Reset your password</Text>
            
            <TextInput
                placeholder="Enter your mobile number"
                className="w-full border outline-none mt-12 border-gray-300 rounded-[20px] px-4 py-3 text-base"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
            />

            <TouchableOpacity className="w-full bg-blue-800 py-3 rounded-[20px] mt-10">
                <Text className="text-white text-center text-base font-semibold">Next</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ResetPassword;
