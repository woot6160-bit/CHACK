import React from 'react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'attendance', label: 'เช็กชื่อ', icon: '📝' },
    { id: 'assignments', label: 'งาน/คะแนน', icon: '🎨' },
    { id: 'summary', label: 'สรุปเทอม', icon: '📊' },
    { id: 'reports', label: 'รายงาน', icon: '📑' },
    { id: 'history', label: 'ประวัติ', icon: '⏳' },
    { id: 'manage', label: 'จัดการ', icon: '⚙️' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#03150e]/90 backdrop-blur-2xl border-t border-[#d4af37]/25 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] safe-area-bottom">
      <div className="grid grid-cols-6 gap-0.5 px-1 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all cursor-pointer active:scale-90 relative ${
                isActive
                  ? 'bg-gradient-to-br from-[#d4af37]/25 via-[#e5c158]/20 to-[#059669]/25 text-[#fcfbf7] border border-[#d4af37]/45 shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'text-[#fcfbf7]/60 hover:text-white'
              }`}
            >
              <span className={`text-lg transition-transform ${isActive ? 'scale-110 drop-shadow' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium tracking-tight leading-none mt-1 truncate max-w-full ${isActive ? 'font-bold text-[#f3d375]' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-4 h-0.5 bg-[#d4af37] rounded-full shadow-[0_0_8px_#d4af37]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
