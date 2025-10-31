'use client';

import React, { useMemo, useState } from 'react';
import { IoPeople } from 'react-icons/io5';
import { useAuthContext } from '@/app/context/authContext';
import { useSubjects } from '@/app/context/subjectContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { UserCurses } from '@/app/types/user';

export const MyStudents: React.FC = () => {
  const { user } = useAuthContext();
  const { getStudentsByTeacher, getSubjectsByTeacher } = useSubjects();
  const { users } = useTriskaContext();

  const isTeacher = user?.role === 4;
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'all'>('all'); // Cambiar a string para usar ID de Firestore

  const subjects = useMemo(() => {
    if (!user?.uid) return [];
    const teacherSubjects = getSubjectsByTeacher(user.uid);
    // Ordenar: primero por nombre de materia (alfabético), luego por curso (numérico), luego por división (A, B, C)
    return [...teacherSubjects].sort((a, b) => {
      // 1. Ordenar por nombre de materia
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      // 2. Si tienen el mismo nombre, ordenar por curso
      if (a.courseLevel !== b.courseLevel) {
        return a.courseLevel - b.courseLevel;
      }
      // 3. Si tienen el mismo curso, ordenar por división (A antes que B, etc.)
      const divA = a.courseDivision || '';
      const divB = b.courseDivision || '';
      return divA.localeCompare(divB);
    });
  }, [user, getSubjectsByTeacher]);

  const allStudents = useMemo(() => {
    if (!user?.uid || !isTeacher) return [];
    return getStudentsByTeacher(user.uid);
  }, [user, isTeacher, getStudentsByTeacher]);

  const filteredStudents = useMemo(() => {
    if (selectedSubjectId === 'all') return allStudents;
    // Buscar por ID de Firestore (s.id) en lugar de subjectId para distinguir divisiones
    const subj = subjects.find(s => s.id === selectedSubjectId);
    if (!subj) return [];
    const uids = new Set(subj.studentUids || []);
    return users.filter(u => u.role === 3 && uids.has(u.uid));
  }, [selectedSubjectId, allStudents, subjects, users]);

  const getCourseName = (courseLevel?: number) => {
    if (!courseLevel) return 'Sin curso';
    return (
      Object.keys(UserCurses).find(k => UserCurses[k as keyof typeof UserCurses] === courseLevel) || 'Sin curso'
    );
  };

  return (
    <section className="flex-1 p-6 overflow-y-auto max-h-screen h-full bg-white">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <IoPeople className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Mis Alumnos</h1>
        </div>
        <p className="text-sm text-gray-500">Lista consolidada de estudiantes asignados a tus materias.</p>
      </div>

      {/* Filtro por materia */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Filtrar por Materia</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-gray-500">No tienes materias asignadas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubjectId('all')}
              className={`px-3 py-1 rounded-full text-sm border ${selectedSubjectId === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-gray-700'}`}
            >
              Todos ({allStudents.length})
            </button>
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)} // Usar ID de Firestore para distinguir divisiones
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-2 ${selectedSubjectId === s.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-gray-700 border-gray-300'}`}
                title={`${s.name} • ${getCourseName(s.courseLevel)}${s.courseDivision ? ` - División ${s.courseDivision}` : ''}`}
              >
                <span>{s.name}</span>
                <span className="font-semibold">
                  {getCourseName(s.courseLevel)}
                  {s.courseDivision && <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${selectedSubjectId === s.id ? 'bg-blue-300 text-blue-900' : 'bg-blue-200 text-blue-800'}`}>
                    {s.courseDivision}
                  </span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listado de estudiantes */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Estudiantes ({filteredStudents.length})</h2>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay estudiantes asignados a tus materias.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {filteredStudents.map(st => (
              <div key={st.uid} className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{st.name}</p>
                  {st.mail && <p className="text-sm text-gray-600">{st.mail}</p>}
                </div>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {getCourseName(st.level)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};


