import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('Onboarding status reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    return false;
  }
};

export const checkOnboardingStatus = async () => {
  try {
    const status = await AsyncStorage.getItem('hasSeenOnboarding');
    return status === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

export const setOnboardingComplete = async () => {
  try {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    return true;
  } catch (error) {
    console.error('Error setting onboarding complete:', error);
    return false;
  }
}; 