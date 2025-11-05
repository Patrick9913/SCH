'use client';

import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/config';
import { useAuthContext } from '@/app/context/authContext';
import { useRouter } from 'next/navigation';

interface UserCheck {
  documentId: string;
  uidField: string | undefined;
  name: string;
  role: number;
  mail: string;
  needsUpdate: boolean;
  fixed?: boolean;
  error?: string;
}

export default function VerifyUsersPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserCheck[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    inconsistencies: number;
    fixed: number;
  } | null>(null);

  // Verificar que el usuario sea Admin o SuperAdmin
  if (!user || (user.role !== 1 && user.role !== 7)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 mb-4">
            Solo los administradores pueden acceder a esta página.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const verifyAndFixUsers = async () => {
    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      console.log('🔍 Iniciando verificación de UIDs de usuarios...');
      
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const checks: UserCheck[] = [];
      let inconsistenciesFound = 0;
      let fixed = 0;

      console.log(`📊 Total de usuarios en Firestore: ${snapshot.size}`);

      // Verificar cada usuario
      for (const userDoc of snapshot.docs) {
        const documentId = userDoc.id;
        const userData = userDoc.data();
        const uidField = userData.uid as string | undefined;

        const needsUpdate = !uidField || uidField !== documentId;

        const check: UserCheck = {
          documentId,
          uidField,
          name: userData.name || 'Sin nombre',
          role: userData.role,
          mail: userData.mail || 'Sin email',
          needsUpdate,
        };

        if (needsUpdate) {
          inconsistenciesFound++;
          console.log(`❌ INCONSISTENCIA: ${userData.name}`);
          console.log(`   DocumentID: ${documentId}`);
          console.log(`   Campo uid: ${uidField || 'undefined'}`);

          // Corregir automáticamente
          try {
            await updateDoc(doc(db, 'users', documentId), {
              uid: documentId
            });
            check.fixed = true;
            fixed++;
            console.log(`   ✅ CORREGIDO`);
          } catch (error) {
            check.fixed = false;
            check.error = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ ERROR al corregir:`, error);
          }
        }

        checks.push(check);
      }

      setResults(checks);
      setSummary({
        total: snapshot.size,
        inconsistencies: inconsistenciesFound,
        fixed,
      });

      console.log('✅ Verificación completada');
    } catch (error) {
      console.error('❌ Error durante la verificación:', error);
      alert('Error al verificar usuarios: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔍 Verificar y Corregir UIDs de Usuarios
          </h1>
          <p className="text-gray-600 mb-6">
            Este script verifica que todos los usuarios tengan el campo <code className="bg-gray-100 px-2 py-1 rounded">uid</code> igual al <code className="bg-gray-100 px-2 py-1 rounded">documentID</code> en Firestore.
            Si encuentra inconsistencias, las corregirá automáticamente.
          </p>

          <button
            onClick={verifyAndFixUsers}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Verificando y corrigiendo...' : 'Iniciar Verificación'}
          </button>
        </div>

        {/* Resumen */}
        {summary && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Resumen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Total de Usuarios</p>
                <p className="text-3xl font-bold text-blue-800">{summary.total}</p>
              </div>
              <div className={`${
                summary.inconsistencies > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              } border rounded-lg p-4`}>
                <p className={`text-sm font-medium ${
                  summary.inconsistencies > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Inconsistencias Encontradas
                </p>
                <p className={`text-3xl font-bold ${
                  summary.inconsistencies > 0 ? 'text-red-800' : 'text-green-800'
                }`}>
                  {summary.inconsistencies}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Corregidos</p>
                <p className="text-3xl font-bold text-green-800">{summary.fixed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Resultados */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">📋 Detalles de Usuarios</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campo UID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={index} className={result.needsUpdate ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.mail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {result.documentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {result.uidField || <span className="text-red-500">undefined</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!result.needsUpdate ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            ✅ OK
                          </span>
                        ) : result.fixed ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            ✅ Corregido
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            ❌ Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}

