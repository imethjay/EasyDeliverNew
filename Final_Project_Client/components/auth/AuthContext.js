import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/init';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile data from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const profileData = userDocSnap.data();
        setUserProfile(profileData);
        console.log('User profile loaded:', profileData);
        return profileData;
      } else {
        console.log('No user profile found in Firestore');
        setUserProfile(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user profile data when user is authenticated
        await fetchUserProfile(user.uid);
      } else {
        // Clear profile data when user logs out
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, userProfile = null) => {
    try {
      console.log('Attempting to sign up with:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signup successful:', userCredential.user);
      
      // If user profile data is provided, store it in Firestore
      if (userProfile && userCredential.user) {
        const userDoc = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userProfile.name,
          mobile: userProfile.mobile,
          address: userProfile.address,
          city: userProfile.city,
          zipCode: userProfile.zipCode,
          userType: 'customer', // Default user type for mobile app users
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
        console.log('User profile saved to Firestore');
        
        // Set the profile data locally
        setUserProfile(userDoc);
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Signup error:', {
        code: error.code,
        message: error.message,
        email: email,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Profile will be fetched automatically by onAuthStateChanged
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', {
        code: error.code,
        message: error.message,
        email: email,
        timestamp: new Date().toISOString()
      });
      
      // Provide more user-friendly error messages
      switch (error.code) {
        case 'auth/invalid-credential':
          throw new Error('Invalid email or password');
        case 'auth/user-not-found':
          throw new Error('No account found with this email');
        case 'auth/wrong-password':
          throw new Error('Incorrect password');
        case 'auth/too-many-requests':
          throw new Error('Too many failed attempts. Please try again later');
        default:
          throw new Error('An error occurred during login. Please try again');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear profile data
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Function to update user profile
  const updateUserProfile = async (profileData) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userDocRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };

      await setDoc(userDocRef, updatedData, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updatedData }));
      console.log('User profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
