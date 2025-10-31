'use client';

import React from 'react';
import { Subject } from '@/app/types/subject';
import { User } from '@/app/types/user';

interface SubjectCardProps {
  subject: Subject;
  teacher?: User;
  studentCount: number;
  totalStudentsInCourse: number;
  scheduleCount: number;
  onClick: () => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  teacher,
  studentCount,
  totalStudentsInCourse,
  scheduleCount,
  onClick,
}) => {
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {subject.name}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {getCourseLabel(subject.courseLevel)}
          {subject.courseDivision && ` ${subject.courseDivision}`}
        </p>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Docente: </span>
          <span className={`font-medium ${
            teacher ? 'text-gray-900' : 'text-orange-600'
          }`}>
            {teacher ? teacher.name : 'Sin asignar'}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Estudiantes: </span>
          <span className={`font-medium ${
            studentCount > 0 ? 'text-gray-900' : 'text-red-600'
          }`}>
            {studentCount}
          </span>
        </div>
      </div>
    </div>
  );
};
