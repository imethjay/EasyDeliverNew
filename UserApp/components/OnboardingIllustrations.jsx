import React from 'react';
import { View } from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Circle, 
  Rect, 
  Path, 
  Ellipse,
  Polygon 
} from 'react-native-svg';

export const DeliveryIllustration = ({ size = 250 }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 250 250">
      <Defs>
        <LinearGradient id="truckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4facfe" />
          <Stop offset="100%" stopColor="#00f2fe" />
        </LinearGradient>
        <LinearGradient id="boxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff9a9e" />
          <Stop offset="100%" stopColor="#fecfef" />
        </LinearGradient>
        <LinearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(0,0,0,0.2)" />
          <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </LinearGradient>
      </Defs>
      
      {/* Shadow */}
      <Ellipse cx="125" cy="220" rx="80" ry="15" fill="url(#shadowGradient)" />
      
      {/* Truck body */}
      <Rect x="60" y="120" width="120" height="60" rx="8" fill="url(#truckGradient)" />
      
      {/* Truck cabin */}
      <Rect x="40" y="140" width="40" height="40" rx="6" fill="url(#truckGradient)" />
      
      {/* Wheels */}
      <Circle cx="80" cy="190" r="15" fill="#2c3e50" />
      <Circle cx="80" cy="190" r="10" fill="#34495e" />
      <Circle cx="150" cy="190" r="15" fill="#2c3e50" />
      <Circle cx="150" cy="190" r="10" fill="#34495e" />
      
      {/* Package */}
      <Rect x="90" y="80" width="40" height="40" rx="4" fill="url(#boxGradient)" />
      <Path d="M90 100 L130 100 M110 80 L110 120" stroke="#fff" strokeWidth="2" />
      
      {/* Speed lines */}
      <Path d="M20 100 L35 100 M15 110 L30 110 M25 120 L40 120" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  </View>
);

export const TrackingIllustration = ({ size = 250 }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 250 250">
      <Defs>
        <LinearGradient id="phoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#667eea" />
          <Stop offset="100%" stopColor="#764ba2" />
        </LinearGradient>
        <LinearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#a8edea" />
          <Stop offset="100%" stopColor="#fed6e3" />
        </LinearGradient>
        <LinearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff6b6b" />
          <Stop offset="100%" stopColor="#ee5a24" />
        </LinearGradient>
      </Defs>
      
      {/* Shadow */}
      <Ellipse cx="125" cy="220" rx="60" ry="12" fill="rgba(0,0,0,0.2)" />
      
      {/* Phone */}
      <Rect x="75" y="60" width="100" height="160" rx="20" fill="url(#phoneGradient)" />
      <Rect x="85" y="80" width="80" height="120" rx="8" fill="url(#mapGradient)" />
      
      {/* Map elements */}
      <Path d="M90 90 Q110 100 130 90 T170 100" stroke="#4facfe" strokeWidth="3" fill="none" />
      <Path d="M85 120 Q105 110 125 120 T165 110" stroke="#4facfe" strokeWidth="2" fill="none" />
      <Path d="M90 150 Q110 140 130 150 T170 140" stroke="#4facfe" strokeWidth="2" fill="none" />
      
      {/* Location pins */}
      <Path d="M110 110 C110 105 115 100 125 100 C135 100 140 105 140 110 C140 115 125 130 125 130 C125 130 110 115 110 110 Z" fill="url(#pinGradient)" />
      <Circle cx="125" cy="110" r="4" fill="#fff" />
      
      {/* Tracking dots */}
      <Circle cx="100" cy="95" r="3" fill="#ff6b6b" />
      <Circle cx="115" cy="125" r="3" fill="#4facfe" />
      <Circle cx="145" cy="155" r="3" fill="#2ecc71" />
      
      {/* Phone details */}
      <Circle cx="125" cy="210" r="8" fill="rgba(255,255,255,0.3)" />
    </Svg>
  </View>
);

export const SecureIllustration = ({ size = 250 }) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 250 250">
      <Defs>
        <LinearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2ecc71" />
          <Stop offset="100%" stopColor="#27ae60" />
        </LinearGradient>
        <LinearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#f39c12" />
          <Stop offset="100%" stopColor="#e67e22" />
        </LinearGradient>
        <LinearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#f1c40f" />
          <Stop offset="100%" stopColor="#f39c12" />
        </LinearGradient>
      </Defs>
      
      {/* Shadow */}
      <Ellipse cx="125" cy="220" rx="70" ry="15" fill="rgba(0,0,0,0.2)" />
      
      {/* Shield */}
      <Path d="M125 50 C145 50 165 60 165 80 L165 140 C165 170 125 190 125 190 C125 190 85 170 85 140 L85 80 C85 60 105 50 125 50 Z" fill="url(#shieldGradient)" />
      
      {/* Lock */}
      <Rect x="110" y="110" width="30" height="25" rx="4" fill="url(#lockGradient)" />
      <Path d="M115 110 L115 105 C115 100 120 95 125 95 C130 95 135 100 135 105 L135 110" stroke="url(#lockGradient)" strokeWidth="3" fill="none" />
      
      {/* Checkmark */}
      <Path d="M115 90 L120 95 L135 80" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Coins */}
      <Circle cx="80" cy="120" r="12" fill="url(#coinGradient)" />
      <Circle cx="170" cy="130" r="10" fill="url(#coinGradient)" />
      <Circle cx="90" cy="170" r="8" fill="url(#coinGradient)" />
      
      {/* Dollar signs */}
      <Path d="M80 115 L80 125 M77 118 L83 118 M77 122 L83 122" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <Path d="M170 125 L170 135 M168 128 L172 128 M168 132 L172 132" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Security particles */}
      <Circle cx="60" cy="90" r="2" fill="rgba(255,255,255,0.8)" />
      <Circle cx="190" cy="100" r="2" fill="rgba(255,255,255,0.8)" />
      <Circle cx="70" cy="200" r="2" fill="rgba(255,255,255,0.8)" />
      <Circle cx="180" cy="180" r="2" fill="rgba(255,255,255,0.8)" />
    </Svg>
  </View>
); 