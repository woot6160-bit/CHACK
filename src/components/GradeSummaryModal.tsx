import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { ArtAssignment, Student, SubmissionGrade, ExamRecord } from '../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Sliders,
  Award,
  BookOpen,
  Filter,
  Eye,
  TrendingUp,
  Percent,
  Check,
  GraduationCap,
  FileText,
  Users,
  Layers,
  Share2,
  Calendar,
  ExternalLink,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface GradeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GradeSummaryModal: React.FC<GradeSummaryModalProps> = ({ isOpen, onClose }) => {
  const {
    students,
    assignments,
    grades,
    examRecords,
    selectedSchoolId,
    selectedClassId,
    setSelectedClassId,
    schools,
    classRooms,
    saveExamRecord,
    batchSaveExamRecords,
    addNotification
  } = useApp();

  // Local active class selection inside modal (defaults to selectedClassId)
  const [activeClassId, setActiveClassId] = useState<string>(selectedClassId || '');
  const [viewMode, setViewMode] = useState<'table' | 'student-check'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete' | 'passed' | 'failed'>('all');
  const [showConfig, setShowConfig] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Sync activeClassId when modal opens or selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      setActiveClassId(selectedClassId);
    } else if (classRooms.length > 0) {
      setActiveClassId(classRooms[0].id);
    }
  }, [selectedClassId, classRooms, isOpen]);

  const currentClass = useMemo(() => {
    return classRooms.find(c => c.id === activeClassId) || classRooms[0];
  }, [classRooms, activeClassId]);

  const currentSchool = useMemo(() => {
    return schools.find(s => s.id === (currentClass?.schoolId || selectedSchoolId)) || schools[0];
  }, [schools, currentClass, selectedSchoolId]);

  // Exam Max score configurations (Stored in localStorage per classroom)
  const [midtermMax, setMidtermMax] = useState<number>(20);
  const [finalMax, setFinalMax] = useState<number>(30);
  const [affectiveMax, setAffectiveMax] = useState<number>(10);

  useEffect(() => {
    if (activeClassId) {
      const savedMid = localStorage.getItem(`artroll_exam_cfg_${activeClassId}_midterm`);
      const savedFin = localStorage.getItem(`artroll_exam_cfg_${activeClassId}_final`);
      const savedAff = localStorage.getItem(`artroll_exam_cfg_${activeClassId}_affective`);
      setMidtermMax(savedMid ? Number(savedMid) : 20);
      setFinalMax(savedFin ? Number(savedFin) : 30);
      setAffectiveMax(savedAff ? Number(savedAff) : 10);
    }
  }, [activeClassId]);

  const [teacherName, setTeacherName] = useState('ครูผู้สอนวิชาศิลปะ');
  const [reportTitle, setReportTitle] = useState('สรุปคะแนนและการส่งงานวิชาศิลปะ');

  // Preview Image state for artwork thumbnails
  const [previewImage, setPreviewImage] = useState<{ url: string; studentName: string; assignmentTitle: string } | null>(null);

  // Save exam max config when changed
  const handleSaveConfig = (mid: number, fin: number, aff: number) => {
    setMidtermMax(mid);
    setFinalMax(fin);
    setAffectiveMax(aff);
    if (activeClassId) {
      localStorage.setItem(`artroll_exam_cfg_${activeClassId}_midterm`, mid.toString());
      localStorage.setItem(`artroll_exam_cfg_${activeClassId}_final`, fin.toString());
      localStorage.setItem(`artroll_exam_cfg_${activeClassId}_affective`, aff.toString());
    }
  };

  // Filter students for current active class (robust filter by classId)
  const classStudents = useMemo(() => {
    if (!activeClassId) return [];
    return students
      .filter(s => s.classId === activeClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, activeClassId]);

  // Assignments for current class
  const classAssignments = useMemo(() => {
    if (!activeClassId) return [];
    return assignments.filter(a => a.classId === activeClassId);
  }, [assignments, activeClassId]);

  // Total Max Assignment Score
  const totalAssignmentMax = useMemo(() => {
    return classAssignments.reduce((sum, a) => sum + (a.maxScore || 0), 0);
  }, [classAssignments]);

  // Grand Total Max Score (Assignments + Midterm + Final + Affective)
  const grandTotalMax = useMemo(() => {
    return totalAssignmentMax + midtermMax + finalMax + affectiveMax;
  }, [totalAssignmentMax, midtermMax, finalMax, affectiveMax]);

  // Grades Map: key = `${assignmentId}_${studentId}`
  const gradesMap = useMemo(() => {
    const map = new Map<string, SubmissionGrade>();
    grades.forEach(g => {
      map.set(`${g.assignmentId}_${g.studentId}`, g);
    });
    return map;
  }, [grades]);

  // Exam Records Map: key = studentId
  const examMap = useMemo(() => {
    const map = new Map<string, ExamRecord>();
    examRecords
      .filter(r => r.classId === activeClassId)
      .forEach(r => {
        map.set(r.studentId, r);
      });
    return map;
  }, [examRecords, activeClassId]);

  // Calculate detailed student summary row
  const studentRows = useMemo(() => {
    return classStudents.map(student => {
      const studentGrades = classAssignments.map(asgn => {
        const grade = gradesMap.get(`${asgn.id}_${student.id}`);
        return {
          assignment: asgn,
          grade,
          score: grade?.score ?? 0,
          status: grade?.status ?? 'missing',
          isSubmitted: grade?.status === 'submitted' || grade?.status === 'graded' || grade?.status === 'late'
        };
      });

      const submittedCount = studentGrades.filter(g => g.isSubmitted).length;
      const totalAssignmentScore = studentGrades.reduce((sum, g) => sum + g.score, 0);

      const examRecord = examMap.get(student.id);
      const midtermScore = examRecord?.midtermScore ?? 0;
      const finalScore = examRecord?.finalScore ?? 0;
      const affectiveScore = examRecord?.affectiveScore ?? 0;

      const grandTotalScore = totalAssignmentScore + midtermScore + finalScore + affectiveScore;
      const percentage = grandTotalMax > 0 ? (grandTotalScore / grandTotalMax) * 100 : 0;

      // Grade calculation based on standard Thai 8-level scale
      let grade = '0';
      let gradeColor = 'text-rose-600 bg-rose-50 border-rose-200';
      if (percentage >= 80) {
        grade = '4';
        gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold';
      } else if (percentage >= 75) {
        grade = '3.5';
        gradeColor = 'text-emerald-600 bg-emerald-50 border-emerald-200 font-bold';
      } else if (percentage >= 70) {
        grade = '3';
        gradeColor = 'text-teal-700 bg-teal-50 border-teal-200';
      } else if (percentage >= 65) {
        grade = '2.5';
        gradeColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
      } else if (percentage >= 60) {
        grade = '2';
        gradeColor = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (percentage >= 55) {
        grade = '1.5';
        gradeColor = 'text-orange-700 bg-orange-50 border-orange-200';
      } else if (percentage >= 50) {
        grade = '1';
        gradeColor = 'text-yellow-800 bg-yellow-50 border-yellow-200';
      } else {
        grade = '0';
        gradeColor = 'text-rose-700 bg-rose-100 border-rose-300 font-bold';
      }

      const isAllSubmitted = classAssignments.length === 0 || submittedCount >= classAssignments.length;
      const isPassed = percentage >= 50;

      return {
        student,
        studentGrades,
        submittedCount,
        totalAssignmentScore,
        midtermScore,
        finalScore,
        affectiveScore,
        grandTotalScore,
        percentage,
        grade,
        gradeColor,
        isAllSubmitted,
        isPassed
      };
    });
  }, [classStudents, classAssignments, gradesMap, examMap, grandTotalMax]);

  // Filter and search
  const filteredRows = useMemo(() => {
    return studentRows.filter(row => {
      // Search
      const t = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm.trim() ||
        (row.student.name && row.student.name.toLowerCase().includes(t)) ||
        (row.student.studentNumber && String(row.student.studentNumber).includes(t)) ||
        (row.student.studentCode && String(row.student.studentCode).includes(t));

      if (!matchSearch) return false;

      // Status filter
      if (filterStatus === 'complete') return row.isAllSubmitted;
      if (filterStatus === 'incomplete') return !row.isAllSubmitted;
      if (filterStatus === 'passed') return row.isPassed;
      if (filterStatus === 'failed') return !row.isPassed;

      return true;
    });
  }, [studentRows, searchTerm, filterStatus]);

  // Summary Statistics
  const stats = useMemo(() => {
    if (studentRows.length === 0) {
      return { total: 0, complete: 0, incomplete: 0, avgScore: '0.0', avgPct: 0, passCount: 0, grade4Count: 0 };
    }
    const total = studentRows.length;
    const complete = studentRows.filter(r => r.isAllSubmitted).length;
    const incomplete = total - complete;
    const totalScoreSum = studentRows.reduce((sum, r) => sum + r.grandTotalScore, 0);
    const avgScore = (totalScoreSum / total).toFixed(1);
    const avgPct = grandTotalMax > 0 ? Math.round(((totalScoreSum / total) / grandTotalMax) * 100) : 0;
    const passCount = studentRows.filter(r => r.isPassed).length;
    const grade4Count = studentRows.filter(r => r.grade === '4').length;

    return { total, complete, incomplete, avgScore, avgPct, passCount, grade4Count };
  }, [studentRows, grandTotalMax]);

  // Quick fill affective score for all students
  const handleQuickFillAffective = async (score: number) => {
    const records = classStudents.map(st => {
      const existing = examMap.get(st.id);
      return {
        id: `exam_${activeClassId}_${st.id}`,
        studentId: st.id,
        classId: activeClassId,
        schoolId: currentClass?.schoolId || selectedSchoolId,
        midtermScore: existing?.midtermScore ?? 0,
        finalScore: existing?.finalScore ?? 0,
        affectiveScore: score
      };
    });
    await batchSaveExamRecords(records);
    addNotification('บันทึกจิตพิสัย', `กรอกคะแนนจิตพิสัยเต็ม ${score} ให้กับนักเรียนทุกคนสำเร็จ`, 'success');
  };

  // Handle single exam score edit
  const handleExamScoreChange = async (
    studentId: string,
    field: 'midtermScore' | 'finalScore' | 'affectiveScore',
    val: number
  ) => {
    const existing = examMap.get(studentId);
    const record: ExamRecord = {
      id: `exam_${activeClassId}_${studentId}`,
      studentId,
      classId: activeClassId,
      schoolId: currentClass?.schoolId || selectedSchoolId,
      midtermScore: existing?.midtermScore ?? 0,
      finalScore: existing?.finalScore ?? 0,
      affectiveScore: existing?.affectiveScore ?? 0,
      [field]: val
    };
    await saveExamRecord(record);
  };

  // Export to Excel (.xlsx) with styled columns
  const handleExportExcel = () => {
    if (studentRows.length === 0) {
      addNotification('ไม่มีข้อมูล', 'ไม่มีข้อมูลนักเรียนสำหรับส่งออกไฟล์ Excel', 'warning');
      return;
    }

    const exportData = studentRows.map(r => {
      const rowObj: Record<string, any> = {
        'เลขที่': r.student.studentNumber,
        'รหัสประจำตัว': r.student.studentCode || '-',
        'ชื่อ-นามสกุล': r.student.name,
      };

      // Individual assignment scores
      r.studentGrades.forEach((g, idx) => {
        const colTitle = `งาน ${idx + 1}: ${g.assignment.title} (เต็ม ${g.assignment.maxScore})`;
        rowObj[colTitle] = g.isSubmitted ? g.score : 'ขาดส่ง';
      });

      rowObj['รวมงานส่ง (ชิ้น)'] = `${r.submittedCount}/${classAssignments.length}`;
      rowObj[`รวมคะแนนงานเก็บ (${totalAssignmentMax})`] = r.totalAssignmentScore;
      rowObj[`สอบกลางภาค (${midtermMax})`] = r.midtermScore;
      rowObj[`สอบปลายภาค (${finalMax})`] = r.finalScore;
      rowObj[`จิตพิสัย (${affectiveMax})`] = r.affectiveScore;
      rowObj[`คะแนนรวมสุทธิ (${grandTotalMax})`] = r.grandTotalScore;
      rowObj['ร้อยละ (%)'] = `${r.percentage.toFixed(1)}%`;
      rowObj['เกรด'] = r.grade;
      rowObj['ผลการประเมิน'] = r.isPassed ? 'ผ่าน' : 'ไม่ผ่าน';
      rowObj['สถานะการส่งงาน'] = r.isAllSubmitted ? 'ส่งครบ' : `ขาด ${classAssignments.length - r.submittedCount} งาน`;

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column auto width approximation
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length * 2, 12)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'สรุปคะแนนและการส่งงาน');

    const classNameClean = (currentClass?.name || 'Class').replace(/[\/\\?%*:|"<>]/g, '_');
    const fileName = `ArtRoll_ตารางคะแนน_${classNameClean}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    addNotification('ส่งออก Excel สำเร็จ', `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`, 'success');
  };

  // Export Direct PDF (.pdf) using html2canvas & jsPDF with sanitized CSS
  const handleExportPdf = async () => {
    const printElement = printRef.current;
    if (!printElement) return;

    try {
      setIsExportingPdf(true);
      addNotification('กำลังสร้าง PDF', 'กำลังประมวลผลเอกสารสรุปคะแนนสำหรับดาวน์โหลด...', 'info');

      // Temporarily reveal the print element
      printElement.classList.remove('hidden');
      printElement.style.display = 'block';

      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove all style and link tags that might contain Tailwind v4 oklch color definitions
          const existingStyles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          existingStyles.forEach(s => s.remove());

          // Inject safe standalone CSS with standard hex/rgb colors only
          const cleanStyle = clonedDoc.createElement('style');
          cleanStyle.innerHTML = `
            * {
              box-sizing: border-box !important;
              font-family: 'Sarabun', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              color: #111827 !important;
            }
            .print-a4-page {
              display: block !important;
              visibility: visible !important;
              background-color: #ffffff !important;
              color: #111827 !important;
              padding: 24px !important;
              width: 1050px !important;
              margin: 0 auto !important;
            }
            .text-center { text-align: center !important; }
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: 700 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-black { font-weight: 900 !important; }
            .font-mono { font-family: monospace !important; }
            .text-xl { font-size: 18px !important; line-height: 24px !important; }
            .text-sm { font-size: 12px !important; line-height: 16px !important; }
            .text-xs { font-size: 10px !important; line-height: 14px !important; }
            .mt-1 { margin-top: 4px !important; }
            .mt-4 { margin-top: 14px !important; }
            .mt-8 { margin-top: 24px !important; }
            .mb-2 { margin-bottom: 6px !important; }
            .pb-4 { padding-bottom: 12px !important; }
            .pt-4 { padding-top: 12px !important; }
            .border-b-2 { border-bottom: 2px solid #111827 !important; }
            .border-b { border-bottom: 1px solid #9ca3af !important; }
            .border-t { border-top: 1px solid #9ca3af !important; }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              margin-top: 8px !important;
            }
            th, td {
              border: 1px solid #9ca3af !important;
              padding: 5px 3px !important;
              text-align: center !important;
              font-size: 9.5px !important;
            }
            th {
              background-color: #f3f4f6 !important;
              font-weight: 700 !important;
            }
            tr:nth-child(even) td {
              background-color: #f9fafb !important;
            }
            .grid {
              display: flex !important;
              justify-content: space-around !important;
              margin-top: 20px !important;
            }
            .w-48 {
              width: 170px !important;
              border-bottom: 1px solid #9ca3af !important;
              margin: 0 auto 6px auto !important;
            }
          `;
          clonedDoc.head.appendChild(cleanStyle);

          const clonedTarget = clonedDoc.querySelector('.print-a4-page') as HTMLElement;
          if (clonedTarget) {
            clonedTarget.style.display = 'block';
            clonedTarget.style.visibility = 'visible';
          }
        }
      });

      // Restore hidden state
      printElement.style.display = '';
      printElement.classList.add('hidden');

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 10) / imgWidth, (pdfHeight - 15) / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 8;

      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      const classNameClean = (currentClass?.name || 'Class').replace(/[\/\\?%*:|"<>]/g, '_');
      const fileName = `ArtRoll_รายงานคะแนน_${classNameClean}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      addNotification('ส่งออก PDF สำเร็จ', `ดาวน์โหลดไฟล์ PDF ${fileName} เรียบร้อยแล้ว`, 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      // Restore hidden state in case of error
      printElement.style.display = '';
      printElement.classList.add('hidden');
      addNotification('เกิดข้อผิดพลาดในการสร้าง PDF', 'กำลังเปิดหน้าพิมพ์เอกสาร A4 สำหรับบันทึกเป็น PDF...', 'error');
      // Fallback to native print dialog
      setTimeout(() => {
        window.print();
      }, 500);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Print A4
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl max-h-[95vh] rounded-3xl overflow-hidden border-2 border-[#d4af37]/40 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(212,175,55,0.18)] bg-[#051a12] text-[#fcfbf7] flex flex-col transition-all animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER (Hidden in Print) */}
        <div className="no-print p-4 sm:p-5 border-b border-[#d4af37]/25 bg-gradient-to-r from-[#03150e] via-[#052217] to-[#041a12] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/40 text-[#d4af37] shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-[#f3d375]" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#fcfbf7] tracking-tight">
                  สรุปคะแนน & การส่งงาน (พร้อมคะแนนสอบ)
                </h2>
                
                {/* Classroom Selector Dropdown right in the modal */}
                <select
                  value={activeClassId}
                  onChange={(e) => {
                    setActiveClassId(e.target.value);
                    if (setSelectedClassId) setSelectedClassId(e.target.value);
                  }}
                  className="bg-[#031810] text-[#f3d375] font-bold text-xs rounded-xl px-2.5 py-1 border border-[#d4af37]/40 outline-none cursor-pointer hover:border-[#d4af37]"
                >
                  {classRooms.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#031810] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[#d4af37]/80 mt-0.5">
                โรงเรียน: {currentSchool?.name || '-'} | นักเรียนทั้งหมด {classStudents.length} คน | ชิ้นงาน {classAssignments.length} ชิ้น | คะแนนเต็มรวม {grandTotalMax} คะแนน
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Toggle: Table vs Student Check */}
            <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-[#d4af37] text-[#02140d] shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                ตารางทั้งห้อง
              </button>
              <button
                type="button"
                onClick={() => setViewMode('student-check')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'student-check'
                    ? 'bg-[#10b981] text-white shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                เช็กคะแนนรายคน
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                showConfig
                  ? 'bg-[#d4af37] text-[#02140d] border-[#d4af37] shadow-md shadow-[#d4af37]/30'
                  : 'bg-white/[0.06] text-[#fcfbf7] border-white/15 hover:border-[#d4af37]/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {showConfig ? 'ซ่อนเกณฑ์' : 'ปรับสัดส่วนคะแนน'}
            </button>

            {/* EXCEL EXPORT BUTTON */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white text-xs font-bold rounded-xl shadow-md shadow-[#10b981]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="ดาวน์โหลดไฟล์ Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" /> ส่งออก Excel
            </button>

            {/* DIRECT PDF EXPORT BUTTON */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs font-bold rounded-xl shadow-md shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="ดาวน์โหลดเป็นไฟล์ PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5" />
              {isExportingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออก PDF'}
            </button>

            {/* PRINT A4 BUTTON */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-[#fcfbf7] border border-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="พิมพ์เอกสาร A4 หรือบันทึกผ่านหน้าต่างเบราว์เซอร์"
            >
              <Printer className="w-3.5 h-3.5" /> พิมพ์ A4
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* EXAM SCORE CRITERIA & CONFIG BAR (Collapsible) */}
        {showConfig && (
          <div className="no-print p-4 bg-[#02130c] border-b border-[#d4af37]/30 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#f3d375] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#d4af37]" />
                  กำหนดสัดส่วนคะแนนเต็ม (เพื่อคำนวณเกรดและร้อยละ)
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  ชิ้นงานศิลปะรวม {totalAssignmentMax} คะแนน + ปรับคะแนนสอบกลางภาค ปลายภาค และจิตพิสัย
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                  <label className="block text-[10px] text-gray-400 font-semibold">งานศิลปะทั้งหมด</label>
                  <div className="text-sm font-black text-[#10b981] mt-0.5">
                    {totalAssignmentMax} <span className="text-[10px] font-normal text-gray-400">({classAssignments.length} งาน)</span>
                  </div>
                </div>

                <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                  <label className="block text-[10px] text-[#f3d375] font-semibold">สอบกลางภาค</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={midtermMax}
                    onChange={(e) => handleSaveConfig(Number(e.target.value) || 0, finalMax, affectiveMax)}
                    className="w-full bg-white/5 border border-[#d4af37]/40 rounded-lg px-2 py-0.5 text-xs text-white font-bold outline-none mt-0.5"
                  />
                </div>

                <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                  <label className="block text-[10px] text-[#f3d375] font-semibold">สอบปลายภาค</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={finalMax}
                    onChange={(e) => handleSaveConfig(midtermMax, Number(e.target.value) || 0, affectiveMax)}
                    className="w-full bg-white/5 border border-[#d4af37]/40 rounded-lg px-2 py-0.5 text-xs text-white font-bold outline-none mt-0.5"
                  />
                </div>

                <div className="bg-black/40 p-2 rounded-xl border border-white/10">
                  <label className="block text-[10px] text-[#10b981] font-semibold">จิตพิสัย/เวลาเรียน</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={affectiveMax}
                    onChange={(e) => handleSaveConfig(midtermMax, finalMax, Number(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-[#10b981]/40 rounded-lg px-2 py-0.5 text-xs text-white font-bold outline-none mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-gray-300 flex items-center gap-2">
                <span>คะแนนเต็มรวมทั้งหมด:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 font-black text-[#f3d375]">
                  {grandTotalMax} คะแนน
                </span>
                <span className="text-[11px] text-gray-400">
                  (เกณฑ์ตัดเกรด: 80%=4, 75%=3.5, 70%=3, 65%=2.5, 60%=2, 55%=1.5, 50%=1)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFillAffective(affectiveMax)}
                  className="px-2.5 py-1 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/40 text-[#10b981] text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                >
                  ⚡ ให้จิตพิสัยเต็ม {affectiveMax} ทุกคน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FILTER & STATS BAR (Hidden in Print) */}
        <div className="no-print p-3 sm:p-4 bg-[#031810]/70 border-b border-[#d4af37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Search and status filters */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, เลขที่, รหัสนักเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#02130c] border border-white/15 focus:border-[#d4af37] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#fcfbf7] outline-none"
              />
            </div>

            {viewMode === 'table' && (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    filterStatus === 'all' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ทั้งหมด ({studentRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('complete')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    filterStatus === 'complete' ? 'bg-[#10b981] text-white font-bold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ส่งครบ ({stats.complete})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('incomplete')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    filterStatus === 'incomplete' ? 'bg-rose-600 text-white font-bold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ค้างส่ง ({stats.incomplete})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('passed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    filterStatus === 'passed' ? 'bg-teal-600 text-white font-bold' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  ผ่าน ({stats.passCount})
                </button>
              </div>
            )}
          </div>

          {/* Quick Summary Chips */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 text-[#f3d375]" />
              <span className="text-gray-400">เฉลี่ยรวม:</span>
              <span className="font-bold text-[#f3d375]">{stats.avgScore}</span>
              <span className="text-[10px] text-gray-400">({stats.avgPct}%)</span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1.5 whitespace-nowrap">
              <Award className="w-3.5 h-3.5 text-[#10b981]" />
              <span className="text-gray-400">เกรด 4:</span>
              <span className="font-bold text-[#10b981]">{stats.grade4Count} คน</span>
            </div>
          </div>
        </div>

        {/* MAIN DATA CONTAINER */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 bg-[#03150e]/60">
          
          {/* EMPTY STATE IF NO STUDENTS */}
          {classStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-300 space-y-3">
              <Users className="w-12 h-12 text-[#d4af37]/60 mx-auto" />
              <h3 className="text-base font-bold text-white">
                ยังไม่มีข้อมูลนักเรียนในห้อง {currentClass?.name || 'นี้'}
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                กรุณาเลือกห้องเรียนที่มีนักเรียนจากเมนูด้านบน หรือเพิ่มรายชื่อนักเรียนในแท็บ "จัดการข้อมูล"
              </p>
              <div className="pt-2 flex justify-center gap-2">
                {classRooms.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveClassId(c.id)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3d375] text-xs font-bold cursor-pointer"
                  >
                    ดูห้อง {c.name}
                  </button>
                ))}
              </div>
            </div>
          ) : viewMode === 'student-check' ? (
            /* STUDENT CHECK VIEW MODE: Interactive Grade Cards for Students */
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-[#042116] to-[#021810] rounded-2xl border border-[#d4af37]/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#f3d375] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#10b981]" />
                    โหมดตรวจสอบคะแนนสำหรับนักเรียน (Student Grade Check)
                  </h4>
                  <p className="text-xs text-gray-300">
                    นักเรียนสามารถค้นหาชื่อหรือเลขที่เพื่อดูผลการประเมิน รายการงานที่ส่งแล้ว และคะแนนสอบรายวิชา
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  แสดง {filteredRows.length} คน
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredRows.map(row => (
                  <div
                    key={row.student.id}
                    className="bg-[#042015]/90 border border-[#d4af37]/30 rounded-2xl p-4 shadow-xl hover:border-[#d4af37] transition-all relative overflow-hidden group"
                  >
                    {/* Top Student Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#10b981] p-0.5 flex items-center justify-center">
                          <div className="w-full h-full bg-[#03150e] rounded-[10px] flex items-center justify-center font-mono font-bold text-xs text-[#f3d375]">
                            {row.student.studentNumber}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-[#f3d375] transition-colors">
                            {row.student.name}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-mono">
                            รหัส: {row.student.studentCode || '-'} | ห้อง {currentClass?.name}
                          </p>
                        </div>
                      </div>

                      {/* Grade Badge */}
                      <div className="text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                          row.grade === '4' ? 'bg-[#10b981] text-white' :
                          row.grade === '3.5' || row.grade === '3' ? 'bg-teal-600 text-white' :
                          row.grade === '2.5' || row.grade === '2' ? 'bg-amber-500 text-black font-bold' :
                          row.grade === '1.5' || row.grade === '1' ? 'bg-orange-500 text-white' :
                          'bg-rose-600 text-white'
                        }`}>
                          เกรด {row.grade}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {row.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Score Breakdown Grid */}
                    <div className="grid grid-cols-4 gap-2 my-3 text-center">
                      <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-gray-400">งานเก็บ ({totalAssignmentMax})</span>
                        <span className="text-xs font-bold text-[#10b981]">{row.totalAssignmentScore}</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-gray-400">กลางภาค ({midtermMax})</span>
                        <span className="text-xs font-bold text-[#f3d375]">{row.midtermScore}</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-gray-400">ปลายภาค ({finalMax})</span>
                        <span className="text-xs font-bold text-[#f3d375]">{row.finalScore}</span>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-gray-400">จิตพิสัย ({affectiveMax})</span>
                        <span className="text-xs font-bold text-[#34d399]">{row.affectiveScore}</span>
                      </div>
                    </div>

                    {/* Total Score Summary Bar */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37]/15 to-[#10b981]/15 border border-[#d4af37]/30 mb-3 text-xs">
                      <span className="text-gray-300">คะแนนรวมสุทธิ:</span>
                      <span className="font-black text-[#fde047] text-sm">
                        {row.grandTotalScore} / {grandTotalMax} คะแนน
                      </span>
                    </div>

                    {/* Individual Assignment Submission Checklist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pb-1">
                        <span>รายการชิ้นงาน ({row.submittedCount}/{classAssignments.length})</span>
                        <span className={row.isAllSubmitted ? 'text-[#10b981] font-bold' : 'text-rose-400 font-bold'}>
                          {row.isAllSubmitted ? '✓ ส่งครบถ้วน' : `ค้างส่ง ${classAssignments.length - row.submittedCount} งาน`}
                        </span>
                      </div>

                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {row.studentGrades.map((g, idx) => (
                          <div
                            key={g.assignment.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-xs ${
                              g.isSubmitted ? 'bg-emerald-950/40 border border-emerald-500/20' : 'bg-rose-950/40 border border-rose-500/20'
                            }`}
                          >
                            <span className="truncate max-w-[150px] text-gray-200">
                              {idx + 1}. {g.assignment.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {g.isSubmitted ? (
                                <>
                                  <span className="font-bold text-[#10b981]">{g.score}/{g.assignment.maxScore}</span>
                                  {g.grade?.artworkImage && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage({
                                        url: g.grade!.artworkImage!,
                                        studentName: row.student.name,
                                        assignmentTitle: g.assignment.title
                                      })}
                                      className="text-[#f3d375] hover:text-white"
                                      title="ดูภาพผลงาน"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-rose-400 font-bold">ค้างส่ง</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* FULL CLASS SCREEN TABLE */
            <div className="no-print overflow-x-auto rounded-2xl border border-[#d4af37]/30 shadow-2xl bg-[#02140d]/90">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#01140c] via-[#042416] to-[#01140c] text-[#f3d375] font-bold border-b border-[#d4af37]/40 sticky top-0 z-20 shadow-md">
                    <th className="py-3 px-3 text-center w-12 border-r border-white/10">เลขที่</th>
                    <th className="py-3 px-3 w-20 border-r border-white/10">รหัส</th>
                    <th className="py-3 px-4 min-w-[140px] border-r border-white/10">ชื่อ-นามสกุล</th>

                    {/* Individual Assignment Columns */}
                    {classAssignments.map((asgn, idx) => (
                      <th
                        key={asgn.id}
                        className="py-3 px-2 text-center min-w-[95px] max-w-[130px] border-r border-white/10 bg-[#062c1d]/60"
                        title={`${asgn.title} (เต็ม ${asgn.maxScore} คะแนน)`}
                      >
                        <div className="truncate font-semibold text-white text-[11px]">
                          งาน {idx + 1}: {asgn.title}
                        </div>
                        <div className="text-[10px] text-[#f3d375] font-mono">
                          (เต็ม {asgn.maxScore})
                        </div>
                      </th>
                    ))}

                    <th className="py-3 px-2.5 text-center min-w-[85px] border-r border-white/10 bg-[#05291b]">
                      <div>รวมงานส่ง</div>
                      <div className="text-[10px] text-gray-400">({classAssignments.length} ชิ้น)</div>
                    </th>

                    <th className="py-3 px-2.5 text-center min-w-[85px] border-r border-white/10 bg-[#063321] text-[#10b981]">
                      <div>คะแนนงาน</div>
                      <div className="text-[10px] text-[#10b981]/80">(เต็ม {totalAssignmentMax})</div>
                    </th>

                    {/* EXAM SCORE COLUMNS */}
                    <th className="py-3 px-2.5 text-center min-w-[80px] border-r border-white/10 bg-[#1e1a06] text-[#f3d375]">
                      <div>สอบกลางภาค</div>
                      <div className="text-[10px] text-[#f3d375]/80">(เต็ม {midtermMax})</div>
                    </th>

                    <th className="py-3 px-2.5 text-center min-w-[80px] border-r border-white/10 bg-[#1e1a06] text-[#f3d375]">
                      <div>สอบปลายภาค</div>
                      <div className="text-[10px] text-[#f3d375]/80">(เต็ม {finalMax})</div>
                    </th>

                    <th className="py-3 px-2.5 text-center min-w-[80px] border-r border-white/10 bg-[#0a2318] text-[#34d399]">
                      <div>จิตพิสัย</div>
                      <div className="text-[10px] text-[#34d399]/80">(เต็ม {affectiveMax})</div>
                    </th>

                    {/* GRAND TOTAL & GRADE */}
                    <th className="py-3 px-3 text-center min-w-[85px] border-r border-white/10 bg-[#2d2203] text-[#fde047]">
                      <div>รวมสุทธิ</div>
                      <div className="text-[10px] text-[#fde047]/80">(เต็ม {grandTotalMax})</div>
                    </th>

                    <th className="py-3 px-2 text-center w-14 border-r border-white/10 bg-[#16271a] text-emerald-300">
                      %
                    </th>

                    <th className="py-3 px-3 text-center w-16 border-r border-white/10 bg-[#2a1c02] text-[#fde047]">
                      เกรด
                    </th>

                    <th className="py-3 px-3 text-center min-w-[80px]">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11 + classAssignments.length} className="py-12 text-center text-gray-400">
                        ไม่พบข้อมูลนักเรียนตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={row.student.id}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'
                        }`}
                      >
                        {/* เลขที่ */}
                        <td className="py-2.5 px-3 text-center font-bold text-[#f3d375] border-r border-white/10">
                          {row.student.studentNumber}
                        </td>

                        {/* รหัส */}
                        <td className="py-2.5 px-3 font-mono text-gray-400 text-[11px] border-r border-white/10">
                          {row.student.studentCode || '-'}
                        </td>

                        {/* ชื่อ */}
                        <td className="py-2.5 px-4 font-semibold text-white border-r border-white/10 whitespace-nowrap">
                          {row.student.name}
                        </td>

                        {/* Individual Assignment Scores & Status */}
                        {row.studentGrades.map((g) => (
                          <td
                            key={g.assignment.id}
                            className="py-2 px-2 text-center border-r border-white/10"
                          >
                            {g.isSubmitted ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-bold text-[#10b981]">
                                  {g.score}
                                </span>
                                {g.grade?.artworkImage && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({
                                      url: g.grade!.artworkImage!,
                                      studentName: row.student.name,
                                      assignmentTitle: g.assignment.title
                                    })}
                                    className="w-4 h-4 rounded text-gray-400 hover:text-[#d4af37] transition-colors cursor-pointer"
                                    title="ดูรูปภาพผลงาน"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                                ค้างส่ง
                              </span>
                            )}
                          </td>
                        ))}

                        {/* รวมงานส่ง */}
                        <td className="py-2.5 px-2.5 text-center border-r border-white/10">
                          <span className={`font-bold ${row.isAllSubmitted ? 'text-[#10b981]' : 'text-amber-400'}`}>
                            {row.submittedCount}/{classAssignments.length}
                          </span>
                        </td>

                        {/* รวมคะแนนงานเก็บ */}
                        <td className="py-2.5 px-2.5 text-center font-bold text-[#10b981] border-r border-white/10 bg-[#05291b]/30">
                          {row.totalAssignmentScore}
                        </td>

                        {/* EXAM: สอบกลางภาค (Editable) */}
                        <td className="py-1.5 px-1.5 text-center border-r border-white/10 bg-[#1e1a06]/30">
                          <input
                            type="number"
                            min="0"
                            max={midtermMax}
                            value={row.midtermScore === 0 ? '' : row.midtermScore}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(Math.max(0, Number(e.target.value) || 0), midtermMax);
                              handleExamScoreChange(row.student.id, 'midtermScore', val);
                            }}
                            className="w-14 text-center bg-black/60 border border-[#d4af37]/40 focus:border-[#d4af37] rounded-lg py-1 text-xs font-bold text-[#f3d375] outline-none"
                          />
                        </td>

                        {/* EXAM: สอบปลายภาค (Editable) */}
                        <td className="py-1.5 px-1.5 text-center border-r border-white/10 bg-[#1e1a06]/30">
                          <input
                            type="number"
                            min="0"
                            max={finalMax}
                            value={row.finalScore === 0 ? '' : row.finalScore}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(Math.max(0, Number(e.target.value) || 0), finalMax);
                              handleExamScoreChange(row.student.id, 'finalScore', val);
                            }}
                            className="w-14 text-center bg-black/60 border border-[#d4af37]/40 focus:border-[#d4af37] rounded-lg py-1 text-xs font-bold text-[#f3d375] outline-none"
                          />
                        </td>

                        {/* EXAM: จิตพิสัย (Editable) */}
                        <td className="py-1.5 px-1.5 text-center border-r border-white/10 bg-[#0a2318]/30">
                          <input
                            type="number"
                            min="0"
                            max={affectiveMax}
                            value={row.affectiveScore === 0 ? '' : row.affectiveScore}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(Math.max(0, Number(e.target.value) || 0), affectiveMax);
                              handleExamScoreChange(row.student.id, 'affectiveScore', val);
                            }}
                            className="w-14 text-center bg-black/60 border border-[#10b981]/40 focus:border-[#10b981] rounded-lg py-1 text-xs font-bold text-[#34d399] outline-none"
                          />
                        </td>

                        {/* คะแนนรวมสุทธิ */}
                        <td className="py-2.5 px-3 text-center font-black text-[#fde047] text-sm border-r border-white/10 bg-[#2d2203]/40">
                          {row.grandTotalScore}
                        </td>

                        {/* ร้อยละ % */}
                        <td className="py-2.5 px-2 text-center font-semibold text-emerald-300 border-r border-white/10">
                          {row.percentage.toFixed(0)}%
                        </td>

                        {/* เกรด */}
                        <td className="py-2 px-2 text-center border-r border-white/10">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                            row.grade === '4' ? 'bg-[#10b981] text-white' :
                            row.grade === '3.5' || row.grade === '3' ? 'bg-teal-600 text-white' :
                            row.grade === '2.5' || row.grade === '2' ? 'bg-amber-500 text-black font-bold' :
                            row.grade === '1.5' || row.grade === '1' ? 'bg-orange-500 text-white' :
                            'bg-rose-600 text-white'
                          }`}>
                            {row.grade}
                          </span>
                        </td>

                        {/* สถานะ */}
                        <td className="py-2 px-3 text-center">
                          {row.isAllSubmitted ? (
                            <span className="text-[11px] font-semibold text-[#10b981] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ครบถ้วน
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-400 flex items-center justify-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> ค้างส่ง
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* OFFICIAL A4 PRINT TEMPLATE (Hidden on screen, Used by window.print() & PDF Generator) */}
          <div ref={printRef} className="hidden print:block bg-white text-gray-900 p-6 sm:p-10 font-sans print-a4-page">
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-gray-900">
              <h1 className="text-xl font-black text-gray-900">{reportTitle}</h1>
              <p className="text-sm font-bold text-gray-800 mt-1">
                โรงเรียน {currentSchool?.name || '-'} | ห้องเรียน {currentClass?.name || '-'}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                คะแนนรวมทั้งหมด {grandTotalMax} คะแนน (ชิ้นงานศิลปะ {totalAssignmentMax} + สอบกลางภาค {midtermMax} + สอบปลายภาค {finalMax} + จิตพิสัย {affectiveMax})
              </p>
            </div>

            {/* Print Table */}
            <div className="mt-4">
              <table className="w-full text-left text-[10px] border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
                    <th className="py-1.5 px-2 border border-gray-400 text-center w-8">ที่</th>
                    <th className="py-1.5 px-2 border border-gray-400 w-16">รหัส</th>
                    <th className="py-1.5 px-2 border border-gray-400 min-w-[120px]">ชื่อ-นามสกุล</th>
                    {classAssignments.map((a, i) => (
                      <th key={a.id} className="py-1.5 px-1 border border-gray-400 text-center">
                        <div>งาน {i + 1}</div>
                        <div className="text-[9px] font-normal">({a.maxScore})</div>
                      </th>
                    ))}
                    <th className="py-1.5 px-1 border border-gray-400 text-center">รวมงาน ({totalAssignmentMax})</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center">กลางภาค ({midtermMax})</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center">ปลายภาค ({finalMax})</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center">จิตพิสัย ({affectiveMax})</th>
                    <th className="py-1.5 px-1.5 border border-gray-400 text-center font-black">รวม ({grandTotalMax})</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center">%</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center font-black">เกรด</th>
                    <th className="py-1.5 px-1 border border-gray-400 text-center">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((r, i) => (
                    <tr key={r.student.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1 px-1.5 border border-gray-300 text-center font-bold">{r.student.studentNumber}</td>
                      <td className="py-1 px-1.5 border border-gray-300 font-mono text-gray-700">{r.student.studentCode || '-'}</td>
                      <td className="py-1 px-2 border border-gray-300 font-medium">{r.student.name}</td>
                      {r.studentGrades.map(g => (
                        <td key={g.assignment.id} className="py-1 px-1 border border-gray-300 text-center">
                          {g.isSubmitted ? g.score : '-'}
                        </td>
                      ))}
                      <td className="py-1 px-1 border border-gray-300 text-center font-bold text-gray-900">{r.totalAssignmentScore}</td>
                      <td className="py-1 px-1 border border-gray-300 text-center">{r.midtermScore}</td>
                      <td className="py-1 px-1 border border-gray-300 text-center">{r.finalScore}</td>
                      <td className="py-1 px-1 border border-gray-300 text-center">{r.affectiveScore}</td>
                      <td className="py-1 px-1.5 border border-gray-300 text-center font-black text-black">{r.grandTotalScore}</td>
                      <td className="py-1 px-1 border border-gray-300 text-center">{r.percentage.toFixed(0)}%</td>
                      <td className="py-1 px-1 border border-gray-300 text-center font-bold">{r.grade}</td>
                      <td className="py-1 px-1 border border-gray-300 text-center font-semibold text-gray-800">
                        {r.isPassed ? 'ผ่าน' : 'ไม่ผ่าน'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Signatures */}
            <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-xs text-gray-800">
              <div>
                <div className="w-48 border-b border-gray-400 mx-auto mb-2" />
                <p className="font-semibold">({teacherName})</p>
                <p className="text-gray-500">ครูผู้สอนวิชาศิลปะ</p>
              </div>
              <div>
                <div className="w-48 border-b border-gray-400 mx-auto mb-2" />
                <p className="font-semibold">(..........................................................)</p>
                <p className="text-gray-500">หัวหน้าฝ่ายวิชาการ / นายทะเบียน</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER (Hidden on Print) */}
        <div className="no-print p-3 sm:p-4 border-t border-[#d4af37]/25 bg-gradient-to-r from-[#03150e] via-[#052217] to-[#041a12] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span>💡 กรอกคะแนนสอบกลางภาค/ปลายภาค/จิตพิสัยในตารางได้โดยตรง ระบบจะคำนวณเกรดและบันทึกอัตโนมัติ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-[#fcfbf7] transition-all cursor-pointer active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* ARTWORK LIGHTBOX MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#051a12] border-2 border-[#d4af37]/50 rounded-3xl p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base">{previewImage.studentName}</h4>
                <p className="text-xs text-[#d4af37]">{previewImage.assignmentTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/60 rounded-2xl overflow-hidden max-h-[60vh]">
              <img
                src={previewImage.url}
                alt="Artwork"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
