'use client';

import React, { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { db } from "../config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { User } from "../types/user";
import CryptoJS from 'crypto-js';

interface AuthProps {
  user: User | null;
  uid: string | null; // Ahora será el id del documento
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

// Clave para hashear (en producción debería estar en variables de entorno)
const HASH_SECRET = process.env.NEXT_PUBLIC_HASH_SECRET || 'default-secret-key-change-in-production';

// Función para hashear password
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password + HASH_SECRET).toString();
};

// Función para verificar password
const verifyPassword = (inputPassword: string, hashedPassword: string): boolean => {
  // Si el password almacenado parece estar sin hashear (menos de 40 chars o muy corto), 
  // compararlo directamente con el input (para compatibilidad con usuarios antiguos)
  if (hashedPassword.length < 40 || hashedPassword === inputPassword) {
    // Probablemente un password sin hashear, comparar directamente
    return hashedPassword === inputPassword;
  } else {
    // Password ya hasheado, comparar hashes
    const hashedInput = hashPassword(inputPassword);
    return hashedInput === hashedPassword;
  }
};

const SESSION_STORAGE_KEY = 'sch_user_session';

export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión desde localStorage al iniciar
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionData) {
            const { userId } = JSON.parse(sessionData);
            // Verificar que el usuario todavía existe en Firestore
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              
              // Si el usuario está suspendido, cerrar sesión automáticamente
              if (userData.status === 'suspended') {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                setUser(null);
                setUid(null);
                return;
              }
              
              // Asegurar que uid sea igual a id (para compatibilidad)
              if (!userData.uid || userData.uid !== userData.id) {
                console.log('🔧 Corrigiendo uid del usuario:', {
                  documentId: userData.id,
                  uidAnterior: userData.uid,
                  uidNuevo: userData.id
                });
                userData.uid = userData.id;
                // Actualizar en Firestore si es necesario
                const { updateDoc } = await import("firebase/firestore");
                try {
                  await updateDoc(doc(db, "users", userId), { uid: userId });
                  console.log('✅ Campo uid actualizado en Firestore correctamente');
                } catch (error) {
                  console.error('❌ Error al actualizar campo uid en Firestore:', error);
                }
              }
              setUser(userData);
              setUid(userData.id);
            } else {
              // Usuario no existe, limpiar sesión
              localStorage.removeItem(SESSION_STORAGE_KEY);
              setUser(null);
              setUid(null);
            }
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setUser(null);
        setUid(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Marcar offline de manera best-effort cuando se cierra la pestaña
  useEffect(() => {
    if (!uid) return;
    const handleBeforeUnload = async () => {
      try {
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", uid), { online: false, lastOnlineAt: Date.now() });
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uid]);

  const login = async (email: string, password: string) => {
    try {
      // Buscar usuario por email en Firestore
      const q = query(collection(db, "users"), where("mail", "==", email.trim()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error("Credenciales incorrectas");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() } as User;

      // Bloquear si ya está online
      if ((userData as any).online === true) {
        const err: any = new Error('ALREADY_ONLINE');
        err.code = 'ALREADY_ONLINE';
        throw err;
      }

      // Verificar password
      if (!userData.password) {
        throw new Error("Usuario sin contraseña configurada. Contacta al administrador.");
      }

      // Verificar si el usuario está suspendido
      if (userData.status === 'suspended') {
        throw new Error("Cuenta suspendida. Comuníquese con su administrador.");
      }

      const isPasswordValid = verifyPassword(password, userData.password);
      if (!isPasswordValid) {
        throw new Error("Credenciales incorrectas");
      }

      // Si el password estaba sin hashear, hashearlo ahora y actualizar en Firestore
      const needsPasswordUpdate = userData.password.length < 40 || userData.password === password;
      const needsStatusUpdate = userData.status === 'pending';
      const needsUidUpdate = !userData.uid || userData.uid !== userData.id;
      
      if (needsPasswordUpdate || needsStatusUpdate || needsUidUpdate) {
        const { updateDoc } = await import("firebase/firestore");
        const updateData: any = {};
        
        if (needsPasswordUpdate) {
          updateData.password = hashPassword(password);
          console.log('🔐 Actualizando password hasheado');
        }
        
        if (needsStatusUpdate) {
          updateData.status = 'active';
          userData.status = 'active';
          console.log('✅ Activando usuario (status: pending → active)');
        }
        
        if (needsUidUpdate) {
          updateData.uid = userData.id;
          userData.uid = userData.id;
          console.log('🔧 Corrigiendo uid en login:', {
            documentId: userData.id,
            uidAnterior: userData.uid,
            uidNuevo: userData.id
          });
        }
        
        await updateDoc(doc(db, "users", userData.id), updateData);
        console.log('✅ Usuario actualizado correctamente en Firestore');
      }

      // Marcar usuario online
      {
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", userData.id), { online: true, lastOnlineAt: Date.now() });
      }

      // Guardar sesión en localStorage
      const sessionData = { userId: userData.id, timestamp: Date.now() };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

      // Actualizar estado
      setUser(userData);
      setUid(userData.id);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (uid) {
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", uid), { online: false, lastOnlineAt: Date.now() });
      }
    } catch {}
    // Limpiar todo el localStorage para no dejar referencias de la cuenta anterior
    localStorage.clear();
    setUser(null);
    setUid(null);
  };

  const authValues = {
    user,
    uid,
    loading,
    logout,
    login
  };

  return (
    <AuthContext.Provider value={authValues}>
      {children}
    </AuthContext.Provider>
  );
};
