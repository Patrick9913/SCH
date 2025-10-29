'use client';

import React from 'react';
import { User } from '@/app/types/user';
import { Grade, Period, GradeValue } from '@/app/types/grade';
import { Assignments, UserCurses } from '@/app/types/user';
import { useAttendance } from '@/app/context/attendanceContext';
import { useSubjects } from '@/app/context/subjectContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import '../../styles/bulletin.css';

interface BulletinTemplateProps {
  student: User;
  grades: Grade[];
  period: Period;
  courseLevel: number;
  teacherName?: string;
  schoolYear?: string;
  date?: string;
}

export const BulletinTemplate: React.FC<BulletinTemplateProps> = ({
  student,
  grades,
  period,
  courseLevel,
  teacherName = "Profesor Asignado",
  schoolYear = new Date().getFullYear().toString(),
  date = new Date().toLocaleDateString('es-ES')
}) => {
  const { records } = useAttendance();
  const { subjects, getTeacherOfSubject } = useSubjects();
  const { users } = useTriskaContext();

  // Obtener calificaciones del estudiante para el período específico
  const studentGrades = grades.filter(g => 
    g.studentUid === student.uid && 
    g.courseLevel === courseLevel &&
    g.published
  );

  // Agrupar calificaciones por materia
  const gradesBySubject = studentGrades.reduce((acc, grade) => {
    if (!acc[grade.subjectId]) {
      acc[grade.subjectId] = {} as Partial<Record<Period, GradeValue>>;
    }
    acc[grade.subjectId][grade.period] = grade.grade;
    return acc;
  }, {} as Record<number, Partial<Record<Period, GradeValue>>>);

  // Obtener estadísticas de asistencia del estudiante
  const studentAttendance = records.filter(r => r.studentUid === student.uid);
  const absences = studentAttendance.filter(r => r.status === 'absent').length;
  const delays = studentAttendance.filter(r => r.status === 'late').length;
  
  // Obtener estadísticas por período si es necesario
  const currentPeriodAttendance = studentAttendance.filter(r => {
    // Aquí podrías filtrar por período si tienes esa información en los registros
    return true; // Por ahora mostramos todas las asistencias
  });

  // Obtener el profesor principal del curso
  const getMainTeacherName = () => {
    // Buscar el primer profesor asignado a cualquier materia del curso
    const courseSubjects = subjects.filter(s => s.courseLevel === courseLevel);
    if (courseSubjects.length > 0) {
      const teacherUid = courseSubjects[0].teacherUid;
      const teacher = users.find(u => u.uid === teacherUid);
      return teacher?.name || teacherName;
    }
    return teacherName;
  };

  const mainTeacherName = getMainTeacherName();

  // Función para obtener el nombre de la materia
  const getSubjectName = (subjectId: number) => {
    return Assignments[subjectId as keyof typeof Assignments] || `Materia ${subjectId}`;
  };

  // Función para obtener el nombre del curso
  const getCourseName = (courseLevel: number) => {
    return UserCurses[courseLevel as keyof typeof UserCurses] || `Curso ${courseLevel}`;
  };

  // Función para obtener la calificación de un período específico
  const getGradeForPeriod = (subjectId: number, period: Period): GradeValue | string => {
    return gradesBySubject[subjectId]?.[period] || '-';
  };

  return (
    <div className="bulletin-template bg-white p-8 max-w-4xl mx-auto print:p-6 print:max-w-none">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 print:text-2xl">
          BOLETÍN DE NOTAS
        </h1>
        <p className="text-sm text-gray-600 print:text-xs">
          Sistema de Gestión Académica
        </p>
      </div>

      {/* Información del Estudiante */}
      <div className="grid grid-cols-2 gap-4 mb-8 print:gap-2">
        <div className="space-y-4 print:space-y-2">
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              NOMBRE:
            </label>
            <div className="text-gray-900 font-semibold print:text-sm">
              {student.name}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              GRADO:
            </label>
            <div className="text-gray-900 print:text-sm">
              {getCourseName(courseLevel)}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              PROFESOR:
            </label>
            <div className="text-gray-900 print:text-sm">
              {mainTeacherName}
            </div>
          </div>
        </div>
        
        <div className="space-y-4 print:space-y-2">
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              AÑO ESCOLAR:
            </label>
            <div className="text-gray-900 print:text-sm">
              {schoolYear}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              TRIMESTRE:
            </label>
            <div className="text-gray-900 print:text-sm">
              {period === 'primer_cuatrimestre' ? 'Primer Trimestre' :
               period === 'segundo_cuatrimestre' ? 'Segundo Trimestre' :
               period === 'tercer_cuatrimestre' ? 'Tercer Trimestre' : period}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              FECHA:
            </label>
            <div className="text-gray-900 print:text-sm">
              {date}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Calificaciones */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-400 print:border-gray-800">
          <thead>
            <tr className="bg-gray-600 text-white print:bg-gray-800">
              <th className="border border-gray-400 p-3 text-left font-bold print:p-2 print:text-sm">
                ASIGNATURA
              </th>
              <th className="border border-gray-400 p-3 text-center font-bold print:p-2 print:text-sm">
                NOTAS E1
              </th>
              <th className="border border-gray-400 p-3 text-center font-bold print:p-2 print:text-sm">
                NOTAS E2
              </th>
              <th className="border border-gray-400 p-3 text-center font-bold print:p-2 print:text-sm">
                NOTAS E3
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(Assignments)
              .filter(([key, value]) => !isNaN(Number(value)))
              .map(([subjectName, subjectId]) => (
                <tr key={subjectId} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="border border-gray-400 p-3 font-medium print:p-2 print:text-sm">
                    {subjectName}
                  </td>
                  <td className="border border-gray-400 p-3 text-center print:p-2 print:text-sm">
                    {getGradeForPeriod(Number(subjectId), 'primer_cuatrimestre')}
                  </td>
                  <td className="border border-gray-400 p-3 text-center print:p-2 print:text-sm">
                    {getGradeForPeriod(Number(subjectId), 'segundo_cuatrimestre')}
                  </td>
                  <td className="border border-gray-400 p-3 text-center print:p-2 print:text-sm">
                    {getGradeForPeriod(Number(subjectId), 'tercer_cuatrimestre')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Sección de Asistencia y Disciplina */}
      <div className="grid grid-cols-2 gap-4 mb-8 print:gap-2">
        <div className="space-y-4 print:space-y-2">
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              AUSENCIAS:
            </label>
            <div className="text-gray-900 print:text-sm">
              {absences}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              FALTAS ANTICIPADAS:
            </label>
            <div className="text-gray-900 print:text-sm">
              0
            </div>
          </div>
        </div>
        
        <div className="space-y-4 print:space-y-2">
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              RETRASOS:
            </label>
            <div className="text-gray-900 print:text-sm">
              {delays}
            </div>
          </div>
          <div className="border border-gray-300 p-3 print:p-2">
            <label className="block text-sm font-medium text-gray-700 mb-1 print:text-xs">
              SANCIONES:
            </label>
            <div className="text-gray-900 print:text-sm">
              0
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end text-xs text-gray-600 print:text-xs">
        <div className="space-y-1">
          <div>www.sistemaacademico.com</div>
          <div>Campus Virtual</div>
          <div>Sistema de Gestión Académica</div>
        </div>
        <div className="border border-gray-300 p-2 text-center print:border-gray-800">
          <div className="text-gray-500 print:text-gray-800">LOGO</div>
        </div>
      </div>
    </div>
  );
};
