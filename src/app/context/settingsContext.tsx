'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { GradeSettings, ADMIN_EMAIL } from '../types/system';
import { useAuthContext } from './authContext';

interface SettingsContextProps {
  gradeLoadingEnabled: boolean;
  toggleGradeLoading: () => Promise<void>;
  isMainAdmin: boolean;
}

const SettingsContext = createContext<SettingsContextProps | null>(null);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider');
  return ctx;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, uid } = useAuthContext();
  const [gradeLoadingEnabled, setGradeLoadingEnabled] = useState(false);

  const isMainAdmin = user?.role === 1; // Cualquier administrador puede cambiar el estado

  // Debug: verificar permisos
  useEffect(() => {
    console.log('👤 Usuario actual:', {
      email: user?.mail,
      role: user?.role,
      roleLabel: user?.role === 1 ? 'Administrador' : user?.role,
      isMainAdmin: isMainAdmin
    });
  }, [user, isMainAdmin]);

  useEffect(() => {
    const docRef = doc(db, 'system', 'settings');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        const enabled = data.gradesLoadingEnabled ?? false;
        console.log('📡 Estado actualizado desde Firebase:', enabled);
        setGradeLoadingEnabled(enabled);
      } else {
        // Si el documento no existe, crear uno con valores por defecto
        console.log('📝 Creando documento de configuración con valor por defecto');
        setDoc(docRef, {
          gradesLoadingEnabled: false,
        }).catch(console.error);
      }
    });
    return () => unsub();
  }, []);

  const toggleGradeLoading = async () => {
    // Verificar que es administrador (role === 1)
    if (!uid || user?.role !== 1) {
      console.warn('No se tiene permiso para cambiar el estado:', { uid, role: user?.role });
      return;
    }

    try {
      const docRef = doc(db, 'system', 'settings');
      const newValue = !gradeLoadingEnabled;
      
      console.log('🔄 Cambiando estado de carga de notas a:', newValue);
      
      await setDoc(docRef, {
        gradesLoadingEnabled: newValue,
        enabledBy: uid,
        enabledAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });

      console.log('✅ Estado actualizado correctamente en Firebase');
    } catch (error) {
      console.error('❌ Error al actualizar el estado:', error);
      throw error;
    }
  };

  const value = {
    gradeLoadingEnabled,
    toggleGradeLoading,
    isMainAdmin,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

