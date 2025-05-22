import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { RadioButton } from "react-native-paper"; // Install react-native-paper
import tw from "twrnc"; // Install twrnc
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/init";

const CourierSelection = () => {
    const [selectedOption, setSelectedOption] = useState("from");
    const [selectedCourier, setSelectedCourier] = useState(null);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    
    // Get package details from navigation params
    const { packageDetails } = route.params || { 
        packageDetails: { 
            packageName: "JBL Earbuds", 
            trackingId: "23D47389",
            pickupLocation: "20/6, Panadura",
            dropoffLocation: "20/6, Panadura" 
        } 
    };

    // Fetch active couriers from Firebase
    useEffect(() => {
        const fetchCouriers = async () => {
            setLoading(true);
            try {
                // Query for active couriers only
                const couriersQuery = query(
                    collection(db, "couriers"),
                    where("isActive", "==", true)
                );
                
                const querySnapshot = await getDocs(couriersQuery);
                const couriersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setCouriers(couriersList);
            } catch (err) {
                console.error("Error fetching couriers:", err);
                setError("Failed to load couriers. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchCouriers();
    }, []);

    // Function to handle navigation to FindRide page
    const handleNextPress = () => {
        if (selectedCourier) {
            // Pass selected courier and package details to the next screen
            navigation.navigate("FindRide", { 
                selectedCourier,
                packageDetails
            });
        }
    };
    
    // Function to handle back button press
    const handleBackPress = () => {
        navigation.goBack();
    };

    return (
        <View className="flex-1 w-full p-4 text-center bg-gray-100">
            {/* Header */}
            <View className="flex-row items-center mt-4">
                <TouchableOpacity onPress={handleBackPress} className="rounded-full p-2 border-2 border-gray-200">
                    <Ionicons name="arrow-back" size={20} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-extrabold text-center flex-1 ">
                    Courier Service
                </Text>
            </View>

            {/* Package Info Card */}
            <View className="bg-white shadow-md rounded-2xl p-5 mt-6 w-full">
                <View className="flex-row items-center">
                    <Image
                        source={require("../assets/icon/package.png")}
                        className="w-10 h-10 rounded-md"
                    />
                    <View className="ml-3 flex-1">
                        <Text className="text-black font-bold text-lg">{packageDetails.packageName}</Text>
                        <Text className="text-gray-400 text-xs">
                            #TrackingID: {packageDetails.trackingId}
                        </Text>
                    </View>
                    <TouchableOpacity>
                        <Text className="text-gray-400 text-lg">⋮</Text>
                    </TouchableOpacity>
                </View>

                {/* Radio Selection */}
                <View className="mt-3">
                    <View
                        className="flex-row items-center my-2"
                        onPress={() => setSelectedOption("from")}
                    >
                        <RadioButton
                            value="from"
                            status={selectedOption === "from" ? "checked" : "unchecked"}
                            onPress={() => setSelectedOption("from")}
                        />
                        <Text className="ml-2 text-black text-base">From: {packageDetails.pickupLocation}</Text>
                    </View>

                    <View
                        className="flex-row items-center"
                        onPress={() => setSelectedOption("to")}
                    >
                        <RadioButton
                            value="to"
                            status={selectedOption === "to" ? "checked" : "unchecked"}
                            onPress={() => setSelectedOption("to")}
                        />
                        <Text className="ml-2 text-black text-base">Likely to: {packageDetails.dropoffLocation}</Text>
                    </View>
                </View>
            </View>

            {/* Courier Selection List */}
            <Text className="text-black mt-6 mb-3 text-lg font-semibold">
                Select a courier service
            </Text>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#133BB7" />
                </View>
            ) : error ? (
                <View className="bg-red-100 p-4 rounded-lg">
                    <Text className="text-red-500">{error}</Text>
                </View>
            ) : couriers.length === 0 ? (
                <View className="bg-gray-100 p-4 rounded-lg">
                    <Text className="text-gray-500">No courier services available at the moment.</Text>
                </View>
            ) : (
                <ScrollView>
                    {couriers.map((courier) => (
                        <TouchableOpacity
                            key={courier.id}
                            className={`flex-row items-center bg-white shadow-md rounded-[20px] p-4 mb-3 w-full ${selectedCourier === courier.id ? "border-2 border-blue-800" : ""}`}
                            onPress={() => setSelectedCourier(courier.id)}
                        >
                            {courier.imageUrl ? (
                                <Image
                                    source={{ uri: courier.imageUrl }}
                                    className="w-14 h-14 rounded-md"
                                    defaultSource={require("../assets/icon/pronto.png")}
                                />
                            ) : (
                                <Image
                                    source={require("../assets/icon/pronto.png")}
                                    className="w-14 h-14 rounded-md"
                                />
                            )}
                            <Text className="text-black ml-4 flex-1 text-lg font-semibold">
                                {courier.courierName}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Next Button */}
            <TouchableOpacity
                className={`w-full py-4 mt-2 rounded-[40px] ${selectedCourier ? "bg-blue-800" : "bg-gray-400"}`}
                disabled={!selectedCourier}
                onPress={handleNextPress}
            >
                <Text className="text-center text-white font-bold text-lg">Next</Text>
            </TouchableOpacity>
        </View>
    );
};

export default CourierSelection;