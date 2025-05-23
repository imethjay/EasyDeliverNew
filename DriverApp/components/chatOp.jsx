import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import ChatService from "../utils/ChatService";
import { auth, db } from "../firebase/init";
import { collection, query, where, getDocs } from "firebase/firestore";

const suggestions = [
    "Assistance for your delivery needs!",
    "Quick help for your parcel questions!",
    "Chatbot ready to assist with deliveries",
    "Assistance for your delivery needs!",
];

const ChatScreen = ({ route }) => {
    const navigation = useNavigation();
    const scrollViewRef = useRef();
    
    const { recipientId, recipientName, orderId } = route.params || {};
    
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [recipient, setRecipient] = useState({ 
        id: recipientId, 
        name: recipientName || "Customer" 
    });

    useEffect(() => {
        // Initialize chat service
        ChatService.initialize();
        
        // Fetch recipient info if we have their ID
        if (recipientId) {
            fetchRecipientInfo();
        }

        // Set up message listener
        const unsubscribe = ChatService.listenToMessages(recipientId, (newMessages) => {
            setMessages(newMessages);
            setLoading(false);
            
            // Scroll to bottom when new messages arrive
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        // Mark messages as read when component mounts
        ChatService.markMessagesAsRead(recipientId);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [recipientId]);

    const fetchRecipientInfo = async () => {
        try {
            // Try to get customer info from users collection
            const usersQuery = query(
                collection(db, 'users'),
                where('__name__', '==', recipientId)
            );
            
            const usersSnapshot = await getDocs(usersQuery);
            
            if (!usersSnapshot.empty) {
                const userData = usersSnapshot.docs[0].data();
                setRecipient({
                    id: recipientId,
                    name: userData.fullName || userData.name || "Customer",
                    avatar: userData.profileImage || null
                });
            }
        } catch (error) {
            console.error('Error fetching recipient info:', error);
        }
    };

    const sendMessage = async () => {
        if (message.trim().length === 0) return;
        if (sending) return;

        setSending(true);
        
        try {
            await ChatService.sendMessage(recipientId, message.trim(), orderId);
            setMessage("");
            
            // Scroll to bottom after sending
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        
        const messageTime = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.abs(now - messageTime) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const renderMessage = (msg, index) => {
        const isMyMessage = msg.senderId === auth.currentUser?.uid;
        const showTime = index === 0 || 
            (messages[index - 1] && 
             Math.abs(new Date(msg.timestamp || 0) - new Date(messages[index - 1].timestamp || 0)) > 5 * 60 * 1000); // 5 minutes

        return (
            <View key={msg.id} className="mb-3">
                {showTime && (
                    <Text className="text-xs text-gray-400 text-center mb-2">
                        {formatMessageTime(msg.timestamp)}
                    </Text>
                )}
                <View
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        isMyMessage
                            ? 'bg-blue-500 self-end'
                            : 'bg-gray-200 self-start'
                    }`}
                >
                    <Text className={isMyMessage ? 'text-white' : 'text-black'}>
                        {msg.text}
                    </Text>
                    {isMyMessage && (
                        <View className="flex-row justify-end mt-1">
                            <Ionicons 
                                name={msg.isRead ? "checkmark-done" : "checkmark"} 
                                size={12} 
                                color={msg.isRead ? "#4ade80" : "rgba(255,255,255,0.7)"} 
                            />
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#133BB7" />
                <Text className="mt-4 text-gray-600">Loading chat...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            {/* Header */}
            <View className="flex-row w-full items-center p-5 border-b border-gray-200 bg-white">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200" 
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <View className="flex-1 ml-3">
                    <Text className="text-lg font-extrabold">{recipient.name}</Text>
                    <Text className="text-sm text-gray-500">
                        {orderId ? `Order #${orderId.substring(0, 8)}` : 'Customer'}
                    </Text>
                </View>
                <TouchableOpacity 
                    className="ml-auto"
                    onPress={() => {/* Add call functionality */}}
                >
                    <Ionicons name="call" size={24} color="blue" />
                </TouchableOpacity>
            </View>

            {/* Chat Messages */}
            <ScrollView 
                ref={scrollViewRef}
                className="flex-1 px-5 py-3"
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.length === 0 ? (
                    <View className="flex-1 justify-center items-center py-20">
                        <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                        <Text className="text-gray-500 text-center mt-4">
                            Start a conversation with {recipient.name}
                        </Text>
                        <Text className="text-gray-400 text-center text-sm mt-2">
                            All messages are related to your delivery
                        </Text>
                    </View>
                ) : (
                    messages.map(renderMessage)
                )}
            </ScrollView>

            {/* Message Input */}
            <View className="flex-row items-center bg-gray-100 rounded-full p-3 mx-5 mb-5">
                <TextInput
                    className="flex-1 bg-transparent"
                    placeholder="Type your message..."
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={sendMessage}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity 
                    onPress={sendMessage}
                    disabled={message.trim().length === 0 || sending}
                    className={`ml-3 ${message.trim().length === 0 || sending ? 'opacity-50' : ''}`}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="blue" />
                    ) : (
                        <Ionicons name="send" size={24} color="blue" />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatScreen;
