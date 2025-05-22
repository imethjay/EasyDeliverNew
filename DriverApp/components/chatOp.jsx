import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const suggestions = [
    "Assistance for your delivery needs!",
    "Quick help for your parcel questions!",
    "Chatbot ready to assist with deliveries",
    "Assistance for your delivery needs!",
];

const ChatScreen = ({ navigation }) => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    const sendMessage = () => {
        if (message.trim().length > 0) {
            setMessages([...messages, { id: messages.length + 1, text: message }]);
            setMessage("");
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white p-5"
        >
            {/* Header */}
            <View className="flex-row w-full items-center  mb-4">
                <TouchableOpacity className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-extrabold">Chat</Text>
                <TouchableOpacity className="ml-auto">
                    <Ionicons name="call" size={24} color="blue" />
                </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <ScrollView className="flex-1 mt-5">
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        className="bg-blue-100 self-end rounded-lg px-4 py-2 mb-2 max-w-[70%]"
                    >
                        <Text className="text-black">{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Suggestions */}
            <Text className="text-blue-500 font-bold">Suggestions</Text>
            <FlatList
                data={suggestions}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => setMessage(item)}>
                        <Text className="text-gray-500 italic mt-2">{item}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Message Input */}
            <View className="flex-row items-center bg-gray-100 rounded-full p-3 mt-4">
                <TextInput
                    className="flex-1"
                    placeholder="Write your message"
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity onPress={sendMessage}>
                    <Ionicons name="send" size={24} color="blue" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatScreen;
