'use client';

import React, { useState, useMemo } from 'react';
import { Subject } from '@/app/types/subject';
import { User } from '@/app/types/user';
import { HiTrash, HiClock, HiUsers, HiPlus, HiCheck } from 'react-icons/hi';
import { DayLabels } from '@/app/types/schedule';
import { CourseDivision } from '@/app/types/user';

interface SubjectDetailProps {
  subject: Subject;
  teacher?: User;
  teachers: User[];
  students: User[];
  assignedStudents: User[];
  schedules: Array<{
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classroom?: string;
  }>;
  totalStudentsInCourse: number;
  onAssignTeacher: (teacherUid: string) => void;
  onSelectStudents: () => void;
  onAssignAllStudents: () => void;
  onRemoveStudent: (studentUid: string) => void;
  onDeleteSubject: () => void;
  onBack: () => void;
}

export const SubjectDetail: React.FC<SubjectDetailProps> = ({
  subject,
  teacher,
  teachers,
  students,
  assignedStudents,
  schedules,
  totalStudentsInCourse,
  onAssignTeacher,
  onSelectStudents,
  onAssignAllStudents,
  onRemoveStudent,
  onDeleteSubject,
  onBack,
}) => {
  const [selectedTeacherUid, setSelectedTeacherUid] = useState<string>('');

  const getCourseLabel = (courseLevel: number) => {
    const courseLabels: Record<number, string> = {
      1: '1°',
      2: '2°',
      3: '3°',
      4: '4°',
      5: '5°',
      6: '6°',
      7: '7°',
    };
    return courseLabels[courseLevel] || `${courseLevel}°`;
  };

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const teacherUid = e.target.value;
    if (teacherUid) {
      setSelectedTeacherUid('');
      onAssignTeacher(teacherUid);
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
            {subject.name}
          </h1>
          <p className="text-lg text-gray-600">
            {getCourseLabel(subject.courseLevel)}
            {subject.courseDivision && ` ${subject.courseDivision}`}
          </p>
        </div>
        <button
          onClick={onDeleteSubject}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar materia"
        >
          <HiTrash className="w-6 h-6" />
        </button>
      </div>

      {/* Tags de resumen */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            teacher
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {teacher ? 'Docente asignado' : 'Sin docente'}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
          Alumnos: {assignedStudents.length}/{totalStudentsInCourse}
        </span>
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
          Horarios: {schedules.length}
        </span>
        {subject.catedrasHours > 0 && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            Horas cátedra: {subject.catedrasHours}
          </span>
        )}
      </div>

      {/* Docente Asignado */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Docente Asignado
        </h2>
        {teacher ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{teacher.name}</p>
                {teacher.mail && (
                  <p className="text-sm text-gray-600 mt-1">{teacher.mail}</p>
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
            <p className="text-sm text-orange-600 mb-3">No hay docente asignado</p>
            <select
              value={selectedTeacherUid}
              onChange={handleTeacherChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Seleccionar docente</option>
              {teachers.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Horarios de Clase */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HiClock className="w-5 h-5" />
          Horarios de Clase
        </h2>
        {schedules.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">No hay horarios configurados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule, idx) => (
              <div
                key={schedule.id || idx}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {DayLabels[schedule.dayOfWeek as keyof typeof DayLabels]}{' '}
                      {schedule.startTime} - {schedule.endTime}
                    </p>
                    {schedule.classroom && (
                      <p className="text-sm text-gray-600 mt-1">
                        Aula: {schedule.classroom}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
