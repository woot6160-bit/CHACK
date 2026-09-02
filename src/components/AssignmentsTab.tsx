import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { ArtAssignment, SubmissionGrade } from '../types';
import { GradeSummaryModal } from './GradeSummaryModal';
import {
  Palette,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  Award,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export const AssignmentsTab: React.FC = () => {
  const {
    assignments,
    grades,
    students,
    selectedSchoolId,
    selectedClassId,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    saveGrade
  } = useApp();

  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradeSummaryModal, setShowGradeSummaryModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ArtAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ArtAssignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('วาดเส้น');
  const [maxScore, setMaxScore] = useState<number>(20);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; studentName: string; assignmentTitle: string } | null>(null);

  // Filter assignments for current classroom
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.classId === selectedClassId);
  }, [assignments, selectedClassId]);

  // Set default active assignment
  React.useEffect(() => {
    if (classAssignments.length > 0 && (!activeAssignmentId || !classAssignments.some(a => a.id === activeAssignmentId))) {
      setActiveAssignmentId(classAssignments[0].id);
    } else if (classAssignments.length === 0) {
      setActiveAssignmentId('');
    }
  }, [classAssignments, activeAssignmentId]);

  const activeAssignment = classAssignments.find(a => a.id === activeAssignmentId);

  // Filter students for current class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classId === selectedClassId)
      .sort((a, b) => (parseInt(a.studentNumber) || 0) - (parseInt(b.studentNumber) || 0));
  }, [students, selectedClassId]);

  // Grades map for active assignment
  const assignmentGradesMap = useMemo(() => {
    const map = new Map<string, SubmissionGrade>();
    if (!activeAssignmentId) return map;
    grades
      .filter(g => g.assignmentId === activeAssignmentId)
      .forEach(g => map.set(g.studentId, g));
    return map;
  }, [grades, activeAssignmentId]);

  // Handle Create / Edit Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingAssignment) {
      await updateAssignment(editingAssignment.id, {
        title,
        category,
        maxScore: Number(maxScore) || 10,
        dueDate,
        description
      });
    } else {
      await addAssignment({
        schoolId: selectedSchoolId,
        classId: selectedClassId,
        title,
        category,
        maxScore: Number(maxScore) || 10,
        dueDate,
        description
      });
    }

    setShowCreateModal(false);
    setEditingAssignment(null);
    setTitle('');
    setDescription('');
    setMaxScore(20);
    setDueDate('');
  };

  const openEditModal = (asgn: ArtAssignment) => {
    setEditingAssignment(asgn);
    setTitle(asgn.title);
    setCategory(asgn.category || 'วาดเส้น');
    setMaxScore(asgn.maxScore);
    setDueDate(asgn.dueDate || '');
    setDescription(asgn.description || '');
    setShowCreateModal(true);
  };

  // Score change handler
  const handleScoreChange = async (studentId: string, newScore: number) => {
    if (!activeAssignment) return;
    const currentGrade = assignmentGradesMap.get(studentId);
    await saveGrade({
      assignmentId: activeAssignment.id,
      studentId,
      score: Math.min(Math.max(0, newScore), activeAssignment.maxScore),
      status: 'graded',
      artworkImage: currentGrade?.artworkImage,
      feedback: currentGrade?.feedback,
      submittedAt: currentGrade?.submittedAt || new Date().toISOString()
    });
  };

  // Status submission toggle
  const handleStatusChange = async (studentId: string, status: SubmissionGrade['status']) => {
    if (!activeAssignment) return;
    const currentGrade = assignmentGradesMap.get(studentId);
    await saveGrade({
      assignmentId: activeAssignment.id,
      studentId,
      score: currentGrade?.score || 0,
      status,
      artworkImage: currentGrade?.artworkImage,
      feedback: currentGrade?.feedback,
      submittedAt: currentGrade?.submittedAt || new Date().toISOString()
    });
  };

  // Image Upload handler
  const handleImageUpload = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAssignment) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      const currentGrade = assignmentGradesMap.get(studentId);
      await saveGrade({
        assignmentId: activeAssignment.id,
        studentId,
        score: currentGrade?.score || 0,
        status: currentGrade?.status === 'graded' ? 'graded' : 'submitted',
        artworkImage: base64Url,
        feedback: currentGrade?.feedback,
        submittedAt: currentGrade?.submittedAt || new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  // Download image file
  const handleDownloadImage = (dataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Assignment selector & creation header */}
      <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#d4af37]/35 text-[#d4af37] shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                รายการชิ้นงาน & ผลงานศิลปะ
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]">
                  {classAssignments.length} ชิ้นงาน
                </span>
              </h2>
              <p className="text-xs text-gray-300">สร้างโจทย์ชิ้นงาน กรอกคะแนน และจัดเก็บรูปผลงานของนักเรียน</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowGradeSummaryModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#10b981]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#f3d375]" /> สรุปคะแนน & การส่งงาน
            </button>

            <button
              onClick={() => {
                setEditingAssignment(null);
                setTitle('');
                setDescription('');
                setMaxScore(20);
                setDueDate('');
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> สร้างชิ้นงานใหม่
            </button>
          </div>
        </div>

        {/* Assignment Pills Tabs */}
        {classAssignments.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <p className="text-sm">ยังไม่มีการสร้างชิ้นงานในห้องเรียนนี้</p>
            <p className="text-xs text-gray-500 mt-1">คลิกปุ่ม "+ สร้างชิ้นงานใหม่" เพื่อเริ่มบันทึกคะแนนศิลปะ</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {classAssignments.map(asgn => {
              const isActive = asgn.id === activeAssignmentId;
              return (
                <button
                  key={asgn.id}
                  onClick={() => setActiveAssignmentId(asgn.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#047857] text-white shadow-md shadow-[#10b981]/25 ring-2 ring-[#d4af37]/40'
                      : 'bg-white/[0.04] text-[#fcfbf7]/75 hover:text-white hover:bg-white/[0.08] border border-white/10'
                  }`}
                >
                  <span>{asgn.title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 text-[#fcfbf7]">
                    เต็ม {asgn.maxScore}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Assignment Details & Student Grading Table */}
      {activeAssignment && (
        <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d4af37]/20">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#fcfbf7]">{activeAssignment.title}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] font-semibold">
                  {activeAssignment.category}
                </span>
              </div>
              {activeAssignment.description && (
                <p className="text-xs text-gray-300 mt-1">{activeAssignment.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(activeAssignment)}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.04] text-xs text-gray-200 hover:text-white hover:border-[#d4af37]/50 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#d4af37]" /> แก้ไขชิ้นงาน
              </button>
              <button
                type="button"
                onClick={() => setAssignmentToDelete(activeAssignment)}
                className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs text-rose-200 hover:bg-rose-500/30 hover:border-rose-500/60 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" /> ลบชิ้นงาน
              </button>
            </div>
          </div>

          {/* Student Grading List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#d4af37]/20 text-[#d4af37] font-bold">
                  <th className="py-2.5 px-3">เลขที่</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">สถานะส่งงาน</th>
                  <th className="py-2.5 px-3">คะแนน (เต็ม {activeAssignment.maxScore})</th>
                  <th className="py-2.5 px-3 text-center">รูปถ่ายผลงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {classStudents.map(student => {
                  const grade = assignmentGradesMap.get(student.id);
                  const currentScore = grade ? grade.score : 0;
                  const currentStatus = grade ? grade.status : 'pending';

                  return (
                    <tr key={student.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#d4af37]">{student.studentNumber}</td>
                      <td className="py-3 px-3 font-semibold text-[#fcfbf7]">
                        {student.name}
                        {student.studentCode && <span className="text-[11px] text-gray-400 font-normal ml-2">({student.studentCode})</span>}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(student.id, e.target.value as any)}
                          className="bg-[#02140d] border border-white/15 focus:border-[#d4af37] rounded-xl px-2.5 py-1 text-xs text-[#fcfbf7] outline-none cursor-pointer"
                        >
                          <option value="pending">⏳ ยังไม่ส่ง</option>
                          <option value="submitted">📥 ส่งแล้ว (รอตรวจ)</option>
                          <option value="graded">✅ ตรวจแล้ว</option>
                          <option value="late">⚠️ ส่งช้า</option>
                          <option value="missing">❌ ไม่ส่ง</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={activeAssignment.maxScore}
                            value={currentScore}
                            onChange={(e) => handleScoreChange(student.id, Number(e.target.value))}
                            className="w-16 bg-[#02140d] border border-white/20 focus:border-[#d4af37] rounded-xl px-2.5 py-1 text-xs text-[#fcfbf7] font-bold text-center outline-none"
                          />
                          <span className="text-xs text-gray-400">/ {activeAssignment.maxScore}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {grade?.artworkImage ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPreviewImage({
                                  url: grade.artworkImage!,
                                  studentName: student.name,
                                  assignmentTitle: activeAssignment.title
                                })}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-[#d4af37]/40 shadow hover:scale-105 transition-transform cursor-pointer"
                              >
                                <img src={grade.artworkImage} alt="Artwork" className="w-full h-full object-cover" />
                              </button>
                              <label className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-white/10 cursor-pointer transition-all active:scale-90" title="เปลี่ยนรูป">
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(student.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          ) : (
                            <label className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-[#10b981] border border-white/10 hover:border-[#10b981]/50 text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95">
                              <Upload className="w-3 h-3" /> อัปรูปผลงาน
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(student.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT MODAL (COMPACT LUXURY CREAM & GOLD) */}
      {showCreateModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden transition-all animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl overflow-hidden border-2 border-[#d4af37]/70 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.25)] bg-gradient-to-br from-[#fbf8ee] via-[#f7f2e4] to-[#ede4d0] text-[#14281e] transition-all animate-in zoom-in-95 duration-150">
            
            {/* Subtle Gold Geometric Art Graphic Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <svg className="absolute inset-0 w-full h-full opacity-25" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                  <pattern id="creamGoldCompactPattern" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#c59f27" strokeWidth="0.5" strokeOpacity="0.35" />
                    <circle cx="0" cy="0" r="1.5" fill="#d4af37" fillOpacity="0.5" />
                    <circle cx="32" cy="32" r="1.5" fill="#d4af37" fillOpacity="0.5" />
                    <path d="M 16 12 L 20 16 L 16 20 L 12 16 Z" fill="none" stroke="#d4af37" strokeWidth="0.4" strokeOpacity="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#creamGoldCompactPattern)" />
              </svg>
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#d4af37]/70 rounded-tl-lg pointer-events-none" />
              <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#d4af37]/70 rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#d4af37]/70 rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#d4af37]/70 rounded-br-lg pointer-events-none" />
            </div>

            {/* Modal Header - Fixed */}
            <div className="relative z-10 px-4 sm:px-5 py-3.5 border-b border-[#d4af37]/35 bg-[#f3ecdb]/90 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#03291b] to-[#064e3b] border border-[#d4af37]/60 text-[#f3d375] shadow-md flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-[#032b1c] tracking-tight leading-tight">
                    {editingAssignment ? 'แก้ไขชิ้นงานศิลปะ' : 'เพิ่มชิ้นงานศิลปะใหม่'}
                  </h3>
                  <p className="text-[10px] text-[#5e6a61] font-medium flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#b89324]" />
                    กำหนดชื่อ หมวดหมู่ และเกณฑ์คะแนน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-[#ebe3d0] hover:bg-[#ded4be] text-[#4a554d] hover:text-[#112419] flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-[#d4af37]/30"
                title="ปิด"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Form Content (Contained scroll if needed on tiny screens) */}
            <form onSubmit={handleSaveAssignment} className="relative z-10 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Row 1: Assignment Title */}
                <div>
                  <label className="block text-xs font-bold text-[#0c2419] mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                      ชื่อชิ้นงาน / หัวข้อศิลปะ: <span className="text-rose-600">*</span>
                    </span>
                    <span className="text-[10px] text-[#717e74]">เช่น ภาพวาดสีน้ำ, หุ่นนิ่ง</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น การวาดเส้นแสงเงาหุ่นนิ่ง (Still Life)"
                    className="w-full bg-[#ffffff] border border-[#d4af37]/45 focus:border-[#b48c26] focus:ring-1 focus:ring-[#d4af37]/30 rounded-xl px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-[#0c2419] font-semibold placeholder-[#9ca3af] outline-none shadow-sm transition-all"
                  />
                </div>

                {/* Row 2: Category with Quick Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#0c2419] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      หมวดหมู่งานศิลปะ:
                    </label>
                    <div className="flex items-center gap-1">
                      {['วาดเส้น', 'สีน้ำ', 'สีโปสเตอร์', 'ปั้น', 'พิมพ์ภาพ', 'ออกแบบ'].map((catLabel) => {
                        const isSelected = category === catLabel;
                        return (
                          <button
                            type="button"
                            key={catLabel}
                            onClick={() => setCategory(catLabel)}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[#032b1c] text-[#fcfbf7] border-[#d4af37]'
                                : 'bg-white/80 text-[#374151] hover:bg-[#ede5d1] border-[#d4af37]/30'
                            }`}
                          >
                            {catLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="พิมพ์หมวดหมู่ หรือเลือกจากปุ่มด้านบน"
                    className="w-full bg-[#ffffff] border border-[#d4af37]/45 focus:border-[#b48c26] focus:ring-1 focus:ring-[#d4af37]/30 rounded-xl px-3 py-1.5 text-xs text-[#0c2419] placeholder-[#9ca3af] outline-none shadow-sm transition-all"
                  />
                </div>

                {/* Row 3: Max Score & Due Date in 2 columns */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#0c2419] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                        คะแนนเต็ม: <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-0.5">
                        {[10, 20, 50, 100].map(sc => (
                          <button
                            type="button"
                            key={sc}
                            onClick={() => setMaxScore(sc)}
                            className={`px-1 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                              maxScore === sc
                                ? 'bg-[#d4af37] text-[#042d1e] border-[#b48c26]'
                                : 'bg-white text-[#374151] hover:bg-[#ede5d1] border-[#d4af37]/30'
                            }`}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      value={maxScore}
                      onChange={(e) => setMaxScore(Number(e.target.value))}
                      className="w-full bg-[#ffffff] border border-[#d4af37]/45 focus:border-[#b48c26] focus:ring-1 focus:ring-[#d4af37]/30 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-[#0c2419] font-bold outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0c2419] mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                      กำหนดส่ง (ถ้ามี):
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#d4af37]/45 focus:border-[#b48c26] focus:ring-1 focus:ring-[#d4af37]/30 rounded-xl px-3 py-1.5 text-xs text-[#0c2419] outline-none shadow-sm cursor-pointer"
                    />
                  </div>
                </div>

                {/* Row 4: Description / Scoring Rubrics */}
                <div>
                  <label className="block text-xs font-bold text-[#0c2419] mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                    เกณฑ์การให้คะแนน / คำอธิบาย:
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="เช่น สัดส่วน 5 คะแนน, แสงเงา 5 คะแนน, ความประณีต 10 คะแนน"
                    className="w-full bg-[#ffffff] border border-[#d4af37]/45 focus:border-[#b48c26] focus:ring-1 focus:ring-[#d4af37]/30 rounded-xl px-3 py-1.5 text-xs text-[#0c2419] placeholder-[#9ca3af] outline-none shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons - Fixed at bottom */}
              <div className="pt-3 mt-1 flex items-center justify-end gap-2 border-t border-[#d4af37]/30 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#4b5563] hover:text-[#111827] bg-[#ebe3d0] hover:bg-[#ded4be] border border-[#d4af37]/30 transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#032e1f] via-[#064e3b] to-[#047857] text-[#fcfbf7] border border-[#d4af37]/60 shadow-md shadow-[#064e3b]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  {editingAssignment ? 'บันทึกแก้ไข' : 'บันทึกชิ้นงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE ASSIGNMENT CONFIRMATION MODAL */}
      {assignmentToDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setAssignmentToDelete(null);
            }
          }}
        >
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden border-2 border-rose-500/50 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.2)] bg-gradient-to-br from-[#fbf8ee] via-[#f7f2e4] to-[#ede4d0] text-[#14281e] p-5 sm:p-6 transition-all animate-in zoom-in-95 duration-150">
            {/* Header / Warning Icon */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-base sm:text-lg text-[#0f291e] tracking-tight">
                  ยืนยันการลบชิ้นงานศิลปะ
                </h3>
                <p className="text-xs text-[#5c685f] mt-0.5">
                  การลบนี้จะไม่สามารถย้อนกลับได้
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssignmentToDelete(null)}
                className="w-7 h-7 rounded-full bg-[#ebe3d0] hover:bg-[#ded4be] text-[#4a554d] hover:text-[#112419] flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/80 border border-[#d4af37]/35 shadow-inner">
              <p className="text-xs sm:text-sm text-[#0f291e] font-semibold">
                คุณต้องการลบชิ้นงาน <span className="text-rose-700 font-extrabold underline">"{assignmentToDelete.title}"</span> ใช่หรือไม่?
              </p>
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <span>⚠️</span> คะแนนและรูปภาพผลงานทั้งหมดที่ส่งในชิ้นงานนี้จะถูกลบออกจากระบบ
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#4b5563] hover:text-[#111827] bg-[#ebe3d0] hover:bg-[#ded4be] border border-[#d4af37]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteAssignment(assignmentToDelete.id);
                    setAssignmentToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete assignment:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white shadow-md shadow-rose-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบชิ้นงาน'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ARTWORK IMAGE PREVIEW LIGHTBOX */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto overscroll-contain"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewImage(null);
            }
          }}
        >
          <div className="relative max-w-3xl w-full my-auto bg-gradient-to-br from-[#031d13] to-[#01120b] border-2 border-[#d4af37]/60 rounded-3xl p-5 text-[#fcfbf7] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.3)] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/25">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-[#fcfbf7]">{previewImage.studentName}</h4>
                <p className="text-xs text-[#d4af37] font-medium">{previewImage.assignmentTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadImage(previewImage.url, `${previewImage.studentName}_${previewImage.assignmentTitle}.png`)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c5a059] text-[#02130c] font-bold text-xs flex items-center gap-1.5 shadow hover:brightness-110 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> บันทึกรูปภาพ
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white cursor-pointer active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center max-h-[70vh] overflow-hidden rounded-2xl bg-black/60 border border-white/10 p-2">
              <img
                src={previewImage.url}
                alt="Artwork Preview"
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* GRADE & SUBMISSION SUMMARY MODAL */}
      <GradeSummaryModal
        isOpen={showGradeSummaryModal}
        onClose={() => setShowGradeSummaryModal(false)}
      />
    </div>
  );
};
