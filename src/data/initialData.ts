import { AttendanceStatusConfig, School, ClassRoom, Student } from '../types';

export const DEFAULT_STATUSES: AttendanceStatusConfig[] = [
  { id: 'status-1', code: 'มา', label: 'มาเรียน', color: '#10b981', bgColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', borderColor: 'border-emerald-500' },
  { id: 'status-2', code: 'ขาด', label: 'ขาดเรียน', color: '#ef4444', bgColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', borderColor: 'border-rose-500' },
  { id: 'status-3', code: 'ลา', label: 'ลาป่วย/กิจ', color: '#3b82f6', bgColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', borderColor: 'border-blue-500' },
  { id: 'status-4', code: 'สาย', label: 'มาสาย', color: '#f59e0b', bgColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', borderColor: 'border-amber-500' },
  { id: 'status-5', code: 'ซ้อม', label: 'ไปซ้อมกิจกรรม', color: '#8b5cf6', bgColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', borderColor: 'border-purple-500' },
  { id: 'status-6', code: 'ฝาก', label: 'ฝากงานไว้', color: '#06b6d4', bgColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', borderColor: 'border-cyan-500' },
  { id: 'status-7', code: 'หลบ', label: 'หลบ/โดดเรียน', color: '#ec4899', bgColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40', borderColor: 'border-pink-500' },
  { id: 'status-8', code: 'On Hand', label: 'On Hand (ทำงานส่ง)', color: '#ff7a18', bgColor: 'bg-[#ff7a18]/20 text-[#ffaa55] border-[#ff7a18]/40', borderColor: 'border-[#ff7a18]' },
];

export const INITIAL_SCHOOLS: School[] = [
  { id: 'sch-1', name: 'โรงเรียนสาธิตศิลปศึกษา', code: 'ST-ART' },
  { id: 'sch-2', name: 'โรงเรียนวิจิตรศิลป์วิทยาการ', code: 'VJT-01' }
];

export const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'cls-1', name: 'ม.4/1 (ห้องศิลป์-คำนวณ)', schoolId: 'sch-1', gradeLevel: 'ม.4', academicYear: '2569', term: '1' },
  { id: 'cls-2', name: 'ม.4/2 (ห้องวิจิตรศิลป์)', schoolId: 'sch-1', gradeLevel: 'ม.4', academicYear: '2569', term: '1' },
  { id: 'cls-3', name: 'ม.5/1 (ห้องศิลปะดิจิทัล)', schoolId: 'sch-2', gradeLevel: 'ม.5', academicYear: '2569', term: '1' }
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 'std-1', studentNumber: '01', studentCode: '50101', name: 'นายภูวดล รัตนศิลป์', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-2', studentNumber: '02', studentCode: '50102', name: 'นางสาวกานต์พิชชา แสงจันทร์', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-3', studentNumber: '03', studentCode: '50103', name: 'นายธนกฤต วิจิตรตระการ', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-4', studentNumber: '04', studentCode: '50104', name: 'นางสาวนลินดา สุวรรณคีรี', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-5', studentNumber: '05', studentCode: '50105', name: 'นายปภังกร พุทธรักษา', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-6', studentNumber: '06', studentCode: '50106', name: 'นางสาวพิมลภัส อมรโสภณ', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-7', studentNumber: '07', studentCode: '50107', name: 'นายวรเมธ พงษ์ศิริ', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },
  { id: 'std-8', studentNumber: '08', studentCode: '50108', name: 'นางสาวอภิชญา ทัศนศิลป์', schoolId: 'sch-1', classId: 'cls-1', isLocked: false },

  // class 2
  { id: 'std-9', studentNumber: '01', studentCode: '50201', name: 'นายคณิน มหาสมุทร', schoolId: 'sch-1', classId: 'cls-2', isLocked: false },
  { id: 'std-10', studentNumber: '02', studentCode: '50202', name: 'นางสาวดวงกมล สีคราม', schoolId: 'sch-1', classId: 'cls-2', isLocked: false },
  { id: 'std-11', studentNumber: '03', studentCode: '50203', name: 'นายธีรภัทร ช่างแกะสลัก', schoolId: 'sch-1', classId: 'cls-2', isLocked: false }
];
