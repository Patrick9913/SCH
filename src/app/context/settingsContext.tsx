'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config';
import { GradeSettings, ADMIN_EMAIL } from '../types/system';
import { useAuthContext } from './authContext';
import { hasPermission } from '@/app/utils/rolePermissions';
import toast from 'react-hot-toast';

interface SettingsContextProps {
  gradeLoadingEnabled: boolean;
  toggleGradeLoading: () => Promise<void>;
  isMainAdmin: boolean;
  isConnected: boolean;
  lastUpdated?: number;
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
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const previousValue = useRef<boolean | null>(null); // null = no inicializado
  const previousUpdated = useRef<number>(0); // Para detectar nuevas actualizaciones
  const isInitialized = useRef<boolean>(false); // Para saber si ya se inicializó

  const isMainAdmin = hasPermission(user?.role, 'canAccessAdminPanel');
  
  // Verificar si el usuario puede gestionar calificaciones
  const canManageGrades = hasPermission(user?.role, 'canCreateGrades');

  // Función para probar la conexión a Firebase
  const testFirebaseConnection = async () => {
    try {
      const docRef = doc(db, 'system', 'settings');
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('❌ Error en prueba de conexión:', error);
      return false;
    }
  };

  useEffect(() => {
    // Solo suscribirse si el usuario tiene permisos o si no hay usuario aún (para cargar estado inicial)
    const docRef = doc(db, 'system', 'settings');
    
    let unsub: (() => void) | undefined;
    
    try {
      unsub = onSnapshot(
        docRef, 
        (snap) => {
          setIsConnected(true);
          
          if (snap.exists()) {
            const data = snap.data() as any;
            const enabled = data.gradesLoadingEnabled ?? false;
            const updated = data.updatedAt ?? Date.now();
            
            // Detectar si cambió el valor
            const hasValueChanged = previousValue.current !== null && enabled !== previousValue.current;
            const isNewUpdate = updated !== previousUpdated.current;
            
            // Actualizar el estado SIEMPRE
            setGradeLoadingEnabled(enabled);
            setLastUpdated(updated);
            
            // Mostrar notificación solo si:
            // 1. Ya se inicializó (no es la primera carga)
            // 2. El valor cambió
            // 3. Es una actualización nueva
            // 4. El usuario puede gestionar calificaciones
            if (isInitialized.current && hasValueChanged && isNewUpdate && canManageGrades && user?.uid) {
              if (enabled) {
                toast.success('¡La carga de notas está disponible!', {
                  duration: 5000,
                  icon: '📝',
                  style: {
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '16px',
                  },
                });
              } else {
                toast('La carga de notas ha sido deshabilitada', {
                  duration: 5000,
                  icon: '⏸️',
                  style: {
                    background: '#f59e0b',
                    color: '#ffffff',
                    fontSize: '16px',
                  },
                });
              }
            }
            
            // Actualizar referencias para la próxima comparación
            previousValue.current = enabled;
            previousUpdated.current = updated;
            isInitialized.current = true;
            
          } else {
            // Si el documento no existe, establecer valores por defecto localmente
            setGradeLoadingEnabled(false);
            setLastUpdated(Date.now());
            isInitialized.current = true;
            
            // Solo intentar crear si el usuario es admin
            if (hasPermission(user?.role, 'canManageSettings') && user?.uid) {
              setDoc(docRef, {
                gradesLoadingEnabled: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }).catch((error) => {
                // Error silencioso - no es crítico si no se puede crear
                console.warn('No se pudo crear documento de configuración:', error);
              });
            }
          }
        },
        (error) => {
          // Solo loguear errores no relacionados con permisos
          if (error.code !== 'permission-denied') {
            console.error('❌ Error en listener de configuración:', error);
          }
          setIsConnected(false);
          // Establecer valores por defecto en caso de error
          setGradeLoadingEnabled(false);
          setLastUpdated(Date.now());
        }
      );
    } catch (error) {
      console.error('❌ Error al crear listener:', error);
      setIsConnected(false);
    }
    
    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [canManageGrades, user?.uid, user?.role]);

  const toggleGradeLoading = async () => {
    // Verificar que es administrador (role === 1)
    if (!uid || user?.role !== 1) {
      console.warn('No se tiene permiso para cambiar el estado:', { uid, role: user?.role });
      toast.error('No tienes permisos para realizar esta acción');
      return;
    }

    // Calcular el nuevo valor antes de intentar actualizar
    const newValue = !gradeLoadingEnabled;
    const timestamp = Date.now();
    
    console.log('🔄 Preparando cambio de estado:', {
      currentValue: gradeLoadingEnabled,
      newValue: newValue,
      timestamp: timestamp,
      uid: uid,
      userRole: user?.role
    });

    try {
      const docRef = doc(db, 'system', 'settings');
      
      console.log('🔄 Cambiando estado de carga de notas a:', newValue, 'con timestamp:', timestamp);
      console.log('🔄 Usuario:', { uid, role: user?.role, email: user?.mail });
      
      await setDoc(docRef, {
        gradesLoadingEnabled: newValue,
        updatedAt: timestamp,
        ...(gradeLoadingEnabled === undefined && { createdAt: timestamp }), // Solo agregar createdAt si no existe
      }, { merge: true });

      console.log('✅ Estado actualizado correctamente en Firebase con timestamp:', timestamp);
      
      // No mostrar notificación aquí porque ya la mostrará el Snapshot
      return;
    } catch (error: any) {
      console.error('❌ Error al actualizar el estado:', error);
      console.error('❌ Detalles del error:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        uid: uid,
        userRole: user?.role,
        newValue: newValue
      });
      
      // No cambiar el estado de conexión si falla la escritura
      const errorMessage = error?.code === 'permission-denied' 
        ? 'No tienes permisos para realizar esta acción'
        : error?.code === 'unavailable'
        ? 'Firebase no está disponible. Intenta de nuevo.'
        : error?.code === 'failed-precondition'
        ? 'Error de condición. Intenta de nuevo.'
        : `Error: ${error?.message || 'Error desconocido'}`;
        
      toast.error(errorMessage);
      // No re-lanzar el error para evitar que entre en el catch del componente
    }
  };

  const value = {
    gradeLoadingEnabled,
    toggleGradeLoading,
    isMainAdmin,
    isConnected,
    lastUpdated,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

