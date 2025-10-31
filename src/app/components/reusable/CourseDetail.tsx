'use client';

import React, { useState } from 'react';
import { Course } from '@/app/types/course';
import { User } from '@/app/types/user';
import { HiTrash, HiUsers, HiPlus, HiCheck } from 'react-icons/hi';

interface CourseDetailProps {
  course: Course;
  preceptor?: User;
  preceptors: User[];
  students: User[];
  assignedStudents: User[];
  onAssignPreceptor: (preceptorUid: string) => void;
  onSelectStudents: () => void;
  onAssignAllStudents: () => void;
  onRemoveStudent: (studentUid: string) => void;
  onDeleteCourse: () => void;
  onBack: () => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  preceptor,
  preceptors,
  students,
  assignedStudents,
  onAssignPreceptor,
  onSelectStudents,
  onAssignAllStudents,
  onRemoveStudent,
  onDeleteCourse,
  onBack,
}) => {
  const [selectedPreceptorUid, setSelectedPreceptorUid] = useState<string>('');

  const getCourseLabel = (level: number) => {
    const courseLabels: Record<number, string> = {
      1: '1°',
      2: '2°',
      3: '3°',
      4: '4°',
      5: '5°',
      6: '6°',
      7: '7°',
    };
    return courseLabels[level] || `${level}°`;
  };

  const handlePreceptorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preceptorUid = e.target.value;
    if (preceptorUid) {
      setSelectedPreceptorUid('');
      onAssignPreceptor(preceptorUid);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Volver al listado
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {getCourseLabel(course.level)} - División {course.division}
          </h1>
        </div>
        <button
          onClick={onDeleteCourse}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar curso"
        >
          <HiTrash className="w-6 h-6" />
        </button>
      </div>

      {/* Tags de resumen */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            preceptor
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {preceptor ? `Preceptor: ${preceptor.name}` : 'Sin preceptor'}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
          Alumnos: {assignedStudents.length}
        </span>
      </div>

      {/* Preceptor Asignado */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Preceptor Asignado
        </h2>
        {preceptor ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{preceptor.name}</p>
                {preceptor.mail && (
                  <p className="text-sm text-gray-600 mt-1">{preceptor.mail}</p>
                )}
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium flex items-center gap-1">
                <HiCheck className="w-4 h-4" />
                Asignado
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-orange-600 mb-3">No hay preceptor asignado</p>
            <select
              value={selectedPreceptorUid}
              onChange={handlePreceptorChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Seleccionar preceptor</option>
              {preceptors.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Estudiantes Asignados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Estudiantes Asignados ({assignedStudents.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onSelectStudents}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
            >
              <HiUsers className="w-4 h-4" />
              Seleccionar
            </button>
            <button
              onClick={onAssignAllStudents}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <HiPlus className="w-4 h-4" />
              Asignar Todos
            </button>
          </div>
        </div>
        {assignedStudents.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-orange-600">No hay estudiantes asignados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedStudents.map((student) => (
              <div
                key={student.uid}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{student.name}</p>
                  {student.mail && (
                    <p className="text-sm text-gray-600 mt-1">{student.mail}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveStudent(student.uid)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remover estudiante"
                >
                  <HiTrash className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
