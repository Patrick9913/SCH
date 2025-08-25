'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {User,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "firebase/auth";
import { auth } from "../config";

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
  if (context === undefined) {
    throw new Error("useAuthContext debe usarse dentro de AuthContextProvider");
  }
  return context;
};

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  console.log(uid)

  // Escuchar cambios en el estado del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setUid(user ? user.uid : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Función para loguear
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Función para cerrar sesión
  const logout = async () => {
    await signOut(auth);
  };

  // Valores del contexto
  const authValues: AuthProps = {
    user,
    uid,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authValues}>
        {children}
    </AuthContext.Provider>
  )
};
