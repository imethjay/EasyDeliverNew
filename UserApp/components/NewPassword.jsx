import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

const NewPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    return (
        <View className="flex-1 w-full p-10   bg-white">
            <Text className="text-4xl top-1 after: font-poppins font-bold mb-6">Enter a new password</Text>

            <TextInput
                placeholder="New password"
                className="w-full border mt-12 outline-none font-poppins border-gray-300 rounded-[20px] px-4 py-3 text-base"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                placeholder="Confirm Password"
                className="w-full border outline-none font-poppins text-[#24FF00] border-[#24FF00] rounded-[20px] px-4 py-3 text-base mt-3"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            <TouchableOpacity className="w-full bg-blue-800 py-3 rounded-[20px] mt-6">
                <Text className="text-white text-center font-poppins text-base font-semibold">Done</Text>
            </TouchableOpacity>
        </View>
    );
};

export default NewPassword;
