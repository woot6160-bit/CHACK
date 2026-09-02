import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  School,
  ClassRoom,
  Student,
  AttendanceStatusConfig,
  AttendanceRecord,
  ArtAssignment,
  SubmissionGrade,
  ExamRecord,
  ExamConfig,
  NotificationItem
} from '../types';
import {
  DEFAULT_STATUSES,
  INITIAL_SCHOOLS,
  INITIAL_CLASSES,
  INITIAL_STUDENTS
} from '../data/initialData';

// Helper to sanitize payload for Firestore (Firestore strictly rejects `undefined` values)
export function sanitizeForFirestore<T extends Record<string, any>>(data: T, isUpdate = false): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      if (isUpdate) {
        clean[key] = deleteField();
      }
      // If creating (not update), omit the key entirely so undefined is not sent
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      clean[key] = sanitizeForFirestore(val, isUpdate);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

interface AppContextType {
  schools: School[];
  classRooms: ClassRoom[];
  students: Student[];
  statuses: AttendanceStatusConfig[];
  attendanceRecords: AttendanceRecord[];
  assignments: ArtAssignment[];
  grades: SubmissionGrade[];
  notifications: NotificationItem[];
  isOnline: boolean;
  isSyncing: boolean;
  selectedSchoolId: string;
  selectedClassId: string;
  selectedDate: string;
  setSelectedSchoolId: (id: string) => void;
  setSelectedClassId: (id: string) => void;
  setSelectedDate: (date: string) => void;

  // School actions
  addSchool: (name: string, code?: string) => Promise<void>;
  updateSchool: (id: string, name: string, code?: string) => Promise<void>;
  deleteSchool: (id: string) => Promise<void>;

  // Classroom actions
  addClassRoom: (schoolId: string, name: string, gradeLevel?: string, term?: string) => Promise<void>;
  updateClassRoom: (id: string, name: string, schoolId: string, gradeLevel?: string) => Promise<void>;
  deleteClassRoom: (id: string) => Promise<void>;

  // Student actions
  addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
  updateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  batchAddStudents: (students: Omit<Student, 'id'>[], mode: 'skip' | 'replace' | 'duplicate', existingStudents: Student[]) => Promise<{ added: number; skipped: number; replaced: number }>;

  // Status actions
  addStatus: (status: Omit<AttendanceStatusConfig, 'id'>) => Promise<void>;
  updateStatus: (id: string, status: Partial<AttendanceStatusConfig>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  resetStatusesToDefault: () => Promise<void>;

  // Attendance actions
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  batchRecordAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  deleteAttendanceRecord: (id: string) => Promise<void>;

  // Assignment & Grades actions
  addAssignment: (assignment: Omit<ArtAssignment, 'id'>) => Promise<void>;
  updateAssignment: (id: string, assignment: Partial<ArtAssignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  saveGrade: (grade: Omit<SubmissionGrade, 'id'>) => Promise<void>;

  // Exam actions
  examRecords: ExamRecord[];
  saveExamRecord: (record: Omit<ExamRecord, 'id'> & { id?: string }) => Promise<void>;
  batchSaveExamRecords: (records: (Omit<ExamRecord, 'id'> & { id?: string })[]) => Promise<void>;

  // Notifications
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'update') => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'ART_ROLL_LOCAL_DATA_V1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Local state initialized with fallback
  const [schools, setSchools] = useState<School[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_schools`);
    return saved ? JSON.parse(saved) : INITIAL_SCHOOLS;
  });

  const [classRooms, setClassRooms] = useState<ClassRoom[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_classes`);
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_students`);
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [statuses, setStatuses] = useState<AttendanceStatusConfig[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_statuses`);
    return saved ? JSON.parse(saved) : DEFAULT_STATUSES;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_records`);
    return saved ? JSON.parse(saved) : [];
  });

  const [assignments, setAssignments] = useState<ArtAssignment[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_assignments`);
    return saved ? JSON.parse(saved) : [];
  });

  const [grades, setGrades] = useState<SubmissionGrade[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_grades`);
    return saved ? JSON.parse(saved) : [];
  });

  const [examRecords, setExamRecords] = useState<ExamRecord[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_exams`);
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Selected filters
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Default selection initialization
  useEffect(() => {
    if (schools.length > 0 && (!selectedSchoolId || !schools.some(s => s.id === selectedSchoolId))) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  useEffect(() => {
    const availableClasses = classRooms.filter(c => c.schoolId === selectedSchoolId);
    if (availableClasses.length > 0 && (!selectedClassId || !availableClasses.some(c => c.id === selectedClassId))) {
      setSelectedClassId(availableClasses[0].id);
    } else if (availableClasses.length === 0) {
      setSelectedClassId('');
    }
  }, [selectedSchoolId, classRooms, selectedClassId]);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification('เชื่อมต่อแล้ว', 'เชื่อมต่ออินเทอร์เน็ตแล้ว ข้อมูลจะซิงค์กับคลาวด์อัตโนมัติ', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addNotification('โหมดออฟไลน์', 'กำลังทำงานในโหมดออฟไลน์ ข้อมูลจะบันทึกในเครื่องและซิงค์เมื่อออนไลน์', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync to LocalStorage for safety fallback
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_schools`, JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_classes`, JSON.stringify(classRooms));
  }, [classRooms]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_students`, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_statuses`, JSON.stringify(statuses));
  }, [statuses]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_records`, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_assignments`, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_grades`, JSON.stringify(grades));
  }, [grades]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_exams`, JSON.stringify(examRecords));
  }, [examRecords]);

  // Real-time Firestore Listeners
  useEffect(() => {
    setIsSyncing(true);

    const unsubSchools = onSnapshot(collection(db, 'schools'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: School[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as School));
        setSchools(loaded);
      } else {
        // Seed initial if empty
        INITIAL_SCHOOLS.forEach(s => {
          setDoc(doc(db, 'schools', s.id), sanitizeForFirestore(s));
        });
      }
    }, (error) => {
      console.warn('Firestore schools offline/listen error:', error);
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: ClassRoom[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassRoom));
        setClassRooms(loaded);
      } else {
        INITIAL_CLASSES.forEach(c => {
          setDoc(doc(db, 'classes', c.id), sanitizeForFirestore(c));
        });
      }
    }, (error) => {
      console.warn('Firestore classes offline/listen error:', error);
    });

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Student[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        // Sort students by studentNumber naturally
        loaded.sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
        setStudents(loaded);
      } else {
        INITIAL_STUDENTS.forEach(st => {
          setDoc(doc(db, 'students', st.id), sanitizeForFirestore(st));
        });
      }
    }, (error) => {
      console.warn('Firestore students error:', error);
    });

    const unsubStatuses = onSnapshot(collection(db, 'statuses'), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: AttendanceStatusConfig[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceStatusConfig));
        setStatuses(loaded);
      } else {
        DEFAULT_STATUSES.forEach(st => {
          setDoc(doc(db, 'statuses', st.id), sanitizeForFirestore(st));
        });
      }
    }, (error) => {
      console.warn('Firestore statuses error:', error);
    });

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const loaded: AttendanceRecord[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendanceRecords(loaded);
    }, (error) => {
      console.warn('Firestore attendance error:', error);
    });

    const unsubAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
      const loaded: ArtAssignment[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArtAssignment));
      setAssignments(loaded);
    }, (error) => {
      console.warn('Firestore assignments error:', error);
    });

    const unsubGrades = onSnapshot(collection(db, 'grades'), (snapshot) => {
      const loaded: SubmissionGrade[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SubmissionGrade));
      setGrades(loaded);
      setIsSyncing(false);
    }, (error) => {
      console.warn('Firestore grades error:', error);
      setIsSyncing(false);
    });

    const unsubExams = onSnapshot(collection(db, 'exam_records'), (snapshot) => {
      const loaded: ExamRecord[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamRecord));
      setExamRecords(loaded);
    }, (error) => {
      console.warn('Firestore exam_records error:', error);
    });

    return () => {
      unsubSchools();
      unsubClasses();
      unsubStudents();
      unsubStatuses();
      unsubAttendance();
      unsubAssignments();
      unsubGrades();
      unsubExams();
    };
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'update' = 'info') => {
    const newItem: NotificationItem = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newItem, ...prev.slice(0, 19)]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Actions
  const addSchool = async (name: string, code?: string) => {
    const id = 'sch-' + Date.now();
    const newSchool: School = { id, name, code: code || '' };
    setSchools(prev => [...prev, newSchool]);
    addNotification('เพิ่มโรงเรียน', `เพิ่มโรงเรียน "${name}" เรียบร้อยแล้ว`, 'success');
    try {
      await setDoc(doc(db, 'schools', id), newSchool);
    } catch (e) {
      console.error(e);
    }
  };

  const updateSchool = async (id: string, name: string, code?: string) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, name, code: code || '' } : s));
    addNotification('แก้ไขโรงเรียน', `อัปเดตข้อมูลโรงเรียน "${name}" แล้ว`, 'update');
    try {
      await setDoc(doc(db, 'schools', id), { id, name, code: code || '' }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSchool = async (id: string) => {
    const schoolToDelete = schools.find(s => s.id === id);
    setSchools(prev => prev.filter(s => s.id !== id));
    // Also remove associated classes & students locally
    setClassRooms(prev => prev.filter(c => c.schoolId !== id));
    setStudents(prev => prev.filter(st => st.schoolId !== id));
    addNotification('ลบโรงเรียน', `ลบโรงเรียน "${schoolToDelete?.name || id}" เรียบร้อยแล้ว`, 'warning');
    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (e) {
      console.error(e);
    }
  };

  const addClassRoom = async (schoolId: string, name: string, gradeLevel?: string, term?: string) => {
    const id = 'cls-' + Date.now();
    const newClass: ClassRoom = {
      id,
      schoolId,
      name,
      gradeLevel: gradeLevel || '',
      term: term || '1'
    };
    setClassRooms(prev => [...prev, newClass]);
    addNotification('เพิ่มห้องเรียน', `เพิ่มห้องเรียน "${name}" สำเร็จ`, 'success');
    try {
      await setDoc(doc(db, 'classes', id), newClass);
    } catch (e) {
      console.error(e);
    }
  };

  const updateClassRoom = async (id: string, name: string, schoolId: string, gradeLevel?: string) => {
    setClassRooms(prev => prev.map(c => c.id === id ? { ...c, name, schoolId, gradeLevel } : c));
    addNotification('แก้ไขห้องเรียน', `อัปเดตห้องเรียน "${name}" แล้ว`, 'update');
    try {
      await setDoc(doc(db, 'classes', id), { name, schoolId, gradeLevel }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteClassRoom = async (id: string) => {
    const cls = classRooms.find(c => c.id === id);
    setClassRooms(prev => prev.filter(c => c.id !== id));
    setStudents(prev => prev.filter(st => st.classId !== id));
    addNotification('ลบห้องเรียน', `ลบห้องเรียน "${cls?.name || id}" แล้ว`, 'warning');
    try {
      await deleteDoc(doc(db, 'classes', id));
    } catch (e) {
      console.error(e);
    }
  };

  const addStudent = async (studentData: Omit<Student, 'id'>) => {
    const id = 'std-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newStudent: Student = { id, ...studentData, createdAt: Date.now() };
    setStudents(prev => [...prev, newStudent]);
    addNotification('เพิ่มนักเรียน', `เพิ่มนักเรียน "${studentData.name}" (เลขที่ ${studentData.studentNumber}) แล้ว`, 'success');
    try {
      await setDoc(doc(db, 'students', id), newStudent);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStudent = async (id: string, studentData: Partial<Student>) => {
    setStudents(prev => prev.map(st => st.id === id ? { ...st, ...studentData } : st));
    addNotification('แก้ไขข้อมูลนักเรียน', `บันทึกการแก้ไขนักเรียนแล้ว`, 'update');
    try {
      await setDoc(doc(db, 'students', id), studentData, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteStudent = async (id: string) => {
    const st = students.find(s => s.id === id);
    setStudents(prev => prev.filter(s => s.id !== id));
    addNotification('ลบนักเรียน', `ลบรายชื่อนักเรียน "${st?.name || id}" แล้ว`, 'warning');
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      console.error(e);
    }
  };

  const batchAddStudents = async (
    newStudents: Omit<Student, 'id'>[],
    mode: 'skip' | 'replace' | 'duplicate',
    existingStudentsInClass: Student[]
  ) => {
    let added = 0;
    let skipped = 0;
    let replaced = 0;
    const batch = writeBatch(db);

    const updatedStudentsList = [...students];

    for (const item of newStudents) {
      const match = existingStudentsInClass.find(
        es => (es.studentCode && es.studentCode === item.studentCode) ||
              (es.studentNumber && es.studentNumber === item.studentNumber) ||
              (es.name.trim() === item.name.trim())
      );

      if (match) {
        if (mode === 'skip') {
          skipped++;
          continue;
        } else if (mode === 'replace') {
          replaced++;
          const ref = doc(db, 'students', match.id);
          const updated = { ...match, ...item };
          batch.set(ref, updated, { merge: true });
          const idx = updatedStudentsList.findIndex(s => s.id === match.id);
          if (idx !== -1) updatedStudentsList[idx] = updated;
        } else {
          // duplicate / add anyway
          added++;
          const newId = 'std-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
          const createdStudent: Student = { id: newId, ...item, createdAt: Date.now() };
          const ref = doc(db, 'students', newId);
          batch.set(ref, createdStudent);
          updatedStudentsList.push(createdStudent);
        }
      } else {
        added++;
        const newId = 'std-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const createdStudent: Student = { id: newId, ...item, createdAt: Date.now() };
        const ref = doc(db, 'students', newId);
        batch.set(ref, createdStudent);
        updatedStudentsList.push(createdStudent);
      }
    }

    setStudents(updatedStudentsList);
    addNotification('นำเข้ารายชื่อนักเรียน', `นำเข้าเสร็จสิ้น: เพิ่มใหม่ ${added}, แทนที่ ${replaced}, ข้าม ${skipped} คน`, 'success');

    try {
      await batch.commit();
    } catch (e) {
      console.error('Batch commit failed:', e);
    }

    return { added, skipped, replaced };
  };

  const addStatus = async (statusData: Omit<AttendanceStatusConfig, 'id'>) => {
    const id = 'status-' + Date.now();
    const newStatus: AttendanceStatusConfig = { id, ...statusData, isCustom: true };
    setStatuses(prev => [...prev, newStatus]);
    addNotification('เพิ่มสถานะเช็กชื่อ', `เพิ่มสถานะ "${statusData.code}" แล้ว`, 'success');
    try {
      await setDoc(doc(db, 'statuses', id), sanitizeForFirestore(newStatus));
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (id: string, statusData: Partial<AttendanceStatusConfig>) => {
    setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...statusData } : s));
    const target = statuses.find(s => s.id === id);
    addNotification('แก้ไขสถานะเช็กชื่อ', `อัปเดตสถานะ "${statusData.label || statusData.code || target?.label || id}" เรียบร้อยแล้ว`, 'update');
    try {
      await setDoc(doc(db, 'statuses', id), sanitizeForFirestore(statusData, true), { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteStatus = async (id: string) => {
    if (statuses.length <= 1) {
      addNotification('ไม่สามารถลบได้', 'ต้องมีสถานะเช็กชื่ออย่างน้อย 1 รายการในระบบ', 'warning');
      return;
    }
    const st = statuses.find(s => s.id === id);
    setStatuses(prev => prev.filter(s => s.id !== id));
    addNotification('ลบสถานะ', `ลบสถานะ "${st?.label || st?.code || id}" แล้ว`, 'warning');
    try {
      await deleteDoc(doc(db, 'statuses', id));
    } catch (e) {
      console.error(e);
    }
  };

  const resetStatusesToDefault = async () => {
    setStatuses(DEFAULT_STATUSES);
    addNotification('รีเซ็ตสถานะ', 'คืนค่าสถานะเช็กชื่อมาตรฐานเริ่มต้นทั้งหมดแล้ว', 'info');
    try {
      for (const st of DEFAULT_STATUSES) {
        await setDoc(doc(db, 'statuses', st.id), sanitizeForFirestore(st));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const recordAttendance = async (recordData: Omit<AttendanceRecord, 'id'>) => {
    const id = `att_${recordData.date}_${recordData.studentId}`;
    const record: AttendanceRecord = { id, ...recordData };
    setAttendanceRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [...prev, record];
    });
    try {
      await setDoc(doc(db, 'attendance', id), record, { merge: true });
    } catch (e) {
      console.error('Record attendance error:', e);
    }
  };

  const batchRecordAttendance = async (records: Omit<AttendanceRecord, 'id'>[]) => {
    const batch = writeBatch(db);
    const updated = [...attendanceRecords];

    for (const rec of records) {
      const id = `att_${rec.date}_${rec.studentId}`;
      const record: AttendanceRecord = { id, ...rec };
      const ref = doc(db, 'attendance', id);
      batch.set(ref, record, { merge: true });

      const idx = updated.findIndex(r => r.id === id);
      if (idx >= 0) {
        updated[idx] = record;
      } else {
        updated.push(record);
      }
    }

    setAttendanceRecords(updated);
    addNotification('บันทึกเช็กชื่อ', `บันทึกเช็กชื่อทั้งหมด ${records.length} รายการแล้ว`, 'success');

    try {
      await batch.commit();
    } catch (e) {
      console.error('Batch attendance commit error:', e);
    }
  };

  const deleteAttendanceRecord = async (id: string) => {
    setAttendanceRecords(prev => prev.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'attendance', id));
    } catch (e) {
      console.error(e);
    }
  };

  const addAssignment = async (assignmentData: Omit<ArtAssignment, 'id'>) => {
    const id = 'asgn-' + Date.now();
    const newAsgn: ArtAssignment = { id, ...assignmentData, createdAt: Date.now() };
    setAssignments(prev => [...prev, newAsgn]);
    addNotification('สร้างชิ้นงาน', `สร้างรายการชิ้นงาน "${assignmentData.title}" สำเร็จ`, 'success');
    try {
      await setDoc(doc(db, 'assignments', id), newAsgn);
    } catch (e) {
      console.error(e);
    }
  };

  const updateAssignment = async (id: string, assignmentData: Partial<ArtAssignment>) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...assignmentData } : a));
    addNotification('แก้ไขชิ้นงาน', `อัปเดตชิ้นงานแล้ว`, 'update');
    try {
      await setDoc(doc(db, 'assignments', id), assignmentData, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteAssignment = async (id: string) => {
    const a = assignments.find(item => item.id === id);
    setAssignments(prev => prev.filter(item => item.id !== id));
    setGrades(prev => prev.filter(g => g.assignmentId !== id));
    addNotification('ลบชิ้นงาน', `ลบรายการชิ้นงาน "${a?.title || id}" แล้ว`, 'warning');
    try {
      await deleteDoc(doc(db, 'assignments', id));
    } catch (e) {
      console.error(e);
    }
  };

  const saveGrade = async (gradeData: Omit<SubmissionGrade, 'id'>) => {
    const id = `grd_${gradeData.assignmentId}_${gradeData.studentId}`;
    const grade: SubmissionGrade = { id, ...gradeData, updatedAt: Date.now() };
    setGrades(prev => {
      const idx = prev.findIndex(g => g.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = grade;
        return next;
      }
      return [...prev, grade];
    });
    addNotification('บันทึกคะแนน/ผลงาน', `บันทึกคะแนนเรียบร้อยแล้ว`, 'success');
    try {
      await setDoc(doc(db, 'grades', id), grade, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const saveExamRecord = async (recordData: Omit<ExamRecord, 'id'> & { id?: string }) => {
    const id = recordData.id || `exam_${recordData.classId}_${recordData.studentId}`;
    const record: ExamRecord = {
      id,
      studentId: recordData.studentId,
      classId: recordData.classId,
      schoolId: recordData.schoolId,
      midtermScore: recordData.midtermScore !== undefined ? recordData.midtermScore : undefined,
      finalScore: recordData.finalScore !== undefined ? recordData.finalScore : undefined,
      affectiveScore: recordData.affectiveScore !== undefined ? recordData.affectiveScore : undefined,
      note: recordData.note,
      updatedAt: Date.now()
    };

    setExamRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...record };
        return next;
      }
      return [...prev, record];
    });

    try {
      await setDoc(doc(db, 'exam_records', id), sanitizeForFirestore(record, true), { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const batchSaveExamRecords = async (recordsData: (Omit<ExamRecord, 'id'> & { id?: string })[]) => {
    if (recordsData.length === 0) return;

    const formattedRecords: ExamRecord[] = recordsData.map(r => ({
      id: r.id || `exam_${r.classId}_${r.studentId}`,
      studentId: r.studentId,
      classId: r.classId,
      schoolId: r.schoolId,
      midtermScore: r.midtermScore,
      finalScore: r.finalScore,
      affectiveScore: r.affectiveScore,
      note: r.note,
      updatedAt: Date.now()
    }));

    setExamRecords(prev => {
      const map = new Map<string, ExamRecord>();
      prev.forEach(r => map.set(r.id, r));
      formattedRecords.forEach(r => {
        const existing = map.get(r.id);
        map.set(r.id, existing ? { ...existing, ...r } : r);
      });
      return Array.from(map.values());
    });

    addNotification('บันทึกคะแนนสอบ', `บันทึกคะแนนสอบ ${formattedRecords.length} รายการแล้ว`, 'success');

    try {
      const batch = writeBatch(db);
      formattedRecords.forEach(r => {
        const ref = doc(db, 'exam_records', r.id);
        batch.set(ref, sanitizeForFirestore(r, true), { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        schools,
        classRooms,
        students,
        statuses,
        attendanceRecords,
        assignments,
        grades,
        examRecords,
        notifications,
        isOnline,
        isSyncing,
        selectedSchoolId,
        selectedClassId,
        selectedDate,
        setSelectedSchoolId,
        setSelectedClassId,
        setSelectedDate,
        addSchool,
        updateSchool,
        deleteSchool,
        addClassRoom,
        updateClassRoom,
        deleteClassRoom,
        addStudent,
        updateStudent,
        deleteStudent,
        batchAddStudents,
        addStatus,
        updateStatus,
        deleteStatus,
        resetStatusesToDefault,
        recordAttendance,
        batchRecordAttendance,
        deleteAttendanceRecord,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        saveGrade,
        saveExamRecord,
        batchSaveExamRecords,
        addNotification,
        markNotificationRead,
        clearNotifications
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
