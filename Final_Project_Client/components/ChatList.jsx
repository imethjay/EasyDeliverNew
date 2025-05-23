import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ChatService from "../utils/ChatService";
import { auth, db } from "../firebase/init";
import { collection, query, where, getDocs } from "firebase/firestore";

const ChatList = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState("Notifications");
    const [searchText, setSearchText] = useState("");
    const [chatList, setChatList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState({});

    const menuItems = [
        { icon: require("../assets/icon/home.png"), label: "Home", screen: "Home" },
        { icon: require("../assets/icon/orders.png"), label: "Delivery", screen: "Delivery" },
        { icon: require("../assets/icon/chat.png"), label: "Notifications", screen: "Notifications" },
        { icon: require("../assets/icon/profile.png"), label: "Account", screen: "Account" },
    ];

    useEffect(() => {
        // Initialize chat service and listen to chat list
        ChatService.initialize();
        
        const unsubscribe = ChatService.listenToChatList((chats) => {
            setChatList(chats);
            setLoading(false);
            
            // Fetch user profiles for chat participants
            chats.forEach(chat => {
                if (!userProfiles[chat.recipientId]) {
                    fetchUserProfile(chat.recipientId);
                }
            });
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const fetchUserProfile = async (userId) => {
        try {
            // Try to get driver info from drivers collection
            const driversQuery = query(
                collection(db, 'drivers'),
                where('uid', '==', userId)
            );
            
            const driversSnapshot = await getDocs(driversQuery);
            
            if (!driversSnapshot.empty) {
                const driverData = driversSnapshot.docs[0].data();
                setUserProfiles(prev => ({
                    ...prev,
                    [userId]: {
                        name: driverData.fullName || driverData.name || "Driver",
                        avatar: driverData.profileImage || "https://randomuser.me/api/portraits/men/2.jpg",
                        role: "Driver",
                        vehicle: driverData.vehicleNumber
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Set default profile if fetch fails
            setUserProfiles(prev => ({
                ...prev,
                [userId]: {
                    name: "Driver",
                    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
                    role: "Driver"
                }
            }));
        }
    };

    const formatTime = (timestamp) => {
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

    const filteredChats = chatList.filter(chat => {
        if (!searchText.trim()) return true;
        
        const profile = userProfiles[chat.recipientId];
        const name = profile?.name || "Driver";
        const lastMessage = chat.lastMessage?.text || "";
        
        return name.toLowerCase().includes(searchText.toLowerCase()) ||
               lastMessage.toLowerCase().includes(searchText.toLowerCase());
    });

    const handleNavigation = (screenName) => {
        setActiveTab(screenName);
        navigation.navigate(screenName);
    };

    const renderChatItem = ({ item }) => {
        const profile = userProfiles[item.recipientId] || {
            name: "Driver",
            avatar: "https://randomuser.me/api/portraits/men/2.jpg"
        };

        return (
            <TouchableOpacity
                className="flex-row items-center bg-gray-50 p-4 rounded-xl mb-3"
                onPress={() => navigation.navigate("ChatScreen", {
                    recipientId: item.recipientId,
                    recipientName: profile.name,
                    orderId: item.orderId
                })}
            >
                <Image source={{ uri: profile.avatar }} className="w-12 h-12 rounded-full" />
                <View className="ml-3 flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-bold text-gray-800">{profile.name}</Text>
                        <Text className="text-gray-400 text-xs">
                            {formatTime(item.lastMessage?.timestamp)}
                        </Text>
                    </View>
                    <Text className="text-gray-600 text-sm" numberOfLines={1}>
                        {item.lastMessage?.text || "Start a conversation"}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        {profile.vehicle && (
                            <Text className="text-blue-500 text-xs mr-2">
                                🚗 {profile.vehicle}
                            </Text>
                        )}
                        {item.orderId && (
                            <Text className="text-blue-500 text-xs">
                                Order #{item.orderId.substring(0, 8)}
                            </Text>
                        )}
                    </View>
                </View>
                <View className="ml-2">
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 w-full bg-white p-4">
            {/* Header */}
            <View className="flex-row items-center mb-4">
                <TouchableOpacity 
                    className="rounded-full p-2 border-2 border-gray-200"
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-extrabold">Chats</Text>
                <View className="w-10" />
            </View>

            {/* Search Bar */}
            <View className="flex-row items-center bg-gray-100 rounded-xl p-3 mb-4">
                <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
                <TextInput
                    className="flex-1"
                    placeholder="Search conversations..."
                    value={searchText}
                    onChangeText={setSearchText}
                />
                {searchText ? (
                    <TouchableOpacity onPress={() => setSearchText("")}>
                        <Ionicons name="close" size={20} color="gray" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Chat List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#133BB7" />
                    <Text className="mt-4 text-gray-600">Loading chats...</Text>
                </View>
            ) : filteredChats.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                    <Text className="text-gray-500 text-center mt-4 text-lg">
                        {searchText ? "No conversations found" : "No messages yet"}
                    </Text>
                    <Text className="text-gray-400 text-center text-sm mt-2">
                        {searchText ? "Try a different search term" : "You'll see your conversations with drivers here"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredChats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            )}

            {/* Bottom Navigation */}
            <View
                className="flex-row justify-between bg-white px-8 py-4 border-t border-gray-200"
                style={{ position: "absolute", bottom: 0, width: "100%" }}
            >
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        className="items-center"
                        onPress={() => handleNavigation(item.screen)}
                    >
                        <Image
                            source={item.icon}
                            style={{
                                width: 24,
                                height: 24,
                                tintColor: activeTab === item.screen ? "blue" : "gray",
                            }}
                            resizeMode="contain"
                        />
                        <Text
                            className={`text-sm ${activeTab === item.screen ? "text-blue-600" : "text-gray-500"}`}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default ChatList;
