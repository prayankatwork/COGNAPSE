import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface UserProfile {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  inventory: string;
  useInventory: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isReady: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isReady: false,
  signIn: async () => {},
  logOut: async () => {},
  updateProfile: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'profile'));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as UserProfile);
          } else {
            setProfile({ 
              inventory: '', 
              useInventory: false,
              openness: 50,
              conscientiousness: 50,
              extraversion: 50,
              agreeableness: 50,
              neuroticism: 50
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/settings/profile`);
        }
      } else {
        setProfile(null);
      }
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateProfile = async (newProfileData: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updatedProfile = { ...profile, ...newProfileData } as UserProfile;
      await setDoc(doc(db, 'users', user.uid, 'settings', 'profile'), updatedProfile, { merge: true });
      setProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/settings/profile`);
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, isReady, signIn, logOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
