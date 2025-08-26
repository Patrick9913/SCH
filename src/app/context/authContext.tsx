'use client';

import React, { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { User } from "../types/user";

interface AuthProps {
  user: User | null;
  uid: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthProps | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext debe usarse dentro de AuthContextProvider");
  return context;
};

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  console.log(user)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const currentUid = firebaseUser.uid;
        setUid(currentUid);

        // 🔍 Buscar en Firestore donde el campo "uid" == currentUid
        try {
          const q = query(collection(db, "users"), where("uid", "==", currentUid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data() as User;
            setUser(userData);
          } else {
            console.warn("No se encontró un usuario con ese UID.");
            setUser(null);
          }
        } catch (error) {
          console.error("Error al buscar usuario en Firestore:", error);
        }

      } else {
        // No autenticado
        setUid(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const authValues = {
    user,
    uid,
    loading,
    logout,
    login
  } 

  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};
