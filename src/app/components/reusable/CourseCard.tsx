'use client';

import React from 'react';
import { Course } from '@/app/types/course';
import { User } from '@/app/types/user';

interface CourseCardProps {
  course: Course;
  preceptor?: User;
  studentCount: number;
  onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  preceptor,
  studentCount,
  onClick,
}) => {
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {getCourseLabel(course.level)} - División {course.division}
        </h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Preceptor: </span>
          <span className={`font-medium ${
            preceptor ? 'text-gray-900' : 'text-orange-600'
          }`}>
            {preceptor ? preceptor.name : 'Sin asignar'}
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
