// Script para verificar la conexión a Firebase
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Probando conexión a Firebase...');
    
    // Intentar leer el documento de configuración
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ Documento existe:', docSnap.data());
    } else {
      console.log('⚠️ Documento no existe, creando...');
      
      // Intentar crear el documento
      await setDoc(docRef, {
        gradesLoadingEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        testConnection: true
      });
      
      console.log('✅ Documento creado exitosamente');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error en conexión Firebase:', error);
    console.error('Código de error:', error.code);
    console.error('Mensaje:', error.message);
    return false;
  }
};
