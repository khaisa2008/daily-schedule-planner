'use client'

import {
  BookOpen,
  FileText,
  Briefcase,
  BarChart2,
  Target,
  Activity,
  Home,
  Calendar,
  ChevronRight
} from 'lucide-react'

export type DayOfWeek =
  | 'Senin'
  | 'Selasa'
  | 'Rabu'
  | 'Kamis'
  | 'Jumat'
  | 'Sabtu'
  | 'Minggu'

interface DayCardProps {
  day: DayOfWeek
  scheduleCount: number
  onClick: () => void
}

export function DayCard({ day, scheduleCount, onClick }: DayCardProps) {
  const getDayIcon = (day: DayOfWeek) => {
    const icons = {
      Senin: <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
      Selasa: <FileText className="w-5 h-5 md:w-6 md:h-6 text-green-600" />,
      Rabu: <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />,
      Kamis: <BarChart2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />,
      Jumat: <Target className="w-5 h-5 md:w-6 md:h-6 text-pink-600" />,
      Sabtu: <Activity className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />,
      Minggu: <Home className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
    }

    return icons[day] || <Calendar className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
  }

  const getDayColor = (day: DayOfWeek) => {
    const colors = {
      Senin: 'border-blue-600',
      Selasa: 'border-green-500',
      Rabu: 'border-yellow-400',
      Kamis: 'border-purple-500',
      Jumat: 'border-pink-500',
      Sabtu: 'border-orange-500',
      Minggu: 'border-red-500'
    }
    return colors[day] || 'border-gray-400'
  }

  const dayLabel = {
    Senin: 'Monday',
    Selasa: 'Tuesday',
    Rabu: 'Wednesday',
    Kamis: 'Thursday',
    Jumat: 'Friday',
    Sabtu: 'Saturday',
    Minggu: 'Sunday'
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md border-l-[6px] ${getDayColor(
        day
      )} p-4 md:p-5 flex items-center justify-between gap-3 hover:scale-[1.01] transition-all duration-200 cursor-pointer`}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="p-2 md:p-3 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center w-12 h-12 md:w-14 md:h-14 shrink-0">
          {getDayIcon(day)}
        </div>

        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-lg md:text-2xl leading-tight truncate">
            {dayLabel[day]}
          </h3>
          <p className="text-xs md:text-sm font-medium text-gray-400 mt-0.5">
            {scheduleCount} {scheduleCount === 1 ? 'activity' : 'activities'} left
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col items-end justify-between h-12 md:h-14 shrink-0">
        <div className="bg-[#1e5ebc] text-white rounded-full px-2.5 md:px-3 py-1 text-[10px] md:text-xs font-semibold">
          {scheduleCount} {scheduleCount === 1 ? 'task' : 'tasks'}
        </div>

        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-500 stroke-[2.5]" />
      </div>
    </div>
  )
}