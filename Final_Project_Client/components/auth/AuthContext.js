import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../../firebase/init';

const AuthContext = createContext(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password) => {
    try {
      console.log('Attempting to sign up with:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signup successful:', userCredential.user);
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
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
