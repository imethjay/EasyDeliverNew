import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import "./global.css"
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



export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <LoginForm />
        {/* <RegistrationForm/> */}
        {/* <Register /> */}
        {/* <ResetPassword /> */}
        {/* <OTPVerification/> */}
        {/* <ResetPassword /> */}

        {/* <DriverHome /> */}
        {/* <StatsPage/> */}

        {/* <MyOrder/> */}
        {/* <OrderPreview/> */}
     {/* <ResheduleDelivery/> */}
        {/* <LiveTrack/> */}

        {/* <DeliveryRequestModal/> */}
        {/* <RiderConfirmed/> */}
        {/* <CustomerConfiremed/> */}

        {/* <DeliveryComplete /> */}
        {/* <ProofOfDelevery/> */}
        {/* <ChatList/> */}
         {/* <ChatOp/> */}
         {/* <Profile/> */}

        <StatusBar style="auto" />
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});

