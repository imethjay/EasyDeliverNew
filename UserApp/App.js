import { StatusBar } from 'expo-status-bar';
import "./global.css";
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './components/auth/AuthContext';
import { useEffect, useState } from 'react';
import { auth } from './firebase/init';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from './components/OnboardingScreen';
import LoginScreen from './components/auth/LoginScreen';
import SignupScreen from './components/auth/SignupScreen';
import HomePage from './components/HomePage';
import Register from './components/Register';
import CreateDelivery from './components/CreateDelivery';
import CourierSelection from './components/CourierSelection';
import TimePicker from './components/TimePicker';
import FindRide from './components/FindRide';
import MyOrder from './components/MyOrder';
import ChatList from './components/ChatList';
import ChatScreen from './components/chatOp';
import Profile from './components/Profile';
import TrackingDetails from './components/OrderPreview';
import LiveTrack from './components/LiveTrack';
import RescheduleDelivery from './components/RescheduleDelivery';
import PaymentUpdates from './components/PaymentUpdates'; 
import SearchingDrivers from './components/SearchingDrivers';
import RiderConfirmed from './components/RiderConfirmed';
import DeliveryComplete from './components/DeliveryComplete';
import DeliveryDetails from './components/DeliveryDetails';

// Import other components as needed

const Stack = createStackNavigator();

function MainNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

  // Handle auth state changes and onboarding check
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingStatus === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasSeenOnboarding(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) {
        setInitializing(false);
      }
    });

    checkOnboardingStatus();

    // Cleanup subscription
    return unsubscribe;
  }, [initializing]);

  if (initializing || hasSeenOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        {/* You can add a loading indicator here if you want */}
      </View>
    );
  }

  // Determine initial route based on onboarding and auth status
  const getInitialRoute = () => {
    if (!hasSeenOnboarding) {
      return "Onboarding";
    }
    return user ? "Home" : "Login";
  };

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomePage} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen name="CreateDelivery" component={CreateDelivery} />
      <Stack.Screen name="CourierSelection" component={CourierSelection} />
      <Stack.Screen name="TimePicker" component={TimePicker} />
      <Stack.Screen name="FindRide" component={FindRide} />
      <Stack.Screen name="MyOrder" component={MyOrder} />
      <Stack.Screen name="ChatList" component={ChatList} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="TrackingDetails" component={TrackingDetails} />
      <Stack.Screen name="LiveTrack" component={LiveTrack} />
      <Stack.Screen name="RescheduleDelivery" component={RescheduleDelivery} />
      <Stack.Screen name="PaymentUpdates" component={PaymentUpdates} />
      <Stack.Screen name="SearchingDrivers" component={SearchingDrivers} />
      <Stack.Screen name="RiderConfirmed" component={RiderConfirmed} />
      <Stack.Screen name="DeliveryComplete" component={DeliveryComplete} />
      <Stack.Screen name="DeliveryDetails" component={DeliveryDetails} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthProvider>
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FBFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});