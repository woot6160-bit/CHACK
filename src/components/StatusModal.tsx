import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { AttendanceStatusConfig } from '../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LUXURY_PALETTES = [
  { name: 'มรกตเขียว (Emerald)', color: '#10b981' },
  { name: 'ทองคำอร่าม (Royal Gold)', color: '#d4af37' },
  { name: 'ทองแชมเปญ (Champagne)', color: '#e5c158' },
  { name: 'ทับทิมสยาม (Ruby Red)', color: '#ef4444' },
  { name: 'ไพลินน้ำเงิน (Sapphire)', color: '#3b82f6' },
  { name: 'อำพันส้ม (Amber Topaz)', color: '#f59e0b' },
  { name: 'อเมทิสต์ม่วง (Amethyst)', color: '#8b5cf6' },
  { name: 'หยกมินต์ (Jade Mint)', color: '#059669' },
  { name: 'เพทายฟ้า (Cyan Zircon)', color: '#06b6d4' },
  { name: 'ชมพูกลีบบัว (Rose Pearl)', color: '#ec4899' },
  { name: 'คริสตัลเงิน (Silver White)', color: '#94a3b8' },
  { name: 'ทองแดงบรอนซ์ (Bronze Gold)', color: '#b45309' }
];

export const StatusModal: React.FC<StatusModalProps> = ({ isOpen, onClose }) => {
  const { statuses, addStatus, updateStatus, deleteStatus, resetStatusesToDefault } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingStatus, setEditingStatus] = useState<AttendanceStatusConfig | null>(null);

  // Form fields for new or editing status
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formColor, setFormColor] = useState('#10b981');

  // Deletion prompt state
  const [statusToDelete, setStatusToDelete] = useState<AttendanceStatusConfig | null>(null);

  if (!isOpen) return null;

  const startEdit = (st: AttendanceStatusConfig) => {
    setEditingStatus(st);
    setFormCode(st.code);
    setFormLabel(st.label);
    setFormColor(st.color);
    setActiveTab('create');
  };

  const startCreate = () => {
    setEditingStatus(null);
    setFormCode('');
    setFormLabel('');
    setFormColor('#d4af37');
    setActiveTab('create');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) return;

    if (editingStatus) {
      await updateStatus(editingStatus.id, {
        code: formCode.trim(),
        label: formLabel.trim() || formCode.trim(),
        color: formColor,
        bgColor: `bg-[${formColor}]/20 text-[${formColor}] border-[${formColor}]/40`,
        borderColor: `border-[${formColor}]`
      });
    } else {
      await addStatus({
        code: formCode.trim(),
        label: formLabel.trim() || formCode.trim(),
        color: formColor,
        bgColor: `bg-[${formColor}]/20 text-[${formColor}] border-[${formColor}]/40`,
        borderColor: `border-[${formColor}]`,
        isCustom: true
      });
    }

    setEditingStatus(null);
    setFormCode('');
    setFormLabel('');
    setActiveTab('list');
  };

  const confirmDelete = async () => {
    if (statusToDelete) {
      await deleteStatus(statusToDelete.id);
      setStatusToDelete(null);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden transition-all animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-[#041c14] border-2 border-[#d4af37]/40 rounded-3xl text-[#fcfbf7] shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.2)] relative overflow-hidden flex flex-col"
      >
        {/* Luxury Gold Shimmer Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#059669] via-[#d4af37] to-[#10b981] z-20" />

        {/* Ambient background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#10b981]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header - Fixed */}
        <div className="flex items-center justify-between p-3.5 sm:p-4.5 border-b border-[#d4af37]/20 bg-gradient-to-r from-[#03150e] to-[#041a12] relative z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#e5c158] to-[#047857] p-[1.5px] shadow-md shadow-[#d4af37]/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#03150e] rounded-[14px] flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#d4af37]" />
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-[#fcfbf7] flex items-center gap-1.5 truncate">
                จัดการสถานะเช็กชื่อ <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37]">EMERALD & GOLD</span>
              </h3>
              <p className="text-[11px] text-[#d4af37]/80 truncate">
                แก้ไขชื่อย่อ, คำอธิบายเต็ม, โทนสี หรือลบ/เพิ่มสถานะการเช็กชื่อ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub Navigation Bar - Fixed */}
        <div className="flex items-center justify-between gap-2 px-3.5 sm:px-4.5 py-2.5 border-b border-white/10 bg-black/30 relative z-10 shrink-0">
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => { setActiveTab('list'); setEditingStatus(null); }}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                activeTab === 'list'
                  ? 'bg-gradient-to-r from-[#d4af37] to-[#e5c158] text-[#03150e] shadow-md shadow-[#d4af37]/25'
                  : 'text-[#fcfbf7]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              รายการสถานะ ({statuses.length})
            </button>
            <button
              onClick={startCreate}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white shadow-md shadow-[#10b981]/25'
                  : 'text-[#fcfbf7]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {editingStatus ? 'แก้ไขสถานะ' : 'เพิ่มสถานะ'}
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              onClick={resetStatusesToDefault}
              className="px-2.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-300 hover:text-white hover:bg-white/5 hover:border-[#d4af37]/40 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shrink-0"
              title="คืนค่าสถานะมาตรฐานเริ่มต้น"
            >
              <RotateCcw className="w-3 h-3 text-[#d4af37]" />
              <span className="hidden sm:inline">คืนค่าเริ่มต้น</span>
            </button>
          )}
        </div>

        {/* Modal Body - Smooth Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 relative z-10">
          {activeTab === 'list' ? (
            <div className="space-y-2">
              {statuses.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#d4af37]/40 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-gray-400 w-5 text-right">{idx + 1}.</span>
                    
                    {/* Visual Status Badge Preview */}
                    <div
                      className="px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 border"
                      style={{
                        backgroundColor: `${st.color}22`,
                        borderColor: `${st.color}60`,
                        color: st.color
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: st.color }} />
                      <span>{st.code}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#fcfbf7] truncate">{st.label}</p>
                      <p className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
                        <span>สี: {st.color}</span>
                        {st.isCustom && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            กำหนดเอง
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(st)}
                      className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-white/10 hover:border-[#d4af37]/50 transition-all cursor-pointer active:scale-90"
                      title="แก้ไขสถานะนี้"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStatusToDelete(st)}
                      disabled={statuses.length <= 1}
                      className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                        statuses.length <= 1
                          ? 'opacity-30 cursor-not-allowed bg-black/20 text-gray-500 border-white/5'
                          : 'bg-white/[0.05] hover:bg-rose-500/20 text-rose-400 border-white/10 hover:border-rose-500/50'
                      }`}
                      title={statuses.length <= 1 ? 'ต้องมีสถานะอย่างน้อย 1 รายการ' : 'ลบสถานะนี้'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10">
                <h4 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> ตัวอย่างสถานะที่จะแสดงในสมุดเช็กชื่อ
                </h4>
                <div className="flex items-center gap-3">
                  <div
                    className="px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 border shadow-lg"
                    style={{
                      backgroundColor: `${formColor}28`,
                      borderColor: `${formColor}80`,
                      color: formColor
                    }}
                  >
                    <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: formColor }} />
                    <span>{formCode.trim() || 'ชื่อย่อสถานะ'}</span>
                  </div>
                  <span className="text-sm text-gray-300 font-medium">
                    {formLabel.trim() || '(คำอธิบายเต็มของสถานะ)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#d4af37] mb-1">
                    ชื่อย่อ / รหัสปุ่มเช็กชื่อ: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น มา, ขาด, ซ้อม, แข่งขัน, กิจกรรม"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3.5 py-2.5 text-sm text-[#fcfbf7] outline-none transition-all shadow-inner"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">ข้อความสั้นที่จะปรากฏบนปุ่มเช็กชื่อของนักเรียน</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#fcfbf7] mb-1">
                    คำอธิบายเต็ม:
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ไปแข่งขันโครงงานศิลปะระดับเขต"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 focus:border-[#d4af37] rounded-xl px-3.5 py-2.5 text-sm text-[#fcfbf7] outline-none transition-all shadow-inner"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">จะใช้ในรายงานและการแสดงผลแบบละเอียด</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#d4af37] mb-2 flex items-center justify-between">
                  <span>เลือกโทนสีหรูหรา (Emerald, Gold & Gemstones):</span>
                  <span className="font-mono text-gray-400">{formColor}</span>
                </label>

                {/* Preset Palette Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                  {LUXURY_PALETTES.map(pal => (
                    <button
                      type="button"
                      key={pal.color}
                      onClick={() => setFormColor(pal.color)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                        formColor.toLowerCase() === pal.color.toLowerCase()
                          ? 'border-white ring-2 ring-[#d4af37] shadow-md'
                          : 'border-white/10 hover:border-white/30 bg-black/30'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow" style={{ backgroundColor: pal.color }} />
                      <span className="truncate text-[11px] text-gray-200">{pal.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/30 border border-white/10">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-gray-300 font-medium">หรือกำหนดรหัสสีแบบกำหนดเอง (HEX):</span>
                    <input
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      placeholder="#10b981"
                      className="mt-0.5 w-32 bg-black/50 border border-white/10 focus:border-[#d4af37] rounded-lg px-2 py-1 text-xs text-white font-mono outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); setEditingStatus(null); }}
                  className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#d4af37] via-[#e5c158] to-[#059669] text-[#03150e] shadow-lg shadow-[#d4af37]/30 hover:brightness-110 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingStatus ? 'บันทึกการแก้ไขสถานะ' : 'สร้างสถานะใหม่'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Confirmation Sub-modal */}
        <AnimatePresence>
          {statusToDelete && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#041c14] border border-rose-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">ยืนยันการลบสถานะเช็กชื่อ?</h4>
                <p className="text-xs text-gray-300 mt-2">
                  คุณกำลังจะลบสถานะ <strong className="text-rose-400">"{statusToDelete.label || statusToDelete.code}"</strong> ออกจากระบบ
                </p>
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => setStatusToDelete(null)}
                    className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
                  >
                    ยืนยันการลบ
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
};
