import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  History,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Filter,
  Users,
  Sparkles
} from 'lucide-react';

export const HistoryTab: React.FC = () => {
  const {
    attendanceRecords,
    students,
    statuses,
    selectedSchoolId,
    selectedClassId,
    deleteAttendanceRecord
  } = useApp();

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter records for current classroom
  const classRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.schoolId === selectedSchoolId && r.classId === selectedClassId);
  }, [attendanceRecords, selectedSchoolId, selectedClassId]);

  // Group records by Date (latest date first)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof classRecords>();

    classRecords.forEach(rec => {
      const existing = map.get(rec.date) || [];
      existing.push(rec);
      map.set(rec.date, existing);
    });

    // Sort dates descending
    const sortedDates = Array.from(map.keys()).sort((a, b) => (b > a ? 1 : -1));

    return sortedDates.map(date => {
      const records = map.get(date) || [];

      // Calculate summary count for each status on this date
      const counts: Record<string, number> = {};
      records.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });

      return {
        date,
        records,
        counts,
        totalChecked: records.length
      };
    });
  }, [classRecords]);

  // Filtered grouped entries
  const filteredGroups = useMemo(() => {
    return groupedByDate.filter(group => {
      if (filterDate && group.date !== filterDate) return false;

      if (filterStatus !== 'all') {
        const hasStatus = group.records.some(r => r.status === filterStatus);
        if (!hasStatus) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesStudent = group.records.some(r => {
          const student = students.find(s => s.id === r.studentId);
          return (
            (student?.name && student.name.toLowerCase().includes(term)) ||
            (student?.studentNumber && String(student.studentNumber).includes(term)) ||
            (student?.studentCode && String(student.studentCode).includes(term))
          );
        });
        if (!matchesStudent) return false;
      }

      return true;
    });
  }, [groupedByDate, filterDate, filterStatus, searchTerm, students]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* History Header & Filters */}
      <div className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#d4af37]/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#021810] to-[#062f20] border border-[#d4af37]/35 text-[#d4af37] shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#fcfbf7] flex items-center gap-2">
                ประวัติการเช็กชื่อย้อนหลัง
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]">
                  {groupedByDate.length} วัน
                </span>
              </h2>
              <p className="text-xs text-gray-300">
                ตรวจสอบบันทึกเวลาเข้าเรียนรายวัน แก้ไข หรือลบบันทึกประวัติ
              </p>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">เลือกวันที่:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#02140d] border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#10b981] mb-1">กรองสถานะ:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#02140d] border border-[#10b981]/30 focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[#fcfbf7] outline-none cursor-pointer"
            >
              <option value="all">ทุกสถานะ</option>
              {statuses.map(st => (
                <option key={st.id} value={st.code}>{st.code} ({st.label})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#d4af37] mb-1">ค้นหานักเรียน:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#d4af37] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ชื่อ หรือเลขที่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#02140d] border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl pl-9 pr-3 py-2 text-xs text-[#fcfbf7] outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Timeline Lists */}
      {filteredGroups.length === 0 ? (
        <div className="starry-canvas-card rounded-3xl p-8 sm:p-12 text-center border border-[#d4af37]/20">
          <History className="w-10 h-10 text-[#d4af37]/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#fcfbf7]">ไม่พบบันทึกประวัติการเช็กชื่อ</h3>
          <p className="text-xs text-gray-400 mt-1">
            ลองปรับเปลี่ยนวันที่หรือเงื่อนไขการค้นหา
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            <div
              key={group.date}
              className="starry-canvas-card rounded-3xl p-5 sm:p-6 border border-[#d4af37]/25 shadow-xl space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#d4af37]/20">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#d4af37]" />
                  <span className="font-extrabold text-sm sm:text-base text-[#fcfbf7] font-mono">
                    วันที่ {group.date}
                  </span>
                  <span className="text-xs text-gray-400">
                    (เช็กแล้ว {group.totalChecked} คน)
                  </span>
                </div>

                {/* Status distribution badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {statuses.map(st => {
                    const count = group.counts[st.code] || 0;
                    if (count === 0) return null;
                    return (
                      <span
                        key={st.id}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${st.color}20`,
                          borderColor: `${st.color}50`,
                          color: st.color
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                        <span>{st.code}: {count}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Student record items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {group.records.map(rec => {
                  const student = students.find(s => s.id === rec.studentId);
                  const statusObj = statuses.find(s => s.code === rec.status);

                  return (
                    <div
                      key={rec.id}
                      className="p-3 rounded-2xl bg-white/[0.035] border border-white/10 hover:border-[#d4af37]/40 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-black/40 text-xs font-bold text-[#d4af37] flex items-center justify-center font-mono border border-white/10 shrink-0">
                          {student?.studentNumber || '-'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#fcfbf7] truncate">{student?.name || 'ไม่พบข้อมูลนักเรียน'}</p>
                          {rec.checkInTime && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-[#10b981]" /> {rec.checkInTime}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-bold border"
                          style={{
                            backgroundColor: statusObj ? `${statusObj.color}25` : '#ffffff20',
                            borderColor: statusObj ? `${statusObj.color}60` : '#ffffff40',
                            color: statusObj ? statusObj.color : '#ffffff'
                          }}
                        >
                          {rec.status}
                        </span>

                        <button
                          onClick={async () => {
                            await deleteAttendanceRecord(rec.id);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-90"
                          title="ลบบันทึกนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
