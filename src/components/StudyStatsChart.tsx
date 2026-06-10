import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { ReadingHistory } from '../types/bible';
import { BookOpen, Flame, History, Award, Clock } from 'lucide-react';

interface StudyStatsChartProps {
  readingHistory: ReadingHistory[];
}

export const StudyStatsChart: React.FC<StudyStatsChartProps> = ({ readingHistory }) => {
  // Generate the last 7 days (e.g. including today)
  const chartData = useMemo(() => {
    const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const data = [];
    
    // Create map of date string to total reading items
    const readsByDate: Record<string, number> = {};
    readingHistory.forEach(item => {
      try {
        const dateObj = new Date(item.timestamp);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toLocaleDateString('fr-FR');
          readsByDate[dateStr] = (readsByDate[dateStr] || 0) + 1;
        }
      } catch (e) {
        // Fallback
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const fullDateStr = d.toLocaleDateString('fr-FR');
      
      // Each chapter read is estimated at 5 minutes of mindful meditation + reading
      const chaptersReadCount = readsByDate[fullDateStr] || 0;
      
      // Let's add a soft baseline model so empty state looks like a supportive study graph 
      // (e.g., if there are no readings at all, let's show 0 but if we want some visual guide, 
      // we could show the user reading goals with dotted lines). Let's use real data.
      const minutesStudied = chaptersReadCount * 5; 

      data.push({
        day: dateLabel,
        "Minutes d'étude": minutesStudied,
        "Chapitres": chaptersReadCount,
      });
    }

    return data;
  }, [readingHistory]);

  const totalMinutesThisWeek = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item["Minutes d'étude"], 0);
  }, [chartData]);

  const activeDaysCount = useMemo(() => {
    return chartData.filter(item => item["Minutes d'étude"] > 0).length;
  }, [chartData]);

  // Streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const readsByDate: Record<string, boolean> = {};
    
    readingHistory.forEach(item => {
      try {
        const dateObj = new Date(item.timestamp);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toLocaleDateString('fr-FR');
          readsByDate[dateStr] = true;
        }
      } catch (e) {}
    });

    const d = new Date();
    // Check back daily starting today
    while (true) {
      const dateStr = d.toLocaleDateString('fr-FR');
      if (readsByDate[dateStr]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        // If streak is 0, let's also check yesterday just in case they didn't read today yet
        if (streak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString('fr-FR');
          if (readsByDate[yesterdayStr]) {
            streak++;
            yesterday.setDate(yesterday.getDate() - 1);
            let checkD = yesterday;
            while (true) {
              const checkStr = checkD.toLocaleDateString('fr-FR');
              if (readsByDate[checkStr]) {
                streak++;
                checkD.setDate(checkD.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }
        break;
      }
    }
    return streak;
  }, [readingHistory]);

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 space-y-4 text-left select-none relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl"></div>

      {/* Stats header and streak indicator */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <span className="text-[9px] font-mono tracking-[0.15em] text-[#c9a84c] font-bold uppercase block">
            STATISTIQUES DE MÉDITATION
          </span>
          <h4 className="font-serif font-extrabold text-[#e8e0d0] text-sm tracking-tight flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#c9a84c]" />
            <span>Étude Hebdomadaire</span>
          </h4>
        </div>

        {/* Streak pill */}
        <div className="bg-gradient-to-r from-[#a08232]/10 to-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <Flame className={`w-3.5 h-3.5 ${currentStreak > 0 ? 'text-[#c9a84c] animate-pulse' : 'text-[#6b6355]'}`} fill={currentStreak > 0 ? '#c9a84c' : 'none'} />
          <span className="text-[10px] font-mono font-extrabold text-[#c9a84c]">
            {currentStreak} {currentStreak > 1 ? 'JOURS' : 'JOUR'}
          </span>
        </div>
      </div>

      {/* Grid of high-level stats cards */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="bg-[#1a1712] border border-[#2e2a1e] p-2.5 rounded-xl space-y-0.5">
          <span className="text-[8px] font-mono text-[#6b6355] uppercase block">TEMPS TOTAL</span>
          <span className="font-mono text-sm font-extrabold text-[#e8e0d0]">
            {totalMinutesThisWeek} <span className="text-[10px] font-bold text-[#c9a84c]">min</span>
          </span>
        </div>
        <div className="bg-[#1a1712] border border-[#2e2a1e] p-2.5 rounded-xl space-y-0.5">
          <span className="text-[8px] font-mono text-[#6b6355] uppercase block">JOURS ACTIFS</span>
          <span className="font-mono text-sm font-extrabold text-[#e8e0d0]">
            {activeDaysCount} <span className="text-[10px] font-medium text-[#6b6355]">/ 7 J</span>
          </span>
        </div>
      </div>

      {/* Interactive Responsive Recharts Graph */}
      <div className="w-full h-[150px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              stroke="#2e2a1e" 
              strokeDasharray="3 3" 
              vertical={false}
              opacity={0.3} 
            />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#6b6355', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#6b6355', fontSize: 10, fontFamily: 'monospace' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1712',
                borderColor: '#2e2a1e',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'serif',
                color: '#e8e0d0'
              }}
              labelStyle={{ color: '#c9a84c', fontWeight: 'bold' }}
              itemStyle={{ color: '#e8e0d0' }}
            />
            <Area 
              type="monotone" 
              dataKey="Minutes d'étude" 
              stroke="#c9a84c" 
              strokeWidth={1.8}
              fillOpacity={1} 
              fill="url(#colorMinutes)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-[#6b6355] pt-1 border-t border-[#2e2a1e]/40">
        <span>Objectif : 15 min / jour</span>
        <span className="text-[#c9a84c] flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          <span>Fidélité spirituelle</span>
        </span>
      </div>

    </div>
  );
};
