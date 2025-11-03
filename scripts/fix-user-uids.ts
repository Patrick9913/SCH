/**
 * Script para verificar y corregir inconsistencias entre documentID y campo uid
 * en la colección de usuarios de Firestore
 * 
 * USO:
 * 1. Asegúrate de tener las credenciales de Firebase configuradas
 * 2. Ejecuta: npx ts-node scripts/fix-user-uids.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Configuración de Firebase (usa las mismas credenciales de tu app)
const firebaseConfig = {
  // IMPORTANTE: Copia aquí tu configuración de Firebase desde src/app/config.ts
  // O ejecuta este script desde tu aplicación Next.js usando las variables de entorno
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface UserCheck {
  documentId: string;
  uidField: string | undefined;
  name: string;
  role: number;
  needsUpdate: boolean;
}

async function verifyAndFixUserUIDs() {
  console.log('🔍 Iniciando verificación de UIDs de usuarios...\n');

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const results: UserCheck[] = [];
    let inconsistenciesFound = 0;
    let fixed = 0;

    console.log(`📊 Total de usuarios en Firestore: ${snapshot.size}\n`);

    // Verificar cada usuario
    for (const userDoc of snapshot.docs) {
      const documentId = userDoc.id;
      const userData = userDoc.data();
      const uidField = userData.uid as string | undefined;

      const needsUpdate = !uidField || uidField !== documentId;

      results.push({
        documentId,
        uidField,
        name: userData.name || 'Sin nombre',
        role: userData.role,
        needsUpdate,
      });

      if (needsUpdate) {
        inconsistenciesFound++;
        console.log(`❌ INCONSISTENCIA DETECTADA:`);
        console.log(`   Nombre: ${userData.name}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   DocumentID: ${documentId}`);
        console.log(`   Campo uid: ${uidField || 'undefined'}`);
        console.log(`   Diferencia: ${!uidField ? 'Campo uid no existe' : 'DocumentID ≠ uid'}`);
        
        // Corregir automáticamente
        try {
          await updateDoc(doc(db, 'users', documentId), {
            uid: documentId
          });
          fixed++;
          console.log(`   ✅ CORREGIDO: uid actualizado a ${documentId}\n`);
        } catch (error) {
          console.error(`   ❌ ERROR al corregir:`, error);
          console.log('');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN:');
    console.log('='.repeat(60));
    console.log(`Total de usuarios verificados: ${snapshot.size}`);
    console.log(`Usuarios con inconsistencias: ${inconsistenciesFound}`);
    console.log(`Usuarios corregidos: ${fixed}`);
    console.log(`Usuarios correctos: ${snapshot.size - inconsistenciesFound}`);
    console.log('='.repeat(60) + '\n');

    if (inconsistenciesFound === 0) {
      console.log('✅ ¡Perfecto! Todos los usuarios tienen uid === documentID');
    } else if (fixed === inconsistenciesFound) {
      console.log('✅ Todas las inconsistencias fueron corregidas exitosamente');
    } else {
      console.log('⚠️ Algunas inconsistencias no pudieron ser corregidas');
    }

    // Mostrar tabla de usuarios
    console.log('\n📋 TABLA DE USUARIOS:');
    console.log('-'.repeat(100));
    console.log('Nombre'.padEnd(30) + 'Role'.padEnd(10) + 'DocumentID'.padEnd(30) + 'Estado');
    console.log('-'.repeat(100));
    
    results.forEach(user => {
      const status = user.needsUpdate ? '❌ CORREGIDO' : '✅ OK';
      console.log(
        user.name.padEnd(30) + 
        user.role.toString().padEnd(10) + 
        user.documentId.padEnd(30) + 
        status
      );
    });
    console.log('-'.repeat(100));

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

// Ejecutar el script
verifyAndFixUserUIDs()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

