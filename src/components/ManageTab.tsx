import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { School, ClassRoom, Student, AttendanceStatusConfig } from '../types';
import { StatusModal } from './StatusModal';
import { SchoolModal } from './SchoolModal';
import {
  School as SchoolIcon,
  BookOpen,
  Users,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRightLeft,
  X,
  Lock,
  Unlock,
  Sparkles,
  Palette,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ManageTab: React.FC = () => {
  const {
    schools,
    classRooms,
    students,
    statuses,
    selectedSchoolId,
    selectedClassId,
    setSelectedSchoolId,
    setSelectedClassId,
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
    deleteStatus,
    resetStatusesToDefault,
    addNotification
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'students' | 'statuses' | 'classes' | 'schools' | 'import'>('students');

  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);

  // In-app Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'student' | 'class' | 'school' | 'status';
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // School modal states
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  // Classroom modal states
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [className, setClassName] = useState('');
  const [classGrade, setClassGrade] = useState('ม.4');
  const [classSchoolTargetId, setClassSchoolTargetId] = useState(selectedSchoolId);

  // Student modal states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentNum, setStudentNum] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentFullName, setStudentFullName] = useState('');
  const [studentTargetClassId, setStudentTargetClassId] = useState(selectedClassId);
  const [studentIsLocked, setStudentIsLocked] = useState(false);

  // Excel / CSV Import states
  const [importSchoolId, setImportSchoolId] = useState(selectedSchoolId);
  const [importClassId, setImportClassId] = useState(selectedClassId);
  const [importConflictMode, setImportConflictMode] = useState<'skip' | 'replace' | 'duplicate'>('skip');
  const [importedPreviewData, setImportedPreviewData] = useState<{
    items: Omit<Student, 'id'>[];
    warnings: string[];
    duplicates: number;
    invalid: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filter students for current selected class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, selectedClassId]);

  // Handle School save
  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) return;

    if (editingSchool) {
      await updateSchool(editingSchool.id, schoolName.trim(), schoolCode.trim());
    } else {
      await addSchool(schoolName.trim(), schoolCode.trim());
    }

    setShowSchoolModal(false);
  };

  // Handle Class save
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    const targetSchoolId = classSchoolTargetId || selectedSchoolId;
    if (editingClass) {
      await updateClassRoom(editingClass.id, className.trim(), targetSchoolId, classGrade.trim());
    } else {
      await addClassRoom(targetSchoolId, className.trim(), classGrade.trim());
    }

    setShowClassModal(false);
  };

  // Handle Student save
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFullName.trim()) return;

    const targetClass = classRooms.find(c => c.id === studentTargetClassId);
    const targetSchoolId = targetClass?.schoolId || selectedSchoolId;

    if (editingStudent) {
      await updateStudent(editingStudent.id, {
        studentNumber: studentNum.trim() || '01',
        studentCode: studentCode.trim(),
        name: studentFullName.trim(),
        schoolId: targetSchoolId,
        classId: studentTargetClassId || selectedClassId,
        isLocked: studentIsLocked
      });
    } else {
      await addStudent({
        studentNumber: studentNum.trim() || '01',
        studentCode: studentCode.trim(),
        name: studentFullName.trim(),
        schoolId: targetSchoolId,
        classId: studentTargetClassId || selectedClassId,
        isLocked: studentIsLocked
      });
    }

    setShowStudentModal(false);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'เลขที่': '01', 'รหัสประจำตัว': '50101', 'ชื่อ-นามสกุล': 'นายธนกฤต วิจิตรศิลป์' },
      { 'เลขที่': '02', 'รหัสประจำตัว': '50102', 'ชื่อ-นามสกุล': 'นางสาวนลินดา สุวรรณคีรี' },
      { 'เลขที่': '03', 'รหัสประจำตัว': '50103', 'ชื่อ-นามสกุล': 'นายปภังกร พุทธรักษา' },
      { 'เลขที่': '04', 'รหัสประจำตัว': '50104', 'ชื่อ-นามสกุล': 'นางสาวกานต์พิชชา แสงจันทร์' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อนักเรียน');
    XLSX.writeFile(workbook, 'ArtRoll_Student_Template.xlsx');
  };

  // Process uploaded Excel / CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          addNotification('ไฟล์ไม่มีข้อมูล', 'ไฟล์ที่อัปโหลดไม่มีข้อมูลแถวรายชื่อนักเรียน', 'warning');
          return;
        }

        const headers: string[] = (data[0] || []).map((h: any) => String(h ?? '').trim());
        
        let numColIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('เลขที่') || h.toLowerCase() === 'no' || h.toLowerCase() === 'number' || h.toLowerCase() === '#'));
        let codeColIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('รหัส') || h.includes('ประจำตัว') || h.toLowerCase() === 'id' || h.toLowerCase() === 'code'));
        let nameColIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('ชื่อ') || h.includes('นามสกุล') || h.toLowerCase() === 'name'));

        if (nameColIdx === -1 && headers.length > 0) {
          nameColIdx = headers.length > 2 ? 2 : 1;
        }
        if (numColIdx === -1 && headers.length > 0) numColIdx = 0;
        if (codeColIdx === -1 && headers.length > 1) codeColIdx = 1;

        const parsedStudents: Omit<Student, 'id'>[] = [];
        const warnings: string[] = [];
        let duplicatesCount = 0;
        let invalidCount = 0;

        const existingClassStudents = students.filter(s => s.schoolId === importSchoolId && s.classId === importClassId);

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rawName = row[nameColIdx] ? String(row[nameColIdx]).trim() : '';
          const rawNum = row[numColIdx] ? String(row[numColIdx]).trim() : String(i).padStart(2, '0');
          const rawCode = row[codeColIdx] ? String(row[codeColIdx]).trim() : '';

          if (!rawName) {
            invalidCount++;
            continue;
          }

          const isDuplicate = existingClassStudents.some(
            s => s.name.trim() === rawName || (rawNum && s.studentNumber === rawNum)
          );

          if (isDuplicate) {
            duplicatesCount++;
          }

          parsedStudents.push({
            studentNumber: rawNum || String(i).padStart(2, '0'),
            studentCode: rawCode,
            name: rawName,
            schoolId: importSchoolId,
            classId: importClassId,
            isLocked: false
          });
        }

        setImportedPreviewData({
          items: parsedStudents,
          warnings,
          duplicates: duplicatesCount,
          invalid: invalidCount
        });
      } catch (err) {
        console.error('File parsing error:', err);
        addNotification('เกิดข้อผิดพลาดในการอ่านไฟล์', 'กรุณาตรวจสอบว่าเป็นไฟล์ Excel (.xlsx, .xls) หรือ CSV ที่ถูกต้อง', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Import
  const handleConfirmImport = async () => {
    if (!importedPreviewData || importedPreviewData.items.length === 0) return;
    setIsImporting(true);

    const existingClassStudents = students.filter(s => s.schoolId === importSchoolId && s.classId === importClassId);

    await batchAddStudents(importedPreviewData.items, importConflictMode, existingClassStudents);

    setIsImporting(false);
    setImportedPreviewData(null);
    setActiveSubTab('students');
  };

  const currentSchoolClasses = classRooms.filter(c => c.schoolId === selectedSchoolId);
  const importSchoolClasses = classRooms.filter(c => c.schoolId === importSchoolId);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sub Navigation Bar with Luxury Gold & Emerald Styling */}
      <div className="starry-canvas-card rounded-3xl p-2 sm:p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none border border-[#d4af37]/25 shadow-lg">
        <button
          onClick={() => setActiveSubTab('students')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
            activeSubTab === 'students'
              ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white shadow-md shadow-[#10b981]/25'
              : 'text-[#fcfbf7]/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> จัดการนักเรียน ({classStudents.length})
        </button>

        <button
          onClick={() => setActiveSubTab('statuses')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
            activeSubTab === 'statuses'
              ? 'bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#b8860b] text-[#02130c] shadow-md shadow-[#d4af37]/25'
              : 'text-[#fcfbf7]/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" /> สถานะเช็กชื่อ ({statuses.length})
        </button>

        <button
          onClick={() => setActiveSubTab('import')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
            activeSubTab === 'import'
              ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white shadow-md shadow-[#10b981]/25'
              : 'text-[#fcfbf7]/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" /> นำเข้ารายชื่อ (Excel/CSV)
        </button>

        <button
          onClick={() => setActiveSubTab('classes')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
            activeSubTab === 'classes'
              ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white shadow-md shadow-[#10b981]/25'
              : 'text-[#fcfbf7]/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" /> ห้องเรียน ({classRooms.length})
        </button>

        <button
          onClick={() => setActiveSubTab('schools')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
            activeSubTab === 'schools'
              ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white shadow-md shadow-[#10b981]/25'
              : 'text-[#fcfbf7]/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <SchoolIcon className="w-4 h-4" /> โรงเรียน ({schools.length})
        </button>
      </div>

      {/* 1. STUDENTS MANAGEMENT */}
      {activeSubTab === 'students' && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#d4af37]" />
                รายชื่อนักเรียนในห้องเรียนปัจจุบัน
              </h3>
              <p className="text-xs text-gray-300">
                แก้ไขเลขที่, ชื่อ, รหัสประจำตัว, ย้ายห้องเรียน หรือเปิด-ปิดสถานะล็อกรายบุคคล
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingStudent(null);
                  setStudentFullName('');
                  setStudentNum(String(classStudents.length + 1).padStart(2, '0'));
                  setStudentCode('');
                  setStudentTargetClassId(selectedClassId);
                  setStudentIsLocked(false);
                  setShowStudentModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> เพิ่มนักเรียน
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[600px] space-y-2.5">
              {classStudents.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <p className="text-sm font-semibold">ยังไม่มีรายชื่อนักเรียนในห้องนี้</p>
                  <p className="text-xs text-gray-500 mt-1">คลิก "+ เพิ่มนักเรียน" หรือไปที่แท็บ "นำเข้ารายชื่อ"</p>
                </div>
              ) : (
                classStudents.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-[#d4af37]/40 hover:bg-white/[0.06] transition-all backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#021810] to-[#062f20] text-xs font-bold text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30 shadow-inner">
                        {st.studentNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#fcfbf7]">{st.name}</span>
                          {st.isLocked && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#d4af37]/20 text-[#f3d375] border border-[#d4af37]/40 flex items-center gap-0.5 shadow-sm">
                              <Lock className="w-2.5 h-2.5" /> ล็อกสถานะ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {st.studentCode && <span>รหัส: <strong className="text-gray-300 font-mono">{st.studentCode}</strong></span>}
                          <span>ห้อง: <strong className="text-[#10b981]">{classRooms.find(c => c.id === st.classId)?.name || '-'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingStudent(st);
                          setStudentFullName(st.name);
                          setStudentNum(st.studentNumber);
                          setStudentCode(st.studentCode || '');
                          setStudentTargetClassId(st.classId);
                          setStudentIsLocked(!!st.isLocked);
                          setShowStudentModal(true);
                        }}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-white/10 hover:border-[#d4af37]/50 transition-all cursor-pointer active:scale-90"
                        title="แก้ไขข้อมูลนักเรียน"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setDeleteTarget({
                            type: 'student',
                            id: st.id,
                            title: st.name,
                            description: `เลขที่ ${st.studentNumber} (ข้อมูลการเช็กชื่อและคะแนนของนักเรียนคนนี้จะถูกลบออก)`
                          });
                        }}
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer active:scale-90"
                        title="ลบนักเรียน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE STATUSES MANAGEMENT */}
      {activeSubTab === 'statuses' && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#d4af37]" />
                จัดการสถานะเช็กชื่อ (Attendance Statuses)
              </h3>
              <p className="text-xs text-gray-300">
                แก้ไขชื่อย่อ, คำอธิบายเต็ม, โทนสี หรือลบ/เพิ่มสถานะการเช็กชื่อของห้องเรียน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetStatusesToDefault}
                className="px-3.5 py-2 rounded-2xl border border-white/15 text-xs text-gray-300 hover:text-white hover:bg-white/5 hover:border-[#d4af37]/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="คืนค่าสถานะมาตรฐานเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#d4af37]" /> คืนค่าเริ่มต้น
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> เพิ่ม/แก้ไขสถานะ
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {statuses.map((st, idx) => (
              <div
                key={st.id}
                className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-[#d4af37]/40 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 border shadow-sm"
                    style={{
                      backgroundColor: `${st.color}22`,
                      borderColor: `${st.color}60`,
                      color: st.color
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span>{st.code}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#fcfbf7] truncate">{st.label}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{st.color}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-white/10 transition-all cursor-pointer active:scale-90"
                    title="แก้ไข"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (statuses.length <= 1) {
                        addNotification('ไม่สามารถลบได้', 'ต้องมีสถานะเช็กชื่ออย่างน้อย 1 รายการในระบบ', 'warning');
                        return;
                      }
                      setDeleteTarget({
                        type: 'status',
                        id: st.id,
                        title: st.label || st.code,
                        description: `รหัสสถานะ: ${st.code} (สี ${st.color})`
                      });
                    }}
                    disabled={statuses.length <= 1}
                    className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border border-white/10 transition-all cursor-pointer active:scale-90 disabled:opacity-30"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. EXCEL / CSV IMPORT */}
      {activeSubTab === 'import' && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#10b981]" />
              นำเข้ารายชื่อนักเรียนจากไฟล์ Excel / CSV
            </h3>
            <p className="text-xs text-gray-300">
              รองรับไฟล์ .xlsx, .xls และ .csv โดยมีหัวคอลัมน์ "เลขที่", "รหัสประจำตัว", "ชื่อ-นามสกุล"
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/30 border border-white/10">
            <div>
              <label className="block text-xs font-bold text-[#d4af37] mb-1">เลือกโรงเรียนปลายทาง:</label>
              <select
                value={importSchoolId}
                onChange={(e) => {
                  setImportSchoolId(e.target.value);
                  const firstClass = classRooms.find(c => c.schoolId === e.target.value);
                  if (firstClass) setImportClassId(firstClass.id);
                }}
                className="w-full bg-[#02140d] border border-[#d4af37]/30 rounded-xl px-3 py-2 text-sm text-[#fcfbf7] outline-none cursor-pointer"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#10b981] mb-1">เลือกห้องเรียนปลายทาง:</label>
              <select
                value={importClassId}
                onChange={(e) => setImportClassId(e.target.value)}
                className="w-full bg-[#02140d] border border-[#10b981]/30 rounded-xl px-3 py-2 text-sm text-[#fcfbf7] outline-none cursor-pointer"
              >
                {importSchoolClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="p-8 border-2 border-dashed border-[#d4af37]/35 rounded-3xl text-center bg-black/20 hover:bg-black/30 transition-all">
            <FileSpreadsheet className="w-12 h-12 text-[#d4af37] mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-bold text-[#fcfbf7]">ลากไฟล์ Excel / CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
            <p className="text-xs text-gray-400 mt-1">ไฟล์ตัวอย่างมีหัวคอลัมน์มาตรฐาน เลขที่, รหัสประจำตัว, ชื่อ-นามสกุล</p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <label className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e5c158] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg cursor-pointer hover:brightness-110 transition-all active:scale-95">
                เลือกไฟล์เพื่อนำเข้า
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 rounded-2xl border border-white/20 text-xs sm:text-sm text-gray-200 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 text-[#d4af37]" /> ดาวน์โหลดไฟล์แม่แบบตัวอย่าง (.xlsx)
              </button>
            </div>
          </div>

          {/* Preview imported items */}
          {importedPreviewData && (
            <div className="p-5 rounded-3xl bg-black/40 border border-[#10b981]/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h4 className="font-bold text-sm text-[#10b981] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    พบข้อมูลนักเรียนพร้อมนำเข้า: {importedPreviewData.items.length} คน
                  </h4>
                  {importedPreviewData.duplicates > 0 && (
                    <p className="text-xs text-amber-300 mt-0.5">
                      ⚠️ มีรายชื่อซ้ำกับในระบบปัจจุบัน {importedPreviewData.duplicates} คน
                    </p>
                  )}
                </div>

                {/* Conflict Strategy */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-300">หากพบข้อมูลซ้ำ:</span>
                  <select
                    value={importConflictMode}
                    onChange={(e: any) => setImportConflictMode(e.target.value)}
                    className="bg-[#02140d] border border-white/20 rounded-xl px-2.5 py-1 text-xs text-[#fcfbf7] outline-none"
                  >
                    <option value="skip">ข้ามรายการที่ซ้ำ</option>
                    <option value="replace">อัปเดตทับข้อมูลเดิม</option>
                    <option value="duplicate">เพิ่มซ้ำเป็นคนใหม่</option>
                  </select>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {importedPreviewData.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 text-center font-bold text-[#d4af37]">{it.studentNumber}</span>
                      <span className="text-[#fcfbf7] font-medium">{it.name}</span>
                      {it.studentCode && <span className="text-gray-400 font-mono">({it.studentCode})</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setImportedPreviewData(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#10b981]/30 hover:brightness-110 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isImporting ? 'กำลังบันทึกลงระบบ...' : 'ยืนยันการนำเข้าทั้งหมด'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. CLASSROOMS MANAGEMENT */}
      {activeSubTab === 'classes' && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#10b981]" />
                รายชื่อห้องเรียนทั้งหมด ({classRooms.length} ห้อง)
              </h3>
              <p className="text-xs text-gray-300">เพิ่ม, แก้ไข หรือจัดการห้องเรียนในแต่ละโรงเรียน</p>
            </div>

            <button
              onClick={() => {
                setEditingClass(null);
                setClassName('');
                setClassGrade('ม.4');
                setClassSchoolTargetId(selectedSchoolId);
                setShowClassModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> เพิ่มห้องเรียน
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {classRooms.map((c) => {
              const count = students.filter(s => s.classId === c.id).length;
              const school = schools.find(s => s.id === c.schoolId);
              return (
                <div key={c.id} className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-[#10b981]/50 transition-all flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#fcfbf7]">{c.name}</h4>
                    <p className="text-xs text-[#d4af37] font-medium">{school?.name || '-'}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">นักเรียน: <strong className="text-white">{count}</strong> คน</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingClass(c);
                        setClassName(c.name);
                        setClassGrade(c.gradeLevel || 'ม.4');
                        setClassSchoolTargetId(c.schoolId);
                        setShowClassModal(true);
                      }}
                      className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-[#10b981]/20 text-[#10b981] border border-white/10 transition-all cursor-pointer active:scale-90"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({
                          type: 'class',
                          id: c.id,
                          title: c.name,
                          description: `ห้องเรียน ${c.name} (${count} คน)`
                        });
                      }}
                      className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border border-white/10 transition-all cursor-pointer active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SCHOOLS MANAGEMENT */}
      {activeSubTab === 'schools' && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-[#d4af37]" />
                รายชื่อโรงเรียน / สถาบันการศึกษา ({schools.length} แห่ง)
              </h3>
              <p className="text-xs text-gray-300">จัดการข้อมูลโรงเรียนและรหัสคำย่อ</p>
            </div>

            <button
              onClick={() => {
                setEditingSchool(null);
                setSchoolName('');
                setSchoolCode('');
                setShowSchoolModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> เพิ่มโรงเรียน
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {schools.map((s) => {
              const countClasses = classRooms.filter(c => c.schoolId === s.id).length;
              return (
                <div key={s.id} className="p-4 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-[#d4af37]/50 transition-all flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#fcfbf7]">{s.name}</h4>
                    {s.code && <p className="text-xs text-[#d4af37] font-mono">รหัส: {s.code}</p>}
                    <p className="text-[11px] text-gray-400 mt-0.5">จำนวนห้องเรียน: <strong className="text-white">{countClasses}</strong> ห้อง</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSchool(s);
                        setSchoolName(s.name);
                        setSchoolCode(s.code || '');
                        setShowSchoolModal(true);
                      }}
                      className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-white/10 transition-all cursor-pointer active:scale-90"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (schools.length <= 1) {
                          return;
                        }
                        setDeleteTarget({
                          type: 'school',
                          id: s.id,
                          title: s.name,
                          description: `โรงเรียน ${s.name} (ห้องเรียนและข้อมูลที่เกี่ยวข้อง)`
                        });
                      }}
                      disabled={schools.length <= 1}
                      className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border border-white/10 transition-all cursor-pointer active:scale-90 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden transition-all animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStudentModal(false);
          }}
        >
          <div className="relative bg-[#041c14] backdrop-blur-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col border-2 border-[#d4af37]/45 text-[#fcfbf7] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 border-b border-[#d4af37]/20 bg-gradient-to-r from-[#03150e] to-[#041a12] shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-[#fcfbf7]">
                {editingStudent ? '✏️ แก้ไขข้อมูลนักเรียน' : '➕ เพิ่มนักเรียนใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body - Scrollable if needed */}
            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-[11px] text-[#d4af37] font-bold mb-1">เลขที่: *</label>
                  <input
                    type="text"
                    required
                    value={studentNum}
                    onChange={(e) => setStudentNum(e.target.value)}
                    placeholder="01"
                    className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] text-gray-300 font-bold mb-1">รหัสประจำตัว:</label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="เช่น 50101"
                    className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#d4af37] font-bold mb-1">ชื่อ-นามสกุล: *</label>
                <input
                  type="text"
                  required
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  placeholder="เช่น นายธนกฤต วิจิตรศิลป์"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-300 font-bold mb-1">ห้องเรียน:</label>
                <select
                  value={studentTargetClassId}
                  onChange={(e) => setStudentTargetClassId(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none cursor-pointer"
                >
                  {currentSchoolClasses.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#041c14] text-white">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lockCheck"
                  checked={studentIsLocked}
                  onChange={(e) => setStudentIsLocked(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d4af37] bg-black/40 border-white/20 cursor-pointer"
                />
                <label htmlFor="lockCheck" className="text-xs text-gray-300 cursor-pointer select-none">
                  ล็อกสถานะเช็กชื่อของนักเรียนคนนี้
                </label>
              </div>

              {/* Action Footer - Fixed */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-gray-300 hover:bg-white/10 cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#d4af37] to-[#e5c158] text-[#02130c] shadow-md shadow-[#d4af37]/30 hover:brightness-110 cursor-pointer active:scale-95"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASSROOM MODAL */}
      {showClassModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden transition-all animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowClassModal(false);
          }}
        >
          <div className="relative bg-[#041c14] backdrop-blur-2xl rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col border-2 border-[#10b981]/45 text-[#fcfbf7] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#03150e] to-[#041a12] shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-[#fcfbf7]">
                {editingClass ? '✏️ แก้ไขห้องเรียน' : '➕ เพิ่มห้องเรียนใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setShowClassModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveClass} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              <div>
                <label className="block text-[11px] text-[#10b981] font-bold mb-1">ชื่อห้องเรียน: *</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="เช่น ม.4/1 (ห้องศิลป์-คำนวณ)"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#10b981] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-300 font-bold mb-1">สังกัดโรงเรียน:</label>
                <select
                  value={classSchoolTargetId}
                  onChange={(e) => setClassSchoolTargetId(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 focus:border-[#10b981] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none cursor-pointer"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#041c14] text-white">{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-300 font-bold mb-1">ระดับชั้น:</label>
                <input
                  type="text"
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  placeholder="เช่น ม.4, ม.5, ป.6"
                  className="w-full bg-black/40 border border-white/15 focus:border-[#10b981] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none"
                />
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-gray-300 hover:bg-white/10 cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#059669] to-[#10b981] text-white shadow-md shadow-[#10b981]/30 hover:brightness-110 cursor-pointer active:scale-95"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHOOL MODAL */}
      {showSchoolModal && (
        <SchoolModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          initialEditingSchool={editingSchool}
        />
      )}

      {/* STATUS MANAGER MODAL */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deleteTarget && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteTarget(null);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden border-2 border-rose-500/50 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.2)] bg-gradient-to-br from-[#fbf8ee] via-[#f7f2e4] to-[#ede4d0] text-[#14281e] p-5 sm:p-6 transition-all animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-[#0f291e] tracking-tight">
                  ยืนยันการลบ{deleteTarget.type === 'student' ? 'นักเรียน' : deleteTarget.type === 'class' ? 'ห้องเรียน' : 'โรงเรียน'}
                </h3>
                <p className="text-xs text-[#5c685f] mt-0.5">
                  การลบนี้จะมีผลทันทีและไม่สามารถย้อนกลับได้
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-7 h-7 rounded-full bg-[#ebe3d0] hover:bg-[#ded4be] text-[#4a554d] hover:text-[#112419] flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-white/80 border border-[#d4af37]/35 shadow-inner">
              <p className="text-xs sm:text-sm text-[#0f291e] font-semibold">
                คุณต้องการลบ <span className="text-rose-700 font-extrabold underline">"{deleteTarget.title}"</span> ใช่หรือไม่?
              </p>
              {deleteTarget.description && (
                <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <span>⚠️</span> {deleteTarget.description}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#4b5563] hover:text-[#111827] bg-[#ebe3d0] hover:bg-[#ded4be] border border-[#d4af37]/30 transition-all cursor-pointer active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target.type === 'student') {
                    await deleteStudent(target.id);
                  } else if (target.type === 'class') {
                    await deleteClassRoom(target.id);
                  } else if (target.type === 'school') {
                    await deleteSchool(target.id);
                  } else if (target.type === 'status') {
                    await deleteStatus(target.id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white shadow-md shadow-rose-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
