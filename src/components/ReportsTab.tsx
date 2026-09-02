import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GradeSummaryModal } from './GradeSummaryModal';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Sparkles,
  School as SchoolIcon,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ReportsTab: React.FC = () => {
  const {
    students,
    attendanceRecords,
    assignments,
    grades,
    examRecords,
    selectedSchoolId,
    selectedClassId,
    schools,
    classRooms,
    statuses
  } = useApp();

  const [reportMode, setReportMode] = useState<'attendance' | 'grades'>('attendance');
  const [showGradeSummaryModal, setShowGradeSummaryModal] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teacherName, setTeacherName] = useState('ครูผู้สอนวิชาศิลปะ');
  const [reportTitle, setReportTitle] = useState('รายงานการเข้าเรียนและผลการประเมินวิชาศิลปะ');

  const currentSchool = schools.find(s => s.id === selectedSchoolId);
  const currentClass = classRooms.find(c => c.id === selectedClassId);

  // Filter students for current class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, selectedClassId]);

  // Filter attendance records in date range
  const rangeRecords = useMemo(() => {
    return attendanceRecords.filter(r =>
      r.classId === selectedClassId &&
      r.date >= startDate &&
      r.date <= endDate
    );
  }, [attendanceRecords, selectedClassId, startDate, endDate]);

  // Distinct dates in range
  const datesInRange = useMemo(() => {
    const set = new Set(rangeRecords.map(r => r.date));
    return Array.from(set).sort();
  }, [rangeRecords]);

  // Assignments for current class
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.classId === selectedClassId);
  }, [assignments, selectedClassId]);

  const totalMaxScore = useMemo(() => {
    return classAssignments.reduce((sum, a) => sum + (a.maxScore || 0), 0);
  }, [classAssignments]);

  // Aggregated data per student for report
  const studentReportData = useMemo(() => {
    return classStudents.map(student => {
      const studentRangeRecords = rangeRecords.filter(r => r.studentId === student.id);
      const presentCount = studentRangeRecords.filter(r => r.status === 'มา' || r.status === 'ซ้อม' || r.status === 'On Hand').length;
      const lateCount = studentRangeRecords.filter(r => r.status === 'สาย').length;
      const absentCount = studentRangeRecords.filter(r => r.status === 'ขาด' || r.status === 'หลบ').length;
      const leaveCount = studentRangeRecords.filter(r => r.status === 'ลา' || r.status === 'ฝาก').length;

      const totalRecorded = studentRangeRecords.length || 1;
      const attendancePct = Math.round((presentCount / Math.max(totalRecorded, 1)) * 100);

      // Grades
      const studentGrades = grades.filter(g => g.studentId === student.id && classAssignments.some(a => a.id === g.assignmentId));
      const totalScore = studentGrades.reduce((sum, g) => sum + (g.score || 0), 0);

      return {
        student,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        attendancePct,
        totalScore
      };
    });
  }, [classStudents, rangeRecords, grades, classAssignments]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = studentReportData.map(d => ({
      'เลขที่': d.student.studentNumber,
      'รหัสประจำตัว': d.student.studentCode || '-',
      'ชื่อ-นามสกุล': d.student.name,
      'มา/ปกติ (ครั้ง)': d.presentCount,
      'สาย (ครั้ง)': d.lateCount,
      'ขาด (ครั้ง)': d.absentCount,
      'ลา (ครั้ง)': d.leaveCount,
      'อัตราการเข้าเรียน (%)': `${d.attendancePct}%`,
      'คะแนนสะสม': d.totalScore,
      'คะแนนเต็ม': totalMaxScore,
      'สถานะการประเมิน': d.attendancePct >= 80 ? 'ผ่านเกณฑ์' : 'เวลาเรียนไม่พอ'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานสรุป');

    const fileName = `ArtRoll_${currentClass?.name || 'Class'}_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Configuration & Action Card (Hidden on Print) */}
      <div className="no-print starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#d4af37]" />
              ระบบออกรายงาน & พิมพ์เอกสาร A4
            </h3>
            <p className="text-xs text-gray-300">
              กำหนดช่วงเวลาที่ต้องการสรุป ดาวน์โหลดไฟล์ Excel หรือพิมพ์เอกสารเพื่อเสนอฝ่ายวิชาการ
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowGradeSummaryModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#f3d375]" /> ตารางคะแนน & สอบรวม
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/15 text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-[#10b981]" /> ส่งออก Excel (.xlsx)
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" /> พิมพ์เอกสาร A4
            </button>
          </div>
        </div>

        {/* Date Filter & Metadata input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">ตั้งแต่วันที่:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#02140d] border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">ถึงวันที่:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-[#02140d] border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#10b981] mb-1">ชื่อรายงาน:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full bg-[#02140d] border border-[#10b981]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#10b981] mb-1">ชื่อครูผู้สอน:</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-[#02140d] border border-[#10b981]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Official A4 Document Layout (Formatted for Print and Screen Preview) */}
      <div className="bg-white text-gray-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-gray-200 print-a4-page">
        {/* Document Header */}
        <div className="text-center pb-6 border-b-2 border-gray-800">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">{reportTitle}</h2>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            โรงเรียน {currentSchool?.name || '-'} | ห้องเรียน {currentClass?.name || '-'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ช่วงเวลาที่ประเมิน: {startDate} ถึง {endDate} (รวม {datesInRange.length} วันที่มีการสอน)
          </p>
        </div>

        {/* Report Content Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-950 text-white font-bold">
                <th className="py-2.5 px-3 border border-emerald-900 text-center">เลขที่</th>
                <th className="py-2.5 px-3 border border-emerald-900">รหัส</th>
                <th className="py-2.5 px-3 border border-emerald-900">ชื่อ-นามสกุล</th>
                <th className="py-2.5 px-2 border border-emerald-900 text-center">มา</th>
                <th className="py-2.5 px-2 border border-emerald-900 text-center">สาย</th>
                <th className="py-2.5 px-2 border border-emerald-900 text-center">ขาด</th>
                <th className="py-2.5 px-2 border border-emerald-900 text-center">ลา</th>
                <th className="py-2.5 px-2 border border-emerald-900 text-center">% เข้าเรียน</th>
                <th className="py-2.5 px-3 border border-emerald-900 text-right">คะแนนรวม</th>
                <th className="py-2.5 px-3 border border-emerald-900 text-center">ผลการประเมิน</th>
              </tr>
            </thead>
            <tbody>
              {studentReportData.map((d, idx) => (
                <tr key={d.student.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="py-2 px-3 border border-gray-300 text-center font-bold text-gray-800">{d.student.studentNumber}</td>
                  <td className="py-2 px-3 border border-gray-300 font-mono text-gray-600">{d.student.studentCode || '-'}</td>
                  <td className="py-2 px-3 border border-gray-300 font-medium text-gray-900">{d.student.name}</td>
                  <td className="py-2 px-2 border border-gray-300 text-center font-semibold text-emerald-800">{d.presentCount}</td>
                  <td className="py-2 px-2 border border-gray-300 text-center text-amber-700">{d.lateCount}</td>
                  <td className="py-2 px-2 border border-gray-300 text-center text-rose-700 font-bold">{d.absentCount}</td>
                  <td className="py-2 px-2 border border-gray-300 text-center text-blue-700">{d.leaveCount}</td>
                  <td className="py-2 px-2 border border-gray-300 text-center font-bold text-gray-900">{d.attendancePct}%</td>
                  <td className="py-2 px-3 border border-gray-300 text-right font-bold text-amber-900">
                    {d.totalScore} / {totalMaxScore}
                  </td>
                  <td className="py-2 px-3 border border-gray-300 text-center font-semibold">
                    {d.attendancePct >= 80 ? (
                      <span className="text-emerald-700">ผ่านเกณฑ์</span>
                    ) : (
                      <span className="text-rose-600 font-bold">เวลาเรียนไม่พอ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Signatures footer */}
        <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs text-gray-700">
          <div>
            <div className="w-48 border-b border-gray-400 mx-auto mb-2" />
            <p className="font-semibold">({teacherName})</p>
            <p className="text-gray-500">ครูผู้สอนวิชาศิลปะ</p>
          </div>

          <div>
            <div className="w-48 border-b border-gray-400 mx-auto mb-2" />
            <p className="font-semibold">(..........................................................)</p>
            <p className="text-gray-500">หัวหน้าฝ่ายวิชาการ / ผู้อำนวยการ</p>
          </div>
        </div>
      </div>

      {/* GRADE & SUBMISSION SUMMARY MODAL */}
      <GradeSummaryModal
        isOpen={showGradeSummaryModal}
        onClose={() => setShowGradeSummaryModal(false)}
      />
    </div>
  );
};
