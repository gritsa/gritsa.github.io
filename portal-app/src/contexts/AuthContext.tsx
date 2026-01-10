import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const initializeDefaultAdmin = async () => {
    try {
      // Check if default admin exists
      const adminEmail = 'admin@gritsa.com';
      const adminPassword = '123@gritsa';

      // Try to create the admin user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);

        // Create admin user document
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: adminEmail,
          role: 'Administrator' as UserRole,
          displayName: 'Default Admin',
          profileCompleted: true,
          createdAt: serverTimestamp(),
        });

        console.log('Default admin user created successfully');
      } catch (error: any) {
        // Admin already exists, which is fine
        if (error.code !== 'auth/email-already-in-use') {
          console.error('Error creating default admin:', error);
        }
      }
    } catch (error) {
      console.error('Error initializing default admin:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const data = await fetchUserData(user);
        setUserData(data);

        // If user doesn't have a document and has gritsa.com email, create employee record
        if (!data && user.email?.endsWith('@gritsa.com')) {
          const newUserData: Partial<User> = {
            uid: user.uid,
            email: user.email,
            role: 'Employee',
            profileCompleted: false,
            createdAt: serverTimestamp() as any,
          };

          await setDoc(doc(db, 'users', user.uid), newUserData);
          setUserData(newUserData as User);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    // Initialize default admin on app start
    initializeDefaultAdmin();

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const refreshUserData = async () => {
    if (currentUser) {
      const data = await fetchUserData(currentUser);
      setUserData(data);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signIn,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
