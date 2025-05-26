import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase/init';
import { useNavigation, useRoute } from '@react-navigation/native';

// Vehicle types options
const vehicleTypes = [
  { label: 'Car', value: 'car' },
  { label: 'Bike', value: 'bike' },
  { label: 'Lorry', value: 'lorry' },
  { label: 'Mini-Lorry', value: 'mini-lorry' },
  { label: 'Carrier', value: 'carrier' },
  { label: 'Tuk', value: 'tuk' },
];

const Register = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, fullName, password } = route.params || {};

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState(null);
  const [company, setCompany] = useState(null);
  const [userType, setUserType] = useState('courier');
  const [agreed, setAgreed] = useState(false);
  const [licenseImage, setLicenseImage] = useState(null);
  const [courierCompanies, setCourierCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (userType === 'courier') {
      fetchCourierCompanies();
    }
  }, [userType]);

  const fetchCourierCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const courierQuery = query(
        collection(db, 'couriers'),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(courierQuery);
      const companies = querySnapshot.docs.map(doc => ({
        label: doc.data().courierName,
        value: doc.id,
        ...doc.data()
      }));
      
      setCourierCompanies(companies);
    } catch (err) {
      console.error('Error fetching courier companies:', err);
      setError('Failed to load courier companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload your driver\'s license.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7, // Reduce quality for smaller base64 size
        aspect: [4, 3], // Good aspect ratio for license documents
        allowsMultipleSelection: false,
        base64: true, // Enable base64 encoding
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Debug logging to understand what we're getting from the simulator
        console.log('🔍 Image asset details:', {
          uri: asset.uri,
          type: asset.type,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height
        });
        
        // Validate file type - be more flexible with validation
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        
        // Get file extension from URI or fileName
        let fileExtension = '';
        if (asset.fileName) {
          fileExtension = asset.fileName.toLowerCase().split('.').pop();
        } else if (asset.uri) {
          fileExtension = asset.uri.toLowerCase().split('.').pop();
        }
        
        const validExtensions = ['jpg', 'jpeg', 'png'];
        const hasValidExtension = validExtensions.includes(fileExtension);
        
        // Check MIME type if available, otherwise rely on extension
        let hasValidMimeType = true;
        if (asset.type) {
          hasValidMimeType = validMimeTypes.includes(asset.type.toLowerCase());
        }
        
        // For simulator images or images without proper MIME types, be more lenient
        // If we have a valid extension, allow it even if MIME type is missing/wrong
        const isValidImage = hasValidExtension || (hasValidMimeType && asset.type);
        
        if (!isValidImage) {
          console.log('❌ Invalid image type:', {
            extension: fileExtension,
            mimeType: asset.type,
            hasValidExtension,
            hasValidMimeType
          });
          
          Alert.alert(
            'Invalid File Type',
            'Please select a JPEG or PNG image file only. Other file types are not supported.'
          );
          return;
        }
        
        console.log('✅ Image type validation passed:', {
          extension: fileExtension,
          mimeType: asset.type,
          hasValidExtension,
          hasValidMimeType
        });
        
        // Validate file size (max 5MB for base64 to avoid Firestore limits)
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        if (asset.fileSize && asset.fileSize > maxSizeInBytes) {
          Alert.alert(
            'File Too Large',
            'Please select an image smaller than 5MB. You can try taking a new photo or compressing the existing one.'
          );
          return;
        }
        
        // Validate image dimensions (optional - ensure it's not too small)
        if (asset.width && asset.height) {
          if (asset.width < 200 || asset.height < 200) {
            Alert.alert(
              'Image Too Small',
              'Please select a clearer image. The license should be clearly readable.'
            );
            return;
          }
        }
        
        // Check base64 size (Firestore has 1MB document limit)
        if (asset.base64) {
          const base64Size = asset.base64.length * 0.75; // Approximate size in bytes
          if (base64Size > 800000) { // 800KB limit to be safe
            Alert.alert(
              'Image Too Large',
              'The image is too large to store. Please select a smaller image or reduce the quality.'
            );
            return;
          }
        }
        
        console.log('✅ Image selected:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type,
          extension: fileExtension,
          base64Size: asset.base64 ? `${Math.round(asset.base64.length * 0.75 / 1024)}KB` : 'N/A'
        });
        
        // Store both URI for display and base64 for storage
        // Ensure we have a valid MIME type based on extension or provided type
        let mimeType = asset.type;
        if (!mimeType || !validMimeTypes.includes(mimeType.toLowerCase())) {
          // Fallback to determining MIME type from extension
          if (fileExtension === 'png') {
            mimeType = 'image/png';
          } else {
            mimeType = 'image/jpeg'; // Default for jpg/jpeg
          }
        }
        
        setLicenseImage({
          uri: asset.uri,
          base64: asset.base64,
          type: mimeType
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error', 
        'Failed to pick an image. Please try again or restart the app if the problem persists.'
      );
    }
  };

  const validateForm = () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter your vehicle number');
      return false;
    }
    if (!vehicleType) {
      Alert.alert('Error', 'Please select your vehicle type');
      return false;
    }
    if (userType === 'courier' && !company) {
      Alert.alert('Error', 'Please select your courier company');
      return false;
    }
    if (!licenseImage || !licenseImage.uri) {
      Alert.alert('Error', 'Please upload your driver\'s license');
      return false;
    }
    if (!agreed) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
      return false;
    }
    return true;
  };

  const prepareLicenseData = async () => {
    if (!licenseImage || !licenseImage.base64) {
      console.log('No license image or base64 data available');
      return null;
    }

    try {
      console.log('✅ Preparing license image data for storage');
      
      // Create a data URL for the image
      const mimeType = licenseImage.type || 'image/jpeg';
      const licenseDataUrl = `data:${mimeType};base64,${licenseImage.base64}`;
      
      console.log(`✅ License image prepared: ${mimeType}, size: ${Math.round(licenseImage.base64.length * 0.75 / 1024)}KB`);
      
      return {
        licenseImage: licenseDataUrl,
        licenseImageType: mimeType,
        licenseImageSize: Math.round(licenseImage.base64.length * 0.75),
        uploadedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error preparing license data:', error);
      Alert.alert(
        'Error', 
        'Failed to prepare license image. Please try selecting the image again.'
      );
      return null;
    }
  };

  const handleRegistration = async () => {
    if (!validateForm()) return;

    setIsRegistering(true);
    try {
      // 1. Create user account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Update user profile with full name
      await updateProfile(user, { displayName: fullName });
      
      // 3. Prepare driver's license image data
      let licenseData = null;
      try {
        licenseData = await prepareLicenseData();
        if (!licenseData) {
          console.log('License image preparation failed, continuing without image');
        }
      } catch (imageError) {
        console.error('License image preparation error:', imageError);
        // Continue without the image
      }
      
      // 4. Prepare driver data
      const driverData = {
        uid: user.uid,
        fullName,
        email,
        vehicleNumber,
        vehicleType: vehicleTypes.find(vt => vt.value === vehicleType)?.label || vehicleType,
        role: 'driver',
        status: 'pending', // Requires admin approval
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add license data if available
      if (licenseData) {
        driverData.licenseImage = licenseData.licenseImage;
        driverData.licenseImageType = licenseData.licenseImageType;
        driverData.licenseImageSize = licenseData.licenseImageSize;
        driverData.licenseUploadedAt = licenseData.uploadedAt;
        console.log('✅ License image data added to driver document');
      } else {
        console.log('⚠️ No license image data available');
      }
      
      // Add courier info if applicable - ensure courier ID is saved correctly
      if (userType === 'courier' && company) {
        const selectedCourier = courierCompanies.find(c => c.value === company);
        driverData.courierId = company;
        driverData.courierName = selectedCourier?.label || '';
        driverData.userType = 'courier';
        
        // Add this to ensure we can query by courierId later
        console.log(`Associating driver with courier: ${company} - ${selectedCourier?.label || 'Unknown'}`);
      } else {
        driverData.userType = 'individual';
      }
      
      // 5. Store in Firestore
      const driverRef = await addDoc(collection(db, 'drivers'), driverData);
      console.log('Driver document created with ID:', driverRef.id);
      
      // 6. Navigate to success screen or home
      Alert.alert(
        'Registration Successful',
        licenseData 
          ? 'Your account has been created with license image. Please wait for admin approval before you can start accepting deliveries.'
          : 'Your account has been created. Please upload your license image later and wait for admin approval.',
        [{ text: 'OK', onPress: () => navigation.navigate('DriverHome') }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to create your account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please try logging in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Please use a stronger password (at least 6 characters).';
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-white px-6 py-10">
      <Text className="text-2xl font-bold mb-1 text-black">Registering you as a</Text>
      <Text className="text-2xl font-bold mb-6 text-black">driver,</Text>

      <TextInput
        placeholder="Vehicle Number"
        value={vehicleNumber}
        onChangeText={setVehicleNumber}
        className="border border-gray-300 rounded-[20px] px-4 py-5 mb-4  bg-white"
      />

      <View className="mb-4">
        <Dropdown
          data={vehicleTypes}
          labelField="label"
          valueField="value"
          placeholder="Select Vehicle Type"
          value={vehicleType}
          onChange={item => setVehicleType(item.value)}
          style={{
            height: 55,
            borderRadius: 20,
            paddingHorizontal: 14,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#ccc'
          }}
          placeholderStyle={{ color: '#888' }}
          selectedTextStyle={{ color: '#000' }}
        />
      </View>

      <View className="flex-row mb-4">
        <TouchableOpacity
          onPress={() => setUserType('courier')}
          className={`flex-1 rounded-[20px] py-5 mr-2 ${userType === 'courier' ? 'bg-blue-800' : 'bg-white border border-gray-300'}`}>
          <Text className={`text-center ${userType === 'courier' ? 'text-white font-semibold' : 'text-black'}`}>Courier Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setUserType('individual')}
          className={`flex-1 rounded-[20px] py-5 ${userType === 'individual' ? 'bg-blue-800' : 'bg-white border border-gray-300'}`}>
          <Text className={`text-center ${userType === 'individual' ? 'text-white font-semibold' : 'text-black'}`}>Individual</Text>
        </TouchableOpacity>
      </View>

      {userType === 'courier' && (
        <View className="mb-4">
          {loading ? (
            <View className="h-14 border border-gray-300 rounded-[20px] justify-center items-center">
              <ActivityIndicator color="#1e40af" />
            </View>
          ) : error ? (
            <View className="h-14 border border-gray-300 rounded-[20px] justify-center items-center">
              <Text className="text-red-500">{error}</Text>
              <TouchableOpacity onPress={fetchCourierCompanies}>
                <Text className="text-blue-500 mt-1">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Dropdown
              data={courierCompanies}
              className="py-5"
              labelField="label"
              valueField="value"
              placeholder="Select your company"
              value={company}
              onChange={item => setCompany(item.value)}
              style={{ height: 55, borderRadius: 20, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }}
              placeholderStyle={{ color: '#888' }}
              selectedTextStyle={{ color: '#000' }}
              search
              searchPlaceholder="Search..."
            />
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={pickImage}
        className="border border-gray-300 rounded-[20px] py-6 mb-4 justify-center items-center">
        {licenseImage ? (
          <Image source={{ uri: licenseImage.uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
        ) : (
          <>
            <Image
              source={require('../assets/icon/upload.png')}
              style={{ width: 40, height: 40, tintColor: 'gray' }}
              resizeMode="contain"
            />
            <Text className="text-gray-600 mt-2">Upload your driver's license here</Text>
          </>
        )}
      </TouchableOpacity>

      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => setAgreed(!agreed)} className="w-5 h-5 border border-gray-400 mr-2 justify-center items-center">
          {agreed && <View className="w-3 h-3 bg-blue-800 rounded-sm" />}
        </TouchableOpacity>
        <Text className="text-xs text-gray-500">
          By creating account you agree to our{' '}
          <Text className="text-red-400 font-semibold">Terms and conditions</Text>
        </Text>
      </View>

      <TouchableOpacity 
        className="bg-blue-800 py-4 rounded-[20px]"
        onPress={handleRegistration}
        disabled={isRegistering}
      >
        <Text className="text-white text-center font-bold text-base">
          {isRegistering ? 'Creating Account...' : 'Continue'}
        </Text>
      </TouchableOpacity>
      
      {isRegistering && (
        <ActivityIndicator color="#1e40af" style={{ marginTop: 10 }} />
      )}
    </ScrollView>
  );
};

export default Register;
