'use client';

import React, { useState, useMemo } from 'react';
import { useTasks } from '@/app/context/tasksContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';
import { Assignments, UserCurses } from '@/app/types/user';
import { TaskSubmission } from '@/app/types/tasks';
import { HiClipboardList, HiPlus, HiClock, HiCheck, HiXCircle, HiUser } from 'react-icons/hi';
import { HiCheckCircle } from 'react-icons/hi2';

export const Tasks: React.FC = () => {
  const { tasks, submissions, addTask, submitTask, gradeSubmission } = useTasks();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;
  const isStudent = user?.role === 3;

  // Estados
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subjectId: '',
    courseLevel: '',
    dueDate: ''
  });
  const [newSubmission, setNewSubmission] = useState({
    content: ''
  });

  // Filtrar tareas según el usuario
  const filteredTasks = useMemo(() => {
    if (isStudent && user?.level) {
      // Estudiantes solo ven tareas de su curso
      return tasks.filter(t => t.courseLevel === user.level);
    }
    return tasks;
  }, [tasks, isStudent, user?.level]);

  // Obtener nombre del profesor
  const getTeacherName = (uid: string) => {
    const teacher = users.find(u => u.uid === uid);
    return teacher?.name || 'Sin asignar';
  };

  // Obtener nombre de la materia
  const getSubjectName = (subjectId: number) => {
    return Assignments[subjectId as keyof typeof Assignments] || 'Sin materia';
  };

  // Verificar si una tarea ya fue entregada por el estudiante
  const getSubmissionForTask = (taskId: string) => {
    if (!user?.uid) return null;
    return submissions.find(s => s.taskId === taskId && s.studentUid === user.uid);
  };

  // Manejar agregar tarea
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addTask({
      title: newTask.title,
      description: newTask.description,
      subjectId: Number(newTask.subjectId),
      courseLevel: Number(newTask.courseLevel),
      dueDate: newTask.dueDate,
      assignedByUid: user?.uid || ''
    });
    
    setShowAddForm(false);
    setNewTask({
      title: '',
      description: '',
      subjectId: '',
      courseLevel: '',
      dueDate: ''
    });
  };

  // Manejar entregar tarea
  const handleSubmitTask = async (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    
    await submitTask({
      taskId,
      studentUid: user?.uid || '',
      content: newSubmission.content,
    });
    
    setShowSubmissionForm(null);
    setNewSubmission({ content: '' });
  };

  // Manejar calificar entrega
  const handleGradeSubmission = async (submissionId: string, grade: number) => {
    await gradeSubmission(submissionId, grade);
  };

  // Obtener profesores disponibles
  const availableTeachers = useMemo(() => {
    return users.filter(u => u.role === 4 || u.role === 1);
  }, [users]);

  // Calcular días hasta la fecha límite
  const daysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800">
            <HiClipboardList className="w-10 h-10" />
            <span>Tareas</span>
          </div>
          {isStaff && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <HiPlus className="w-5 h-5" />
              Nueva Tarea
            </button>
          )}
        </div>
        <p className="text-gray-600">
          {isStaff 
            ? 'Gestiona las tareas y califica entregas de tus estudiantes' 
            : 'Visualiza y entrega tus tareas pendientes'}
        </p>
      </div>

      {/* Formulario de agregar tarea (solo staff) */}
      {isStaff && showAddForm && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Nueva Tarea</h3>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Límite</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                <select
                  value={newTask.courseLevel}
                  onChange={(e) => setNewTask({ ...newTask, courseLevel: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Materia</label>
                <select
                  value={newTask.subjectId}
                  onChange={(e) => setNewTask({ ...newTask, subjectId: e.target.value })}
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

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
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
                Crear Tarea
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs para estudiantes */}
      {isStudent && (
        <div className="mb-6 flex gap-2 border-b">
          {['all', 'pending', 'submitted', 'graded'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'all' && 'Todas'}
              {tab === 'pending' && 'Pendientes'}
              {tab === 'submitted' && 'Entregadas'}
              {tab === 'graded' && 'Calificadas'}
            </button>
          ))}
        </div>
      )}

      {/* Lista de tareas */}
      <div className="space-y-4">
        {filteredTasks
          .filter(task => {
            if (!isStudent || activeTab === 'all') return true;
            const submission = getSubmissionForTask(task.id);
            if (activeTab === 'pending' && !submission) return true;
            if (activeTab === 'submitted' && submission && submission.status === 'submitted') return true;
            if (activeTab === 'graded' && submission && submission.status === 'graded') return true;
            return false;
          })
          .map((task) => {
            const submission = getSubmissionForTask(task.id);
            const daysRemaining = daysUntilDue(task.dueDate);
            const isOverdue = daysRemaining < 0;

            return (
              <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{task.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>{getSubjectName(task.subjectId)}</span>
                      <span>•</span>
                      <span>{UserCurses[task.courseLevel as keyof typeof UserCurses]}</span>
                      {isStudent && submission && (
                        <>
                          <span>•</span>
                          <span className={`font-semibold ${
                            submission.status === 'graded' ? 'text-green-600' :
                            submission.status === 'late' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {submission.status === 'graded' && `Calificación: ${submission.grade}`}
                            {submission.status === 'submitted' && 'Entregada'}
                            {submission.status === 'late' && 'Entregada tarde'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-gray-700">{task.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <HiClock className="w-4 h-4" />
                      <span>Entrega: {new Date(task.dueDate).toLocaleDateString('es-ES')}</span>
                    </div>
                    {isStudent && (
                      <span className={`font-medium ${
                        isOverdue ? 'text-red-600' :
                        daysRemaining <= 2 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {isOverdue ? `Vencida hace ${Math.abs(daysRemaining)} días` :
                         daysRemaining === 0 ? 'Vence hoy' :
                         `${daysRemaining} días restantes`}
                      </span>
                    )}
                    {isStaff && (
                      <span>Profesor: {getTeacherName(task.assignedByUid)}</span>
                    )}
                  </div>

                  {/* Botones de acción */}
                  {isStudent && !submission && (
                    <button
                      onClick={() => setShowSubmissionForm(task.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Entregar Tarea
                    </button>
                  )}

                  {isStudent && submission && submission.grade !== undefined && (
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <HiCheckCircle className="w-5 h-5" />
                      Calificada: {submission.grade}
                    </div>
                  )}

                  {/* Formulario de entrega */}
                  {isStudent && showSubmissionForm === task.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Entregar Tarea</h3>
                        <form onSubmit={(e) => handleSubmitTask(e, task.id)} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Tu respuesta
                            </label>
                            <textarea
                              value={newSubmission.content}
                              onChange={(e) => setNewSubmission({ content: e.target.value })}
                              className="w-full border rounded px-3 py-2"
                              rows={8}
                              placeholder="Escribe tu respuesta aquí..."
                              required
                            />
                          </div>
                          <div className="flex gap-3 justify-end">
                            <button
                              type="button"
                              onClick={() => setShowSubmissionForm(null)}
                              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Entregar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No hay tareas disponibles</p>
          </div>
        )}
      </div>
    </section>
  );
};

