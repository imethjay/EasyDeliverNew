import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import "./global.css"
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginForm from './components/LoginForm';
import RegistrationForm from './components/RegistrationForm';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import OTPVerification from './components/OTPVerification';
import DriverHome from './components/DriverHome';
import StatsPage from './components/StatsPage';
import MyOrder from './components/MyOrder';
import ProofOfDelevery from './components/ProofOfDeliver.jsx';
import RiderConfirmed from './components/RiderConfirmed';
import DeliveryRequestModal from './components/DeliveryRequestModal';
import OrderPreview from './components/OrderPreview';
import LiveTrack from './components/LiveTrack';
import CustomerConfiremed from './components/CustomerConfiremed';
import DeliveryComplete from './components/DeliveryComplete';
import ChatList from './components/ChatList';
import ResheduleDelivery from './components/ResheduleDelivery';
import ChatOp from './components/chatOp';
import Profile from './components/Profile.jsx';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginForm} />
          <Stack.Screen name="Registration" component={RegistrationForm} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="ResetPassword" component={ResetPassword} />
          <Stack.Screen name="OTPVerification" component={OTPVerification} />
          <Stack.Screen name="DriverHome" component={DriverHome} />
          <Stack.Screen name="StatsPage" component={StatsPage} />
          <Stack.Screen name="MyOrder" component={MyOrder} />
          <Stack.Screen name="OrderPreview" component={OrderPreview} />
          <Stack.Screen name="ResheduleDelivery" component={ResheduleDelivery} />
          <Stack.Screen name="LiveTrack" component={LiveTrack} />
          <Stack.Screen name="DeliveryRequestModal" component={DeliveryRequestModal} />
          <Stack.Screen name="RiderConfirmed" component={RiderConfirmed} />
          <Stack.Screen name="CustomerConfiremed" component={CustomerConfiremed} />
          <Stack.Screen name="DeliveryComplete" component={DeliveryComplete} />
          <Stack.Screen name="ProofOfDelevery" component={ProofOfDelevery} />
          <Stack.Screen name="ChatList" component={ChatList} />
          <Stack.Screen name="ChatOp" component={ChatOp} />
          <Stack.Screen name="Profile" component={Profile} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
});

