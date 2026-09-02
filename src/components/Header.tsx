import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Palette, Bell, Wifi, WifiOff, RefreshCw, X, CheckCircle2, AlertTriangle, Info, Sparkles, School as SchoolIcon, Layers, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SchoolModal } from './SchoolModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    isOnline,
    isSyncing,
    notifications,
    markNotificationRead,
    clearNotifications,
    schools,
    classRooms,
    selectedSchoolId,
    selectedClassId,
    setSelectedSchoolId,
    setSelectedClassId
  } = useApp();

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const currentSchoolClasses = classRooms.filter(c => c.schoolId === selectedSchoolId);

  const navItems = [
    { id: 'attendance', label: 'เช็กชื่อ', icon: '📝' },
    { id: 'assignments', label: 'งาน / คะแนน', icon: '🎨' },
    { id: 'summary', label: 'สรุปเทอม', icon: '📊' },
    { id: 'reports', label: 'รายงาน', icon: '📑' },
    { id: 'history', label: 'ประวัติ', icon: '⏳' },
    { id: 'manage', label: 'จัดการข้อมูล', icon: '⚙️' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#031810]/85 backdrop-blur-2xl border-b border-[#d4af37]/25 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
      {/* Decorative Luminous Gold & Emerald Accent Bar */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-[#059669] via-[#d4af37] to-[#10b981] opacity-90 shadow-[0_0_12px_rgba(212,175,55,0.6)]" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#e5c158] to-[#047857] p-[1.5px] shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center group hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#03150e]/95 backdrop-blur-md rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35)_0%,transparent_70%)] opacity-80" />
                <Palette className="w-5 h-5 text-[#d4af37] relative z-10" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-[#fcfbf7] via-[#f3d375] to-[#d4af37] bg-clip-text text-transparent drop-shadow-sm">
                  ART ROLL
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37]/20 to-[#10b981]/20 border border-[#d4af37]/40 text-[#f3d375] flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 text-[#d4af37]" /> EMERALD & GOLD
                </span>
              </div>
              <p className="text-[11px] text-[#fcfbf7]/70 font-light flex items-center gap-1">
                <span>สมุดเช็กชื่อห้องศิลปะ</span>
                <span className="text-[#d4af37]/80 font-medium">| ระบบออนไลน์ & คลาวด์</span>
              </p>
            </div>
          </div>

          {/* Quick Stats / Right actions on Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setShowNotifModal(true)}
              className="relative p-2 rounded-xl bg-white/[0.05] text-[#fcfbf7] hover:bg-white/10 border border-[#d4af37]/30 active:scale-90 transition-all cursor-pointer"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4 text-[#d4af37]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#d4af37] to-[#10b981] text-[#02130c] text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className={`p-1.5 rounded-xl border text-[11px] flex items-center gap-1 ${
              isOnline ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Global Classroom & School Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-[#042116]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-[#d4af37]/30 shadow-inner">
          <div className="flex items-center gap-1">
            <SchoolIcon className="w-3.5 h-3.5 text-[#d4af37] ml-1 hidden sm:inline" />
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
                const firstClass = classRooms.find(c => c.schoolId === e.target.value);
                if (firstClass) setSelectedClassId(firstClass.id);
              }}
              className="bg-[#02140d]/80 text-xs sm:text-sm text-[#fcfbf7] font-medium rounded-xl px-2.5 py-1.5 border border-[#d4af37]/25 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 outline-none cursor-pointer max-w-[140px] sm:max-w-[180px] truncate transition-all"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id} className="bg-[#041c14] text-[#fcfbf7]">{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowSchoolModal(true)}
              className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 transition-all cursor-pointer active:scale-90"
              title="เพิ่ม / แก้ไข / จัดการโรงเรียน"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#10b981] ml-1 hidden sm:inline" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-[#02140d]/80 text-xs sm:text-sm text-[#fcfbf7] font-medium rounded-xl px-2.5 py-1.5 border border-[#10b981]/30 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/40 outline-none cursor-pointer max-w-[140px] sm:max-w-[170px] truncate transition-all"
            >
              {currentSchoolClasses.length === 0 ? (
                <option value="" className="bg-[#041c14] text-[#fcfbf7]">ไม่มีห้องเรียน</option>
              ) : (
                currentSchoolClasses.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#041c14] text-[#fcfbf7]">{c.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Desktop Right items */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <div className={`px-3 py-1 rounded-xl border text-xs flex items-center gap-1.5 ${
              isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              <span className="font-medium">{isOnline ? (isSyncing ? 'กำลังซิงค์...' : 'คลาวด์ออนไลน์ (Firebase Active)') : 'โหมดออฟไลน์'}</span>
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />}
            </div>

            <button
              onClick={() => setShowNotifModal(true)}
              className="relative p-2 rounded-xl bg-white/[0.05] text-[#fcfbf7] hover:bg-[#d4af37]/20 border border-[#d4af37]/30 hover:border-[#d4af37]/60 transition-all cursor-pointer active:scale-90"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4 text-[#d4af37]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#d4af37] to-[#10b981] text-[#02130c] text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce shadow-md">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:block border-t border-[#d4af37]/15 bg-[#02110a]/40">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 overflow-x-auto py-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-4 py-2 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#d4af37]/25 via-[#e5c158]/20 to-[#059669]/25 text-[#fcfbf7] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                    : 'text-[#fcfbf7]/70 hover:text-white hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute -bottom-1.5 left-3 right-3 h-0.5 bg-gradient-to-r from-[#059669] via-[#d4af37] to-[#10b981] rounded-full shadow-[0_0_10px_#d4af37]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification Modal Drawer */}
      <AnimatePresence>
        {showNotifModal && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-end p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNotifModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-[#041c14] border-2 border-[#d4af37]/40 rounded-3xl w-full max-w-md p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative text-[#fcfbf7] mt-2 sm:mt-12"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#d4af37]/20 relative z-10">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#d4af37]" />
                  <h3 className="font-bold text-base text-[#fcfbf7]">ประวัติการบันทึก & การแจ้งเตือน</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold bg-gradient-to-r from-[#d4af37] to-[#10b981] text-[#02130c] px-2 py-0.5 rounded-full shadow">
                      ใหม่ {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-[#d4af37] hover:underline cursor-pointer active:scale-95"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 max-h-[60vh] overflow-y-auto space-y-2 relative z-10 pr-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#10b981]/60" />
                    <p className="text-sm font-medium">ไม่มีการแจ้งเตือนใหม่ในขณะนี้</p>
                    <p className="text-xs text-gray-500 mt-1">ข้อมูลทั้งหมดซิงค์กับฐานข้อมูล Firebase เรียบร้อย</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const timeStr = new Date(notif.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${
                          notif.read ? 'bg-white/[0.02] border-white/5 opacity-80' : 'bg-white/[0.06] border-[#d4af37]/40 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
                          {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                          {notif.type === 'update' && <Sparkles className="w-4 h-4 text-[#d4af37] mt-0.5 shrink-0" />}
                          {notif.type === 'info' && <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-[#fcfbf7]">{notif.title}</h4>
                              <span className="text-[10px] text-gray-400">{timeStr}</span>
                            </div>
                            <p className="text-xs text-gray-300 mt-0.5">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* SCHOOL MANAGER MODAL */}
      <SchoolModal
        isOpen={showSchoolModal}
        onClose={() => setShowSchoolModal(false)}
      />
    </header>
  );
};
