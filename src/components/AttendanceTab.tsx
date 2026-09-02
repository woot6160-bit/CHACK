import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AttendanceRecord } from '../types';
import { StatusModal } from './StatusModal';
import {
  Calendar,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  Settings2,
  Clock,
  Zap,
  Users,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AttendanceTab: React.FC = () => {
  const {
    students,
    statuses,
    attendanceRecords,
    selectedSchoolId,
    selectedClassId,
    selectedDate,
    setSelectedDate,
    recordAttendance,
    batchRecordAttendance,
    updateStudent
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Filter students for current classroom
  const currentClassStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, selectedClassId]);

  // Search filtered
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return currentClassStudents;
    const term = searchTerm.toLowerCase();
    return currentClassStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.studentNumber && String(s.studentNumber).includes(term)) ||
      (s.studentCode && String(s.studentCode).includes(term))
    );
  }, [currentClassStudents, searchTerm]);

  // Map student attendance for selected date
  const dateAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords
      .filter(r => r.date === selectedDate && r.classId === selectedClassId)
      .forEach(r => {
        map.set(r.studentId, r);
      });
    return map;
  }, [attendanceRecords, selectedDate, selectedClassId]);

  // Calculate quick stats for selected date
  const attendanceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    statuses.forEach(st => {
      stats[st.code] = 0;
    });
    let checkedCount = 0;

    currentClassStudents.forEach(st => {
      const rec = dateAttendanceMap.get(st.id);
      if (rec && rec.status) {
        checkedCount++;
        stats[rec.status] = (stats[rec.status] || 0) + 1;
      }
    });

    return {
      total: currentClassStudents.length,
      checked: checkedCount,
      pending: currentClassStudents.length - checkedCount,
      stats
    };
  }, [statuses, currentClassStudents, dateAttendanceMap]);

  // Handle single attendance check
  const handleSetStatus = async (studentId: string, statusCode: string) => {
    const student = students.find(s => s.id === studentId);
    if (student?.isLocked) {
      return; // Locked students cannot be changed without unlocking
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    await recordAttendance({
      date: selectedDate,
      schoolId: selectedSchoolId,
      classId: selectedClassId,
      studentId,
      status: statusCode,
      checkInTime: timeStr,
      timestamp: Date.now()
    });
  };

  // Quick mark all present or other status
  const handleMarkAll = async (statusCode: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = [];

    currentClassStudents.forEach(st => {
      if (st.isLocked && st.lockedStatus) {
        recordsToSave.push({
          date: selectedDate,
          schoolId: selectedSchoolId,
          classId: selectedClassId,
          studentId: st.id,
          status: st.lockedStatus,
          checkInTime: timeStr,
          timestamp: Date.now()
        });
      } else {
        recordsToSave.push({
          date: selectedDate,
          schoolId: selectedSchoolId,
          classId: selectedClassId,
          studentId: st.id,
          status: statusCode,
          checkInTime: timeStr,
          timestamp: Date.now()
        });
      }
    });

    await batchRecordAttendance(recordsToSave);

    if (statusCode === 'มา') {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#10b981', '#d4af37', '#f3d375', '#ffffff']
      });
    }
  };

  // Toggle student lock status
  const toggleStudentLock = async (studentId: string, currentStatus?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newLocked = !student.isLocked;
    await updateStudent(studentId, {
      isLocked: newLocked,
      lockedStatus: newLocked ? (currentStatus || 'มา') : undefined
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Controls: Date picker, Fast Batch Actions & Search */}
      <div className="starry-canvas-card rounded-3xl p-4 sm:p-6 border border-[#d4af37]/25 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Selector & Total info */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#02140d]/80 px-4 py-2.5 rounded-2xl border border-[#d4af37]/30 backdrop-blur-xl shadow-inner">
              <Calendar className="w-4 h-4 text-[#d4af37]" />
              <label className="text-xs text-[#d4af37] font-bold">วันที่เช็กชื่อ:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-[#fcfbf7] font-semibold outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-[#fcfbf7]/80 bg-white/[0.04] px-3.5 py-2 rounded-2xl border border-white/10">
              <Users className="w-4 h-4 text-[#10b981]" />
              <span>นักเรียนในห้อง: <strong className="text-white font-bold">{currentClassStudents.length}</strong> คน</span>
            </div>
          </div>

          {/* Quick Mark All Bar & Manage Statuses Button */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#d4af37] font-bold mr-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#d4af37]" /> เช็กทั้งห้อง:
            </span>
            <button
              onClick={() => handleMarkAll('มา')}
              className="px-3.5 py-2 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md shadow-[#10b981]/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-90"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> มาหมด
            </button>
            <button
              onClick={() => handleMarkAll('ขาด')}
              className="px-3.5 py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-90"
            >
              ขาดหมด
            </button>
            <button
              onClick={() => handleMarkAll('On Hand')}
              className="px-3.5 py-2 bg-gradient-to-r from-[#b45309] to-[#d97706] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-90"
            >
              On Hand ทั้งหมด
            </button>

            {/* Manage/Edit Statuses Button */}
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-[#d4af37]/20 via-[#f3d375]/25 to-[#d4af37]/20 hover:bg-[#d4af37]/35 text-[#fcfbf7] border border-[#d4af37]/50 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-90 ml-auto sm:ml-0"
              title="จัดการ, แก้ไข หรือลบสถานะเช็กชื่อ"
            >
              <Settings2 className="w-4 h-4 text-[#d4af37]" />
              <span>จัดการ/แก้ไขสถานะ</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Stats Pills */}
        <div className="mt-4 pt-3.5 border-t border-[#d4af37]/20 flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[#d4af37]/30 text-[#fcfbf7]/90 backdrop-blur-md shadow-sm">
            เช็กแล้ว: <span className="font-extrabold text-[#10b981]">{attendanceStats.checked}</span> / {attendanceStats.total} คน
          </div>
          {statuses.map(st => {
            const count = attendanceStats.stats[st.code] || 0;
            return (
              <div
                key={st.id}
                className="px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 font-bold backdrop-blur-md shadow-sm transition-all"
                style={{
                  backgroundColor: `${st.color}1c`,
                  borderColor: `${st.color}50`,
                  color: st.color
                }}
              >
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: st.color }} />
                <span>{st.code}: <strong className="text-white ml-0.5">{count}</strong></span>
              </div>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mt-3.5 relative">
          <Search className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เลขที่, หรือรหัสประจำตัวนักเรียน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#02140d]/70 border border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#fcfbf7] placeholder-gray-400 outline-none backdrop-blur-md transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Student Attendance List / Compact Space-Saving Table & Cards */}
      {filteredStudents.length === 0 ? (
        <div className="starry-canvas-card rounded-3xl p-8 sm:p-12 text-center border border-[#d4af37]/20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-[#10b981]/20 text-[#d4af37] flex items-center justify-center mx-auto mb-3 border border-[#d4af37]/30 backdrop-blur-md shadow-lg">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7]">
            {searchTerm ? 'ไม่พบรายชื่อนักเรียนที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลนักเรียนในห้องเรียนนี้'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-md mx-auto">
            {searchTerm ? 'กรุณาลองค้นหาด้วยคำอื่น หรือกดกากบาทเพื่อล้างคำค้น' : 'สามารถเพิ่มนักเรียนรายคนหรือนำเข้าจากไฟล์ Excel/CSV ได้ที่แท็บ "จัดการข้อมูล"'}
          </p>
        </div>
      ) : (
        <div className="starry-canvas-card rounded-3xl border border-[#d4af37]/25 overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
          {/* Header Bar for List */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-[#021810]/90 border-b border-[#d4af37]/20 text-xs font-bold text-[#d4af37]">
            <div className="sm:col-span-1 text-center">เลขที่</div>
            <div className="sm:col-span-7">ชื่อ - นามสกุล นักเรียน</div>
            <div className="sm:col-span-4 text-center">สถานะการเช็กชื่อ</div>
          </div>

          <div className="divide-y divide-[#d4af37]/15">
            {filteredStudents.map((student) => {
              const record = dateAttendanceMap.get(student.id);
              const currentStatus = record?.status;
              const isLocked = !!student.isLocked;
              const activeStatusObj = statuses.find(s => s.code === currentStatus);

              return (
                <div
                  key={student.id}
                  className={`p-3 sm:px-5 sm:py-3.5 transition-all flex flex-col sm:grid sm:grid-cols-12 items-stretch sm:items-center gap-3 sm:gap-4 ${
                    isLocked
                      ? 'bg-[#06241a]/90'
                      : 'hover:bg-[#052b1f]/60 bg-transparent'
                  }`}
                >
                  {/* Column 1: Student Number Badge (Mobile + Desktop) */}
                  <div className="sm:col-span-1 flex items-center sm:justify-center">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#d4af37]/40 backdrop-blur-md flex flex-col items-center justify-center shrink-0 shadow-sm">
                      <span className="text-xs sm:text-sm font-extrabold text-[#fcfbf7] leading-none">
                        {student.studentNumber}
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Full Name & Surname in Single Unified Block */}
                  <div className="sm:col-span-7 min-w-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Name & Surname on same row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-[#fcfbf7] leading-tight break-words">
                          {student.name}
                        </span>

                        {isLocked && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#d4af37]/25 text-[#f3d375] border border-[#d4af37]/50 flex items-center gap-0.5 shrink-0 shadow-sm">
                            <Lock className="w-2.5 h-2.5" /> ล็อก
                          </span>
                        )}
                      </div>

                      {/* Sub-info: Student ID Code & Check-in timestamp */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-300 mt-1">
                        {student.studentCode && (
                          <span>รหัส: <strong className="text-white font-mono">{student.studentCode}</strong></span>
                        )}
                        {record?.checkInTime && (
                          <span className="flex items-center gap-1 text-[#10b981] font-medium">
                            <Clock className="w-2.5 h-2.5" /> {record.checkInTime}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Lock Button */}
                    <button
                      onClick={() => toggleStudentLock(student.id, currentStatus)}
                      className={`p-1.5 sm:p-2 rounded-xl border transition-all shrink-0 cursor-pointer active:scale-90 ${
                        isLocked
                          ? 'bg-[#d4af37]/25 text-[#f3d375] border-[#d4af37]/50 shadow-sm'
                          : 'bg-white/[0.04] text-gray-400 border-white/10 hover:text-white hover:bg-white/10 hover:border-[#d4af37]/30'
                      }`}
                      title={isLocked ? 'ปลดล็อกเพื่อแก้ไขสถานะ' : 'ล็อกสถานะ'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Column 3: Single Compact Unified Status Selector */}
                  <div className="sm:col-span-4 flex items-center justify-end sm:justify-center">
                    <div className="relative w-full max-w-[200px] sm:max-w-none">
                      {/* Styled Custom Select Box */}
                      <div
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-between gap-2 shadow-sm ${
                          isLocked
                            ? 'opacity-75 cursor-not-allowed bg-black/40 border-white/10'
                            : 'cursor-pointer hover:brightness-110 active:scale-95'
                        }`}
                        style={{
                          backgroundColor: activeStatusObj ? `${activeStatusObj.color}25` : '#02150e',
                          borderColor: activeStatusObj ? activeStatusObj.color : 'rgba(212,175,55,0.3)',
                          color: activeStatusObj ? '#ffffff' : 'rgba(252,251,247,0.7)',
                          boxShadow: activeStatusObj ? `0 0 12px ${activeStatusObj.color}35` : 'none'
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: activeStatusObj ? activeStatusObj.color : '#9ca3af'
                            }}
                          />
                          <span className="truncate">
                            {activeStatusObj ? activeStatusObj.code : 'ยังไม่ได้เช็ก'}
                          </span>
                        </div>

                        <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0 opacity-70" />
                      </div>

                      {/* Native Select Overlay for 100% Reliable Cross-Platform & Mobile Interaction */}
                      <select
                        disabled={isLocked}
                        value={currentStatus || ''}
                        onChange={(e) => handleSetStatus(student.id, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        title="คลิกเพื่อเลือกสถานะเช็กชื่อ"
                      >
                        <option value="" disabled className="bg-[#02150e] text-gray-400">
                          -- เลือกสถานะ --
                        </option>
                        {statuses.map((st) => (
                          <option
                            key={st.id}
                            value={st.code}
                            className="bg-[#021810] text-[#fcfbf7] py-1 font-semibold"
                          >
                            {st.code} {st.label ? `(${st.label})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Status Management Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />
    </div>
  );
};
