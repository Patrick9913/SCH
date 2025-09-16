'use client';

import React from 'react';
import { useAttendance } from '@/app/context/attendanceContext';
import { useTriskaContext } from '@/app/context/triskaContext';
import { useAuthContext } from '@/app/context/authContext';

export const Attendance: React.FC = () => {
  const { records, markAttendance } = useAttendance();
  const { users } = useTriskaContext();
  const { user } = useAuthContext();

  const isStaff = user?.role === 1 || user?.role === 4 || user?.role === 2;

  return (
    <section className=" flex-1 p-5 overflow-y-scroll max-h-screen h-full bg-white rounded-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Asistencias</h2>
      {isStaff && (
        <form
          className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement & {
              date: { value: string };
              studentUid: { value: string };
              status: { value: string };
            };
            const date = form.date.value;
            const studentUid = form.studentUid.value;
            const status = form.status.value as any;
            if (!date || !studentUid) return;
            await markAttendance({ date, studentUid, status });
          }}
        >
          <input type="date" name="date" className="border rounded px-2 py-1" />
          <select name="studentUid" className="border rounded px-2 py-1">
            <option value="">Seleccionar alumno</option>
            {users
              .filter((u) => u.role === 3)
              .map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.name}
                </option>
              ))}
          </select>
          <select name="status" defaultValue="present" className="border rounded px-2 py-1">
            <option value="present">Presente</option>
            <option value="absent">Ausente</option>
            <option value="late">Tarde</option>
            <option value="excused">Justificada</option>
          </select>
          <div className="md:col-span-2">
            <button type="submit" className="bg-blue-600 text-white rounded px-3 py-1">Marcar</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className="bg-gray-50 border rounded p-3 flex justify-between">
            <div>
              <p className="font-semibold">{r.date}</p>
              <p className="text-sm text-gray-600">Alumno: {r.studentUid}</p>
            </div>
            <span className="text-sm">{r.status}</span>
          </li>
        ))}
        {records.length === 0 && <li className="text-gray-500">Sin registros.</li>}
      </ul>
    </section>
  );
};





