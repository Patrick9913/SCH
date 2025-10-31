'use client';

import React, { useState, useMemo } from 'react';
import { useSchedule } from '@/app/context/scheduleContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Assignments, UserCurses } from '@/app/types/user';
import { DayLabels } from '@/app/types/schedule';
import { HiCalendar, HiPlus, HiX, HiClock, HiHome, HiUser, HiBookOpen } from 'react-icons/hi';
import { HiCheck } from 'react-icons/hi2';

export const Schedule: React.FC = () => {
  const { schedules, addSchedule } = useSchedule();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;
  const isFamily = user?.role === 5;
  
  // Obtener el estudiante relacionado si es Familia
  const relatedStudent = React.useMemo(() => {
    if (!user || !isFamily || !user.childId) return null;
    return users.find(u => u.uid === user.childId || u.id === user.childId);
  }, [user, isFamily, users]);
  
  // Obtener el estudiante objetivo (el propio estudiante o el hijo si es familia)
  const targetStudent = React.useMemo(() => {
    if (isStudent && user) return user;
    if (isFamily && relatedStudent) return relatedStudent;
    return null;
  }, [isStudent, isFamily, user, relatedStudent]);

  // Estados
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    courseLevel: '',
    subjectId: '',
    teacherUid: '',
    dayOfWeek: 0,
    startTime: '',
    endTime: '',
    classroom: ''
  });

  // Horarios del día seleccionado, filtrados por curso del estudiante
  const daySchedules = useMemo(() => {
    let filtered = schedules.filter(s => s.dayOfWeek === selectedDay);
    
    if (targetStudent?.level) {
      filtered = filtered.filter(s => s.courseLevel === targetStudent.level);
    }
    
    // Ordenar por hora de inicio
    return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedules, selectedDay, targetStudent?.level]);

  // Obtener nombre del profesor
  const getTeacherName = (uid: string) => {
    const teacher = users.find(u => u.uid === uid);
    return teacher?.name || 'Sin asignar';
  };

  // Obtener nombre de la materia
  const getSubjectName = (subjectId: number) => {
    const assignmentKey = Object.keys(Assignments).find(
      key => Assignments[key as keyof typeof Assignments] === subjectId
    ) as keyof typeof Assignments | undefined;
    return assignmentKey || 'Sin materia';
  };

  // Obtener nombre del curso
  const getCourseName = (courseLevel: number) => {
    const courseKey = Object.keys(UserCurses).find(
      key => UserCurses[key as keyof typeof UserCurses] === courseLevel
    ) as keyof typeof UserCurses | undefined;
    return courseKey || 'Sin curso';
  };

  // Manejar agregar horario
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addSchedule({
      courseLevel: Number(newSchedule.courseLevel),
      subjectId: Number(newSchedule.subjectId),
      teacherUid: newSchedule.teacherUid,
      dayOfWeek: Number(newSchedule.dayOfWeek),
      startTime: newSchedule.startTime,
      endTime: newSchedule.endTime,
      classroom: newSchedule.classroom
    });
    
    setShowAddForm(false);
    setNewSchedule({
      courseLevel: '',
      subjectId: '',
      teacherUid: '',
      dayOfWeek: selectedDay,
      startTime: '',
      endTime: '',
      classroom: ''
    });
  };

  // Obtener profesores disponibles
  const availableTeachers = useMemo(() => {
    return users.filter(u => u.role === 4 || u.role === 1);
  }, [users]);

  return (
    <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800">
            <HiCalendar className="w-10 h-10" />
            <span>Horarios</span>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <HiPlus className="w-5 h-5" />
              Agregar Clase
            </button>
          )}
        </div>
        <p className="text-gray-600">
          {isStaff 
            ? 'Gestiona los horarios de clases de cada curso' 
            : isFamily 
            ? 'Consulta el horario semanal'
            : 'Consulta tu horario semanal'}
        </p>
        
        {isFamily && !relatedStudent && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              Tu cuenta no está vinculada a ningún estudiante. Contacta con la administración para vincular tu cuenta a tu hijo/hija.
            </p>
          </div>
        )}
      </div>

      {/* Formulario de agregar clase (solo staff) */}
      {isStaff && showAddForm && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Agregar Nueva Clase</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                <select
                  value={newSchedule.courseLevel}
                  onChange={(e) => setNewSchedule({ ...newSchedule, courseLevel: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Seleccionar curso...</option>
                  {Object.entries(UserCurses)
                    .filter(([key]) => !isNaN(Number(key)))
                    .map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Día</label>
                <select
                  value={newSchedule.dayOfWeek}
                  onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {Object.entries(DayLabels).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Materia</label>
                <select
                  value={newSchedule.subjectId}
                  onChange={(e) => setNewSchedule({ ...newSchedule, subjectId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Seleccionar materia...</option>
                  {Object.entries(Assignments)
                    .filter(([key]) => !isNaN(Number(key)))
                    .map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profesor</label>
                <select
                  value={newSchedule.teacherUid}
                  onChange={(e) => setNewSchedule({ ...newSchedule, teacherUid: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Seleccionar profesor...</option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.uid} value={teacher.uid}>{teacher.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora Inicio</label>
                <input
                  type="time"
                  value={newSchedule.startTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hora Fin</label>
                <input
                  type="time"
                  value={newSchedule.endTime}
                  onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Aula</label>
                <input
                  type="text"
                  value={newSchedule.classroom}
                  onChange={(e) => setNewSchedule({ ...newSchedule, classroom: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Aula 101"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <HiCheck className="w-5 h-5" />
                Guardar Clase
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selector de días */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(DayLabels).map(([dayKey, dayName]) => {
            const dayNum = Number(dayKey);
            const isSelected = selectedDay === dayNum;
            
            return (
              <button
                key={dayKey}
                onClick={() => setSelectedDay(dayNum)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de horarios del día */}
      <div className="space-y-3">
        {daySchedules.length > 0 ? (
          daySchedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <HiClock className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {getSubjectName(schedule.subjectId)}
                  </h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HiUser className="w-4 h-4" />
                      <span>{getTeacherName(schedule.teacherUid)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HiHome className="w-4 h-4" />
                      <span>{schedule.classroom}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <HiBookOpen className="w-4 h-4" />
                      <span>{getCourseName(schedule.courseLevel)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay clases programadas para este día</p>
          </div>
        )}
      </div>
    </section>
  );
};

