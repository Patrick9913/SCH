'use client';

import React, { useState, useMemo } from "react";
import { HiCog, HiUsers, HiBookOpen, HiPlus, HiTrash, HiCheck, HiAcademicCap } from "react-icons/hi";
import { useAuthContext } from '@/app/context/authContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useSubjects } from '@/app/context/subjectContext';
import { Assignments, UserCurses, UserRole } from '@/app/types/user';
import { SubjectInput } from '@/app/types/subject';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
    const { user } = useAuthContext();
    const { users } = useTriskaContext();
    const { 
        subjects,
        createSubject,
        updateSubject,
        deleteSubject,
        assignTeacherToSubject,
        assignStudentToSubject,
        removeStudentFromSubject,
        assignMultipleStudentsToSubject,
        getSubjectSummary
    } = useSubjects();

    const isAdmin = user?.role === UserRole.Administrador;

    // Estados para el panel de materias
    const [activeTab, setActiveTab] = useState<'subjects' | 'assignments'>('subjects');
    const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
    const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSelectingStudents, setIsSelectingStudents] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
    const [filterCourse, setFilterCourse] = useState<number | ''>('');

    // Filtrar usuarios por rol
    const students = useMemo(() => 
        users.filter(u => u.role === UserRole.Estudiante), 
        [users]
    );
    
    const teachers = useMemo(() => 
        users.filter(u => u.role === UserRole.Docente), 
        [users]
    );

    // Obtener estudiantes del curso seleccionado
    const studentsInCourse = useMemo(() => {
        if (!selectedCourse) return [];
        return students.filter(s => s.level === selectedCourse);
    }, [students, selectedCourse]);

    // Helper functions para mapear enums correctamente
    const getSubjectName = (subjectId: number): string => {
        const subject = Object.entries(Assignments).find(([key, value]) => value === subjectId);
        return subject ? subject[0] : 'Materia desconocida';
    };

    const getCourseName = (courseId: number): string => {
        const course = Object.entries(UserCurses).find(([key, value]) => value === courseId);
        return course ? course[0] : 'Curso desconocido';
    };

    const getSubjectOptions = () => {
        return Object.entries(Assignments)
            .filter(([key, value]) => !isNaN(Number(value)))
            .map(([key, value]) => ({
                label: key,
                value: Number(value)
            }));
    };

    const getCourseOptions = () => {
        return Object.entries(UserCurses)
            .filter(([key, value]) => !isNaN(Number(value)))
            .map(([key, value]) => ({
                label: key,
                value: Number(value)
            }));
    };

    // Obtener resumen de materias
    const subjectSummary = useMemo(() => getSubjectSummary(), [getSubjectSummary]);

    // Función para crear una nueva materia
    const handleCreateSubject = async () => {
        if (!selectedCourse || !selectedSubject) {
            toast.error('Por favor selecciona un curso y una materia');
            return;
        }

        const courseName = getCourseName(selectedCourse);
        const subjectName = getSubjectName(selectedSubject);

        const result = await Swal.fire({
            title: '¿Crear Nueva Materia?',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 8px;">¿Estás seguro de que deseas crear la materia <strong>${subjectName}</strong> para <strong>${courseName}</strong>?</p>
                    <p style="font-size: 0.875rem; color: #6b7280;">Después podrás asignar un docente y estudiantes a esta materia.</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Crear',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            setIsCreating(true);
            try {
                await createSubject({
                    name: subjectName,
                    subjectId: selectedSubject,
                    courseLevel: selectedCourse,
                    teacherUid: '', // Se asignará después
                    studentUids: []
                });
                toast.success(`Materia ${subjectName} creada para ${courseName}`);
            } catch (error) {
                console.error('Error al crear materia:', error);
                toast.error('Error al crear materia');
            } finally {
                setIsCreating(false);
            }
        }
    };

    // Función para asignar docente a una materia
    const handleAssignTeacher = async (subjectId: string, teacherUid: string) => {
        try {
            await assignTeacherToSubject(subjectId, teacherUid);
            const teacher = teachers.find(t => t.uid === teacherUid);
            toast.success(`${teacher?.name} asignado a la materia`);
        } catch (error) {
            console.error('Error al asignar docente:', error);
            toast.error('Error al asignar docente');
        }
    };

    // Función para asignar todos los estudiantes a una materia
    const handleAssignAllStudents = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const courseName = getCourseName(subject.courseLevel);
        const subjectName = subject.name;
        
        // Obtener estudiantes del curso de la materia
        const studentsInSubjectCourse = students.filter(s => s.level === subject.courseLevel);

        const result = await Swal.fire({
            title: '¿Asignar todos los estudiantes?',
            html: `
                <div style="text-align: left;">
                    <p style="margin-bottom: 8px;">¿Estás seguro de que deseas asignar <strong>TODOS</strong> los estudiantes de ${courseName} a la materia <strong>${subjectName}</strong>?</p>
                    <p style="font-size: 0.875rem; color: #6b7280;">Esta acción asignará ${studentsInSubjectCourse.length} estudiantes a la materia.</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, Asignar Todos',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            try {
                const studentUids = studentsInSubjectCourse.map(s => s.uid);
                await assignMultipleStudentsToSubject(subjectId, studentUids);
                toast.success(`Se asignaron ${studentUids.length} estudiantes a ${subjectName}`);
            } catch (error) {
                console.error('Error al asignar estudiantes:', error);
                toast.error('Error al asignar estudiantes');
            }
        }
    };

    // Función para abrir el modal de selección de estudiantes
    const handleOpenStudentSelection = (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;
        
        setSelectedSubjectId(subjectId);
        // Preseleccionar estudiantes ya asignados
        const assignedUids = new Set(subject.studentUids);
        setSelectedStudentUids(assignedUids);
        // Filtrar por el curso de la materia por defecto
        setFilterCourse(subject.courseLevel);
        setIsSelectingStudents(true);
    };

    // Función para guardar la selección de estudiantes
    const handleSaveSelectedStudents = async () => {
        if (!selectedSubjectId) return;

        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        try {
            const studentUidsArray = Array.from(selectedStudentUids);
            // Actualizar los estudiantes directamente (reemplazar la lista completa)
            await updateSubject(selectedSubjectId, { studentUids: studentUidsArray });
            toast.success(`Se asignaron ${studentUidsArray.length} estudiantes a ${subject.name}`);
            setIsSelectingStudents(false);
            setSelectedSubjectId(null);
            setSelectedStudentUids(new Set());
            setFilterCourse('');
        } catch (error) {
            console.error('Error al asignar estudiantes:', error);
            toast.error('Error al asignar estudiantes');
        }
    };

    // Función para cancelar la selección
    const handleCancelStudentSelection = () => {
        setIsSelectingStudents(false);
        setSelectedSubjectId(null);
        setSelectedStudentUids(new Set());
        setFilterCourse('');
    };

    // Obtener estudiantes filtrados por curso (para el modal)
    const studentsForSelection = useMemo(() => {
        if (filterCourse === '') {
            // Si no hay filtro, mostrar todos los estudiantes
            return students;
        }
        return students.filter(s => s.level === filterCourse);
    }, [students, filterCourse]);

    // Función para remover estudiante de una materia
    const handleRemoveStudent = async (subjectId: string, studentUid: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        const student = students.find(s => s.uid === studentUid);
        
        if (!subject || !student) return;

        const result = await Swal.fire({
            title: '¿Remover estudiante?',
            text: `¿Estás seguro de que deseas remover a ${student.name} de ${subject.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
            try {
                await removeStudentFromSubject(subjectId, studentUid);
                toast.success('Estudiante removido exitosamente');
            } catch (error) {
                console.error('Error al remover estudiante:', error);
                toast.error('Error al remover estudiante');
            }
        }
    };

    // Función para eliminar materia
    const handleDeleteSubject = async (subjectId: string) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const result = await Swal.fire({
            title: '¿Eliminar materia?',
            text: `¿Estás seguro de que deseas eliminar la materia ${subject.name} de ${getCourseName(subject.courseLevel)}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
        });

        if (result.isConfirmed) {
            try {
                await deleteSubject(subjectId);
                toast.success('Materia eliminada exitosamente');
            } catch (error) {
                console.error('Error al eliminar materia:', error);
                toast.error('Error al eliminar materia');
            }
        }
    };

    if (!isAdmin) {
        return (
            <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
                <div className="text-center py-12">
                    <HiCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Acceso Restringido</h3>
                    <p className="text-sm text-gray-400">
                        Solo los administradores pueden acceder a esta sección.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
            <div className="mb-6">
                <div className="text-2xl flex items-center gap-x-2 font-bold text-gray-800 mb-2">
                    <HiCog className="w-10 h-10" />
                    <span>Administración de Materias</span>
                </div>
                <p className="text-gray-600">
                    Gestiona las materias, docentes y estudiantes asignados por curso.
                </p>
            </div>

            {/* Panel de Control */}
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 text-lg mb-4">Crear Nueva Materia</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Selector de Curso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Curso
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(Number(e.target.value) || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecciona un curso</option>
                            {getCourseOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de Materia */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Materia
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(Number(e.target.value) || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Selecciona una materia</option>
                            {getSubjectOptions().map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Botón de Creación */}
                    <div className="flex items-end">
                        <button
                            onClick={handleCreateSubject}
                            disabled={!selectedCourse || !selectedSubject || isCreating}
                            className={`w-full px-4 py-2 rounded-md font-semibold transition-all ${
                                selectedCourse && selectedSubject && !isCreating
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isCreating ? 'Creando...' : 'Crear Materia'}
                        </button>
                    </div>
                </div>

                {/* Información del curso/materia seleccionado */}
                {selectedCourse && selectedSubject && (
                    <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-2">Información</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Curso:</span> {getCourseName(selectedCourse)}
                            </div>
                            <div>
                                <span className="font-medium">Materia:</span> {getSubjectName(selectedSubject)}
                            </div>
                            <div>
                                <span className="font-medium">Estudiantes en curso:</span> {studentsInCourse.length}
                            </div>
                            <div>
                                <span className="font-medium">Materia existe:</span> {
                                    subjects.some(s => s.courseLevel === selectedCourse && s.subjectId === selectedSubject) ? 'Sí' : 'No'
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Materias */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Materias Existentes</h3>
                {subjects.length === 0 ? (
                    <div className="text-center py-8">
                        <HiAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">No hay materias creadas</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {subjects.map((subject) => {
                            const teacher = teachers.find(t => t.uid === subject.teacherUid);
                            const assignedStudents = students.filter(s => subject.studentUids.includes(s.uid));
                            
                            return (
                                <div key={subject.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-lg">{subject.name}</h4>
                                            <p className="text-sm text-gray-600">{getCourseName(subject.courseLevel)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSubject(subject.id)}
                                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                        >
                                            <HiTrash className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Docente Asignado */}
                                    <div className="mb-4">
                                        <h5 className="font-medium text-gray-700 mb-2">Docente Asignado</h5>
                                        {teacher ? (
                                            <div className="flex items-center justify-between bg-white rounded p-3 border">
                                                <div>
                                                    <span className="font-medium">{teacher.name}</span>
                                                    <p className="text-sm text-gray-600">{teacher.mail}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                                    <HiCheck className="w-4 h-4 inline mr-1" />
                                                    Asignado
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                <p className="text-sm text-yellow-700">No hay docente asignado</p>
                                                <div className="mt-2">
                                                    <select
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleAssignTeacher(subject.id, e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    >
                                                        <option value="">Seleccionar docente</option>
                                                        {teachers.map((t) => (
                                                            <option key={t.uid} value={t.uid}>
                                                                {t.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Estudiantes Asignados */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-medium text-gray-700">Estudiantes Asignados ({assignedStudents.length})</h5>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleOpenStudentSelection(subject.id)}
                                                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                >
                                                    <HiUsers className="w-4 h-4 inline mr-1" />
                                                    Seleccionar
                                                </button>
                                                <button
                                                    onClick={() => handleAssignAllStudents(subject.id)}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                                >
                                                    <HiPlus className="w-4 h-4 inline mr-1" />
                                                    Asignar Todos
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {assignedStudents.length === 0 ? (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                <p className="text-sm text-yellow-700">No hay estudiantes asignados</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {assignedStudents.map((student) => (
                                                    <div key={student.uid} className="flex justify-between items-center bg-white rounded p-2 border">
                                                        <div>
                                                            <span className="font-medium">{student.name}</span>
                                                            <p className="text-sm text-gray-600">{student.mail}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveStudent(subject.id, student.uid)}
                                                            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                        >
                                                            <HiTrash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Resumen de materias */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen de Materias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjectSummary.map((summary) => (
                        <div key={`${summary.subjectId}-${summary.courseLevel}`} className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-800">{summary.subjectName}</h4>
                            <p className="text-sm text-gray-600 mb-2">{summary.courseName}</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Docente:</span>
                                    <span className="font-medium">{summary.teacherName || 'Sin asignar'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Estudiantes:</span>
                                    <span className="font-medium">{summary.assignedStudents}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Selección de Estudiantes */}
            {isSelectingStudents && selectedSubjectId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Seleccionar Estudiantes para {subjects.find(s => s.id === selectedSubjectId)?.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {getCourseName(subjects.find(s => s.id === selectedSubjectId)?.courseLevel || 0)}
                            </p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Filtro por curso */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Filtrar por Curso
                                </label>
                                <select
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Todos los cursos</option>
                                    {getCourseOptions().map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Seleccionados: <span className="font-semibold">{selectedStudentUids.size}</span> 
                                    {filterCourse !== '' && (
                                        <span> de {studentsForSelection.length} en {getCourseName(filterCourse)}</span>
                                    )}
                                    {filterCourse === '' && (
                                        <span> de {students.length} totales</span>
                                    )}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const allUids = new Set(studentsForSelection.map(s => s.uid));
                                            // Mantener los que ya estaban seleccionados de otros cursos
                                            const merged = new Set([...selectedStudentUids, ...allUids]);
                                            setSelectedStudentUids(merged);
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Seleccionar Todos (Filtrado)
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Deseleccionar solo los del curso filtrado actual
                                            const newSet = new Set(selectedStudentUids);
                                            studentsForSelection.forEach(s => {
                                                newSet.delete(s.uid);
                                            });
                                            setSelectedStudentUids(newSet);
                                        }}
                                        className="text-sm text-gray-600 hover:text-gray-700"
                                    >
                                        Deseleccionar (Filtrado)
                                    </button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {studentsForSelection.map((student) => (
                                    <label
                                        key={student.uid}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                            selectedStudentUids.has(student.uid)
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentUids.has(student.uid)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedStudentUids);
                                                if (e.target.checked) {
                                                    newSet.add(student.uid);
                                                } else {
                                                    newSet.delete(student.uid);
                                                }
                                                setSelectedStudentUids(newSet);
                                            }}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1 flex items-center justify-between">
                                            <div>
                                                <span className="font-medium text-gray-800">{student.name}</span>
                                                {student.mail && (
                                                    <p className="text-sm text-gray-600">{student.mail}</p>
                                                )}
                                            </div>
                                            {student.level && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                                    {getCourseName(student.level)}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            {studentsForSelection.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {filterCourse === '' 
                                        ? 'No hay estudiantes registrados' 
                                        : `No hay estudiantes en ${getCourseName(filterCourse)}`
                                    }
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t flex gap-3 justify-end">
                            <button
                                onClick={handleCancelStudentSelection}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveSelectedStudents}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Guardar Selección ({selectedStudentUids.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}