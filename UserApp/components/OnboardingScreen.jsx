import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  DeliveryIllustration, 
  TrackingIllustration, 
  SecureIllustration 
} from './OnboardingIllustrations';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const floatingAnim = useRef(new Animated.Value(0)).current;

  // Floating animation effect
  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floating.start();
    return () => floating.stop();
  }, []);

  const onboardingData = [
    {
      id: '1',
      title: 'Fast & Reliable Delivery',
      description: 'Get your packages delivered quickly and safely with our trusted courier network.',
      illustration: DeliveryIllustration,
      backgroundColor: ['#3b82f6', '#1e40af'],
    },
    {
      id: '2',
      title: 'Real-Time Tracking',
      description: 'Track your deliveries in real-time and stay updated every step of the way.',
      illustration: TrackingIllustration,
      backgroundColor: ['#1e40af', '#1e3a8a'],
    },
    {
      id: '3',
      title: 'Secure & Affordable',
      description: 'Enjoy secure deliveries at competitive prices with our easy-to-use platform.',
      illustration: SecureIllustration,
      backgroundColor: ['#2563eb', '#1d4ed8'],
    },
  ];

  const goToNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Login');
    }
  };

  const skip = () => {
    finishOnboarding();
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: currentIndex === index ? '#fff' : 'rgba(255,255,255,0.3)',
                width: currentIndex === index ? 25 : 8,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const currentSlide = onboardingData[currentIndex];
  const IllustrationComponent = currentSlide.illustration;

  return (
    <LinearGradient
      colors={currentSlide.backgroundColor}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={skip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                transform: [
                  {
                    scale: 1,
                  },
                  {
                    translateY: floatingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.illustrationContainer}>
              <IllustrationComponent size={250} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.textContainer}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: 1,
              },
            ]}
          >
            {currentSlide.title}
          </Animated.Text>
          
          <Animated.Text
            style={[
              styles.description,
              {
                opacity: 1,
              },
            ]}
          >
            {currentSlide.description}
          </Animated.Text>
        </View>
      </View>

      <View style={styles.footer}>
        {renderDots()}
        
        <TouchableOpacity style={styles.nextButton} onPress={goToNext}>
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  imageWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    width: width - 40,
    height: 55,
    borderRadius: 27.5,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 27.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingScreen; 