'use client';

import React from 'react';
import { TriskaProvider } from "../context/triskaContext";
import { AnnouncementsProvider } from "../context/announcementsContext";
import { MessagesProvider } from "../context/messagesContext";
import { ChatProvider } from "../context/chatContext";
import { AttendanceProvider } from "../context/attendanceContext";
import { GradesProvider } from "../context/gradesContext";
import { SettingsProvider } from "../context/settingsContext";
import { AuthContextProvider } from "../context/authContext";
import { SubjectProvider } from "../context/subjectContext";
import { ScheduleProvider } from "../context/scheduleContext";
import { CourseProvider } from "../context/courseContext";
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <SettingsProvider>
        <AnnouncementsProvider>
          <MessagesProvider>
            <AttendanceProvider>
              <SubjectProvider>
                <CourseProvider>
                  <TriskaProvider>
                    <ChatProvider>
                      <GradesProvider>
                        <ScheduleProvider>
                        <Toaster 
                          position="top-right"
                          toastOptions={{
                            duration: 4000,
                            style: {
                              background: '#363636',
                              color: '#fff',
                            },
                            success: {
                              iconTheme: {
                                primary: '#10b981',
                                secondary: '#fff',
                              },
                            },
                            error: {
                              iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                              },
                            },
                          }}
                        />
                        {children}
                        </ScheduleProvider>
                      </GradesProvider>
                    </ChatProvider>
                  </TriskaProvider>
                </CourseProvider>
              </SubjectProvider>
            </AttendanceProvider>
          </MessagesProvider>
        </AnnouncementsProvider>
      </SettingsProvider>
    </AuthContextProvider>
  );
}
