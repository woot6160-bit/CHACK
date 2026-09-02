import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { GradeSummaryModal } from './GradeSummaryModal';
import {
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Users,
  Flame,
  Star,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';

export const SummaryTab: React.FC = () => {
  const {
    students,
    attendanceRecords,
    assignments,
    grades,
    selectedSchoolId,
    selectedClassId,
    classRooms,
    schools
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [showGradeSummaryModal, setShowGradeSummaryModal] = useState(false);
  const [sortField, setSortField] = useState<'studentNumber' | 'attendancePct' | 'totalScore' | 'lateCount'>('studentNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const currentClass = classRooms.find(c => c.id === selectedClassId);
  const currentSchool = schools.find(s => s.id === selectedSchoolId);

  // Filter students for current class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, selectedClassId]);

  // Class assignments & max total score
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.classId === selectedClassId);
  }, [assignments, selectedClassId]);

  const totalMaxScore = useMemo(() => {
    return classAssignments.reduce((sum, a) => sum + (a.maxScore || 0), 0);
  }, [classAssignments]);

  // Total distinct dates recorded for this classroom
  const totalRecordedDays = useMemo(() => {
    const dates = new Set(
      attendanceRecords
        .filter(r => r.classId === selectedClassId)
        .map(r => r.date)
    );
    return Math.max(1, dates.size);
  }, [attendanceRecords, selectedClassId]);

  // Calculate Student aggregated metrics
  const studentMetrics = useMemo(() => {
    return classStudents.map(student => {
      const studentAttendance = attendanceRecords.filter(
        r => r.classId === selectedClassId && r.studentId === student.id
      );

      const presentCount = studentAttendance.filter(r => r.status === 'มา' || r.status === 'ซ้อม' || r.status === 'On Hand').length;
      const lateCount = studentAttendance.filter(r => r.status === 'สาย').length;
      const absentCount = studentAttendance.filter(r => r.status === 'ขาด' || r.status === 'หลบ').length;
      const leaveCount = studentAttendance.filter(r => r.status === 'ลา' || r.status === 'ฝาก').length;

      const totalRecorded = studentAttendance.length || 1;
      const attendancePct = Math.round((presentCount / Math.max(totalRecorded, 1)) * 100);

      // Art Scores
      const studentGrades = grades.filter(
        g => g.studentId === student.id && classAssignments.some(a => a.id === g.assignmentId)
      );

      const totalScore = studentGrades.reduce((sum, g) => sum + (g.score || 0), 0);
      const scorePct = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
      const completedAssignments = studentGrades.filter(g => g.status === 'graded' || g.status === 'submitted').length;

      return {
        student,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        attendancePct,
        totalScore,
        scorePct,
        completedAssignments
      };
    });
  }, [classStudents, attendanceRecords, grades, classAssignments, selectedClassId, totalMaxScore]);

  // Sort and filter
  const sortedAndFiltered = useMemo(() => {
    let list = studentMetrics.filter(m => {
      if (!searchTerm.trim()) return true;
      const t = searchTerm.toLowerCase();
      return (
        (m.student.name && m.student.name.toLowerCase().includes(t)) ||
        (m.student.studentNumber && String(m.student.studentNumber).includes(t)) ||
        (m.student.studentCode && String(m.student.studentCode).includes(t))
      );
    });

    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'studentNumber') {
        valA = parseInt(a.student.studentNumber) || 0;
        valB = parseInt(b.student.studentNumber) || 0;
      } else if (sortField === 'attendancePct') {
        valA = a.attendancePct;
        valB = b.attendancePct;
      } else if (sortField === 'totalScore') {
        valA = a.totalScore;
        valB = b.totalScore;
      } else if (sortField === 'lateCount') {
        valA = a.lateCount;
        valB = b.lateCount;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [studentMetrics, searchTerm, sortField, sortAsc]);

  // Classroom overview stats
  const classAvgAttendance = useMemo(() => {
    if (studentMetrics.length === 0) return 0;
    const sum = studentMetrics.reduce((s, m) => s + m.attendancePct, 0);
    return Math.round(sum / studentMetrics.length);
  }, [studentMetrics]);

  const classAvgScore = useMemo(() => {
    if (studentMetrics.length === 0 || totalMaxScore === 0) return 0;
    const sum = studentMetrics.reduce((s, m) => s + m.totalScore, 0);
    return (sum / studentMetrics.length).toFixed(1);
  }, [studentMetrics, totalMaxScore]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Metric Banner in Emerald & Gold */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="starry-canvas-card rounded-3xl p-4 sm:p-5 border border-[#d4af37]/25 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#10b981]/40 text-[#10b981] shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-300 font-medium">นักเรียนทั้งหมด</p>
            <p className="text-xl sm:text-2xl font-black text-[#fcfbf7] mt-0.5">{classStudents.length} <span className="text-xs font-normal text-gray-400">คน</span></p>
          </div>
        </div>

        <div className="starry-canvas-card rounded-3xl p-4 sm:p-5 border border-[#d4af37]/25 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#d4af37]/40 text-[#d4af37] shadow-md">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-300 font-medium">อัตราเข้าเรียนเฉลี่ย</p>
            <p className="text-xl sm:text-2xl font-black text-[#10b981] mt-0.5">{classAvgAttendance}%</p>
          </div>
        </div>

        <div className="starry-canvas-card rounded-3xl p-4 sm:p-5 border border-[#d4af37]/25 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#d4af37]/40 text-[#f3d375] shadow-md">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-300 font-medium">คะแนนเฉลี่ย</p>
            <p className="text-xl sm:text-2xl font-black text-[#f3d375] mt-0.5">{classAvgScore} <span className="text-xs font-normal text-gray-400">/ {totalMaxScore}</span></p>
          </div>
        </div>

        <div className="starry-canvas-card rounded-3xl p-4 sm:p-5 border border-[#d4af37]/25 shadow-lg flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#10b981]/40 text-[#10b981] shadow-md">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-gray-300 font-medium">วันที่เช็กชื่อแล้ว</p>
            <p className="text-xl sm:text-2xl font-black text-[#fcfbf7] mt-0.5">{totalRecordedDays} <span className="text-xs font-normal text-gray-400">วัน</span></p>
          </div>
        </div>
      </div>

      {/* Main Aggregated Table */}
      <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#d4af37]" />
              สรุปภาพรวมรายบุคคล (ประจำภาคเรียน)
            </h3>
            <p className="text-xs text-gray-300">
              ห้องเรียน: <strong className="text-[#10b981]">{currentClass?.name || '-'}</strong> | โรงเรียน: <strong className="text-[#d4af37]">{currentSchool?.name || '-'}</strong>
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowGradeSummaryModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#f3d375]" /> ตารางสรุปคะแนน & สอบ
            </button>

            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ หรือเลขที่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#02140d]/80 border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#fcfbf7] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[#d4af37]/20 text-[#d4af37] font-bold">
                <th
                  onClick={() => toggleSort('studentNumber')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>เลขที่</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">ชื่อ-นามสกุล</th>
                <th className="py-3 px-3 text-center">มา / ปกติ</th>
                <th className="py-3 px-3 text-center">สาย</th>
                <th className="py-3 px-3 text-center">ขาด</th>
                <th className="py-3 px-3 text-center">ลา</th>
                <th
                  onClick={() => toggleSort('attendancePct')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>% เข้าเรียน</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('totalScore')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>คะแนนสะสม</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">ผลการประเมิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAndFiltered.map(({ student, presentCount, lateCount, absentCount, leaveCount, attendancePct, totalScore, completedAssignments }) => {
                const isGoodAttendance = attendancePct >= 80;

                return (
                  <tr key={student.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[#d4af37]">{student.studentNumber}</td>
                    <td className="py-3.5 px-3 font-semibold text-[#fcfbf7]">
                      {student.name}
                      {student.studentCode && <span className="text-[11px] text-gray-400 font-normal ml-2 font-mono">({student.studentCode})</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-400">{presentCount}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-amber-400">{lateCount}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-rose-400">{absentCount}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-blue-400">{leaveCount}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        isGoodAttendance
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}>
                        {attendancePct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-[#f3d375]">
                      {totalScore} <span className="text-[11px] font-normal text-gray-400">/ {totalMaxScore}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {attendancePct >= 80 && totalScore >= totalMaxScore * 0.7 ? (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#d4af37]/20 text-[#f3d375] border border-[#d4af37]/40 flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 text-[#d4af37]" /> ดีเยี่ยม (เกรด 4)
                        </span>
                      ) : attendancePct >= 80 ? (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ผ่านเกณฑ์ปกติ
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          ⚠️ เวลาเรียนไม่พอ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRADE & EXAM SUMMARY MODAL */}
      <GradeSummaryModal
        isOpen={showGradeSummaryModal}
        onClose={() => setShowGradeSummaryModal(false)}
      />
    </div>
  );
};
