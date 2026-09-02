import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { School } from '../types';
import {
  School as SchoolIcon,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Building,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEditingSchool?: School | null;
}

export const SchoolModal: React.FC<SchoolModalProps> = ({
  isOpen,
  onClose,
  initialEditingSchool
}) => {
  const {
    schools,
    classRooms,
    selectedSchoolId,
    setSelectedSchoolId,
    setSelectedClassId,
    addSchool,
    updateSchool,
    deleteSchool,
    addNotification
  } = useApp();

  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmSchool, setDeleteConfirmSchool] = useState<School | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialEditingSchool) {
      setEditingSchool(initialEditingSchool);
      setSchoolName(initialEditingSchool.name);
      setSchoolCode(initialEditingSchool.code || '');
    } else {
      setEditingSchool(null);
      setSchoolName('');
      setSchoolCode('');
    }
  }, [initialEditingSchool, isOpen]);

  // Auto clear success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const handleStartAdd = () => {
    setEditingSchool(null);
    setSchoolName('');
    setSchoolCode('');
  };

  const handleStartEdit = (school: School) => {
    setEditingSchool(school);
    setSchoolName(school.name);
    setSchoolCode(school.code || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, schoolName.trim(), schoolCode.trim());
        setSuccessMsg(`แก้ไขข้อมูลโรงเรียน "${schoolName.trim()}" สำเร็จ`);
      } else {
        await addSchool(schoolName.trim(), schoolCode.trim());
        setSuccessMsg(`เพิ่มโรงเรียน "${schoolName.trim()}" สำเร็จ`);
      }
      setEditingSchool(null);
      setSchoolName('');
      setSchoolCode('');
    } catch (err) {
      console.error('Error saving school:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (school: School) => {
    if (schools.length <= 1) {
      addNotification('ไม่สามารถลบได้', 'ต้องมีโรงเรียนในระบบอย่างน้อย 1 แห่ง', 'warning');
      return;
    }

    try {
      await deleteSchool(school.id);
      setSuccessMsg(`ลบโรงเรียน "${school.name}" เรียบร้อย`);
      setDeleteConfirmSchool(null);
      if (editingSchool?.id === school.id) {
        setEditingSchool(null);
        setSchoolName('');
        setSchoolCode('');
      }
    } catch (err) {
      console.error('Error deleting school:', err);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl overflow-hidden border-2 border-[#d4af37]/60 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.3)] bg-[#041c14] text-[#fcfbf7] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Top Gold Shimmer Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#059669] via-[#d4af37] to-[#10b981] shrink-0" />

        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#d4af37]/25 bg-gradient-to-r from-[#03150e] via-[#052217] to-[#041a12] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#d4af37]/25 to-[#10b981]/25 border border-[#d4af37]/50 text-[#d4af37] shadow-inner shrink-0">
              <SchoolIcon className="w-6 h-6 text-[#f3d375]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-[#fcfbf7] flex items-center gap-2 truncate">
                จัดการและแก้ไขโรงเรียน
                <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#f3d375] text-xs font-bold shrink-0">
                  {schools.length} โรงเรียน
                </span>
              </h3>
              <p className="text-xs text-[#d4af37]/80 truncate">
                เพิ่มโรงเรียนใหม่ แก้ไขชื่อ/รหัส หรือสลับโรงเรียนเพื่อบันทึกข้อมูล
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 border border-white/10"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUCCESS TOAST NOTIFICATION */}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shrink-0 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
          
          {/* CARD: FORM INPUT (ADD / EDIT) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#02130c] via-[#042416] to-[#031c11] border-2 border-[#d4af37]/40 shadow-inner">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h4 className="text-sm font-bold text-[#f3d375] flex items-center gap-2 truncate">
                {editingSchool ? (
                  <>
                    <Edit2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                    <span className="truncate">กำลังแก้ไข: <strong className="text-white underline">{editingSchool.name}</strong></span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#10b981] shrink-0" />
                    <span>เพิ่มโรงเรียนใหม่ในระบบ</span>
                  </>
                )}
              </h4>

              {editingSchool && (
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-2.5 py-1 rounded-xl text-xs text-[#d4af37] hover:text-white bg-white/5 hover:bg-white/10 border border-[#d4af37]/30 transition-all cursor-pointer shrink-0 ml-2"
                >
                  + เปลี่ยนเป็นเพิ่มใหม่
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#d4af37] mb-1">
                    ชื่อโรงเรียน / สถาบันการศึกษา: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="เช่น โรงเรียนสาธิตศิลปศึกษา"
                    className="w-full bg-black/50 border border-[#d4af37]/50 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30 rounded-xl px-3.5 py-2.5 text-sm text-[#fcfbf7] outline-none transition-all placeholder:text-gray-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    รหัสย่อ (ไม่บังคับ):
                  </label>
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="เช่น ST-ART"
                    className="w-full bg-black/50 border border-white/20 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30 rounded-xl px-3.5 py-2.5 text-sm text-[#fcfbf7] outline-none font-mono transition-all placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1.5">
                {editingSchool && (
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    ยกเลิก
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!schoolName.trim() || isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-[#d4af37] via-[#f3d375] to-[#c5a059] text-[#02130c] shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  {isSubmitting ? (
                    'กำลังบันทึก...'
                  ) : editingSchool ? (
                    <>
                      <Edit2 className="w-4 h-4" /> บันทึกการแก้ไข
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> บันทึกเพิ่มโรงเรียน
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* LIST OF ALL SCHOOLS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-gray-300 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#10b981]" />
                รายชื่อโรงเรียนทั้งหมด ({schools.length} แห่ง)
              </h4>
              <span className="text-[11px] text-gray-400">
                คลิก "เลือกใช้งาน" เพื่อเปลี่ยนโรงเรียนที่ต้องการจัดการ
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {schools.map((school) => {
                const isCurrentSelected = school.id === selectedSchoolId;
                const schoolClassCount = classRooms.filter(c => c.schoolId === school.id).length;
                const isBeingEdited = editingSchool?.id === school.id;

                return (
                  <div
                    key={school.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentSelected
                        ? 'bg-gradient-to-r from-[#063824] to-[#042416] border-[#10b981]/70 shadow-lg shadow-[#10b981]/20'
                        : isBeingEdited
                        ? 'bg-[#221c04] border-[#d4af37] shadow-md shadow-[#d4af37]/30'
                        : 'bg-white/[0.04] border-white/15 hover:border-white/25 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isCurrentSelected
                            ? 'bg-[#10b981]/25 border-[#10b981]/60 text-[#10b981]'
                            : 'bg-black/50 border-white/20 text-gray-300'
                        }`}
                      >
                        <SchoolIcon className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-bold text-[#fcfbf7] truncate">
                            {school.name}
                          </h5>
                          {school.code && (
                            <span className="px-2 py-0.5 rounded-lg bg-black/50 border border-[#d4af37]/40 text-[#f3d375] font-mono text-xs font-bold">
                              {school.code}
                            </span>
                          )}
                          {isCurrentSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[#10b981]/25 border border-[#10b981]/60 text-[#10b981] text-[11px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> กำลังใช้งาน
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#d4af37]" />
                          ห้องเรียนในสังกัด: <strong className="text-white font-bold">{schoolClassCount}</strong> ห้อง
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {!isCurrentSelected ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchoolId(school.id);
                            const firstClass = classRooms.find(c => c.schoolId === school.id);
                            if (firstClass) setSelectedClassId(firstClass.id);
                            setSuccessMsg(`เปลี่ยนโรงเรียนเป็น "${school.name}" แล้ว`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-[#10b981]/25 text-gray-100 hover:text-[#10b981] border border-white/20 hover:border-[#10b981]/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span>เลือกใช้งาน</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-[#10b981]/15 text-[#10b981] text-xs font-bold border border-[#10b981]/30">
                          โรงเรียนปัจจุบัน
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEdit(school)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                          isBeingEdited
                            ? 'bg-[#d4af37] text-black border-[#d4af37]'
                            : 'bg-white/[0.06] hover:bg-[#d4af37]/25 text-[#d4af37] border-white/15'
                        }`}
                        title="แก้ไขชื่อโรงเรียน"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmSchool(school)}
                        disabled={schools.length <= 1}
                        className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/25 text-rose-400 border border-white/15 transition-all cursor-pointer active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed"
                        title={schools.length <= 1 ? 'ต้องมีโรงเรียนอย่างน้อย 1 แห่ง' : 'ลบโรงเรียนนี้'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-[#d4af37]/25 bg-gradient-to-r from-[#03150e] via-[#052217] to-[#041a12] flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-[#d4af37]/80 truncate">
            ✨ ข้อมูลโรงเรียนซิงค์คลาวด์อัตโนมัติแบบเรียลไทม์
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-white/15 to-white/10 hover:bg-white/20 text-[#fcfbf7] border border-white/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmSchool && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#051f15] border-2 border-rose-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-white">ยืนยันการลบโรงเรียน?</h4>
                <p className="text-xs text-rose-300 mt-0.5">{deleteConfirmSchool.name}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              การลบโรงเรียนนี้จะลบข้อมูลที่สังกัดโรงเรียนนี้ คุณต้องการดำเนินการต่อหรือไม่?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmSchool(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 cursor-pointer active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmSchool)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

