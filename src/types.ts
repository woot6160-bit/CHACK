export interface AttendanceStatusConfig {
  id: string;
  code: string; // e.g. 'มา', 'ขาด', 'ลา', 'สาย', 'ซ้อม', 'ฝาก', 'หลบ', 'on_hand'
  label: string;
  color: string; // Tailwind color or hex
  bgColor: string;
  borderColor: string;
  isCustom?: boolean;
}

export interface Student {
  id: string;
  studentNumber: string; // เลขที่
  studentCode: string; // เลขประจำตัว
  name: string; // ชื่อ-นามสกุล
  schoolId: string;
  classId: string;
  isLocked?: boolean; // ล็อกสถานะ
  lockedStatus?: string; // สถานะที่ล็อกไว้
  avatar?: string;
  notes?: string;
  createdAt?: number;
}

export interface ClassRoom {
  id: string;
  name: string; // เช่น ม.1/1, ม.4/2
  schoolId: string;
  gradeLevel?: string;
  academicYear?: string;
  term?: string;
}

export interface School {
  id: string;
  name: string;
  code?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  schoolId: string;
  classId: string;
  studentId: string;
  status: string; // 'มา' | 'ขาด' | 'ลา' | 'สาย' | 'ซ้อม' | 'ฝาก' | 'หลบ' | 'on_hand' or custom
  checkInTime: string; // HH:mm:ss
  timestamp: number;
  note?: string;
}

export interface ArtAssignment {
  id: string;
  schoolId: string;
  classId: string;
  title: string;
  description?: string;
  maxScore: number;
  dueDate?: string;
  category?: string; // วาดเส้น, สีน้ำ, ประติมากรรม, ทฤษฎีศิลปะ, อื่นๆ
  createdAt: number;
}

export interface SubmissionGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  score: number;
  status: 'submitted' | 'pending' | 'graded' | 'late' | 'missing';
  artworkImage?: string; // Base64 data URL or photo URL
  feedback?: string;
  submittedAt?: string;
  updatedAt?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'update';
  timestamp: number;
  read: boolean;
}

export interface ExamRecord {
  id: string;
  studentId: string;
  classId: string;
  schoolId: string;
  midtermScore?: number; // คะแนนสอบกลางภาค
  finalScore?: number;   // คะแนนสอบปลายภาค
  affectiveScore?: number; // จิตพิสัย / คุณลักษณะ
  note?: string;
  updatedAt?: number;
}

export interface ExamConfig {
  midtermMax: number;
  finalMax: number;
  affectiveMax: number;
}

export interface AppState {
  schools: School[];
  classRooms: ClassRoom[];
  students: Student[];
  statuses: AttendanceStatusConfig[];
  attendanceRecords: AttendanceRecord[];
  assignments: ArtAssignment[];
  grades: SubmissionGrade[];
  examRecords: ExamRecord[];
  notifications: NotificationItem[];
}

