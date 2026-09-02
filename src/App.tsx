import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AttendanceTab } from './components/AttendanceTab';
import { AssignmentsTab } from './components/AssignmentsTab';
import { SummaryTab } from './components/SummaryTab';
import { ReportsTab } from './components/ReportsTab';
import { HistoryTab } from './components/HistoryTab';
import { ManageTab } from './components/ManageTab';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('attendance');

  return (
    <div className="min-h-screen starry-bg text-[#fcfbf7] flex flex-col selection:bg-[#d4af37] selection:text-[#02130c] pb-20 md:pb-8 relative overflow-x-hidden">
      {/* Luxury Emerald, White & Gold Ambient Glowing Spheres */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top-Right Royal Gold Glow */}
        <div className="absolute -top-32 right-0 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18)_0%,transparent_65%)] blur-3xl pointer-events-none" />
        
        {/* Bottom-Left Emerald Forest Glow */}
        <div className="absolute bottom-0 -left-24 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.22)_0%,transparent_65%)] blur-3xl pointer-events-none" />
        
        {/* Center Deep Emerald Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full bg-[radial-gradient(circle_at_center,rgba(4,33,22,0.6)_0%,transparent_70%)] blur-2xl pointer-events-none" />

        {/* Concentric Decorative Rings */}
        <div className="absolute -top-12 -left-12 w-[340px] h-[340px] rounded-full border border-[#d4af37]/15 pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-[560px] h-[560px] rounded-full border border-[#10b981]/15 pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[280px] h-[280px] rounded-full border border-[#d4af37]/10 pointer-events-none" />
      </div>

      {/* Main Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 relative z-10">
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'assignments' && <AssignmentsTab />}
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'manage' && <ManageTab />}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
