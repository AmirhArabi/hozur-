import React, { useMemo } from 'react';
import { PieChart as PieChartIcon, Clock, PlusCircle, Coffee, Info } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MonthCalculationResult } from '../types';
import { formatMinutesToPersianHM, toPersianDigits } from '../utils/jalali';

interface WorkDistributionPieChartProps {
  monthStats: MonthCalculationResult;
  calculatedTotalOvertime: number;
}

interface DistributionSlice {
  id: string;
  name: string;
  minutes: number;
  color: string;
  darkColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const WorkDistributionPieChart: React.FC<WorkDistributionPieChartProps> = ({
  monthStats,
  calculatedTotalOvertime
}) => {
  const totalWork = Math.round(monthStats.totalWorkMinutes || 0);
  const totalOvertime = Math.round(calculatedTotalOvertime || 0);
  const totalLeave = Math.round(monthStats.L_minutes || 0);

  // Separate regular work from overtime to ensure 100% non-overlapping slices
  const regularWork = Math.max(0, totalWork - totalOvertime);
  const totalAccounted = regularWork + totalOvertime + totalLeave;

  const data: DistributionSlice[] = useMemo(() => {
    return [
      {
        id: 'regular',
        name: 'ساعات کاری عادی',
        minutes: regularWork,
        color: '#2563eb', // Blue-600
        darkColor: '#3b82f6',
        icon: Clock,
        description: 'کارکرد در چارچوب موظفی'
      },
      {
        id: 'overtime',
        name: 'ساعات اضافه‌کار',
        minutes: totalOvertime,
        color: '#059669', // Emerald-600
        darkColor: '#10b981',
        icon: PlusCircle,
        description: 'مازاد موظفی و کار در تعطیلات'
      },
      {
        id: 'leave',
        name: 'ساعات مرخصی',
        minutes: totalLeave,
        color: '#d97706', // Amber-600
        darkColor: '#f59e0b',
        icon: Coffee,
        description: 'استحقاقی و ساعتی'
      }
    ].filter((item) => item.minutes > 0);
  }, [regularWork, totalOvertime, totalLeave]);

  const formatDecimalHours = (minutes: number) => {
    const hours = minutes / 60;
    const formatted = hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1);
    return toPersianDigits(formatted);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload as DistributionSlice;
    const pct = totalAccounted > 0 ? ((item.minutes / totalAccounted) * 100).toFixed(1) : '0';

    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-2xl shadow-xl text-right z-50 min-w-[170px]">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
            {item.name}
          </span>
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between gap-3 text-neutral-700 dark:text-neutral-300">
            <span>مدت زمان:</span>
            <span className="font-bold text-neutral-950 dark:text-neutral-50">
              {formatMinutesToPersianHM(item.minutes)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-neutral-500 dark:text-neutral-400 text-[11px]">
            <span>معادل اعشاری:</span>
            <span>{formatDecimalHours(item.minutes)} ساعت</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-neutral-500 dark:text-neutral-400 text-[11px]">
            <span>سهم از کل:</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100">
              {toPersianDigits(pct)}٪
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              نمودار توزیع کارکرد، مرخصی و اضافه‌کار
            </h3>
            <span className="text-[11px] text-neutral-400">
              نسبت ساعات کاری عادی، اضافه‌کار و مرخصی‌های ثبت‌شده در این ماه
            </span>
          </div>
        </div>

        {totalAccounted > 0 && (
          <div className="text-left font-mono">
            <span className="text-[10px] text-neutral-400 block font-medium">مجموع زمان</span>
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {formatMinutesToPersianHM(totalAccounted)} ({formatDecimalHours(totalAccounted)} ساعت)
            </span>
          </div>
        )}
      </div>

      {totalAccounted === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-neutral-400">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
            <Info className="w-5 h-5 text-neutral-400" />
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            برای این ماه هنوز ساعتی از کارکرد، مرخصی یا اضافه‌کار ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Pie Chart Column */}
          <div className="md:col-span-6 relative flex items-center justify-center h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={data.length > 1 ? 4 : 0}
                  dataKey="minutes"
                  strokeWidth={2}
                  stroke="#ffffff"
                  isAnimationActive={true}
                  animationDuration={600}
                >
                  {data.map((entry) => (
                    <Cell
                      key={`cell-${entry.id}`}
                      fill={entry.color}
                      className="cursor-pointer transition-opacity hover:opacity-85"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-[10px] font-semibold text-neutral-400">کل زمان</span>
              <span className="text-base font-bold font-mono text-neutral-950 dark:text-neutral-50 tabular-nums">
                {formatMinutesToPersianHM(totalAccounted)}
              </span>
              <span className="text-[9px] text-neutral-400">
                {formatDecimalHours(totalAccounted)} ساعت
              </span>
            </div>
          </div>

          {/* Slices Legend & Breakdown Column */}
          <div className="md:col-span-6 flex flex-col gap-2.5">
            {/* 1: ساعات کاری عادی */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-2 transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      ساعات کاری عادی
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      ({totalAccounted > 0 ? toPersianDigits(((regularWork / totalAccounted) * 100).toFixed(1)) : '۰'}٪)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    کارکرد عادی موظفی
                  </span>
                </div>
              </div>
              <div className="text-left font-mono shrink-0">
                <span className="font-bold text-xs text-neutral-950 dark:text-neutral-50 block">
                  {formatMinutesToPersianHM(regularWork)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatDecimalHours(regularWork)} ساعت
                </span>
              </div>
            </div>

            {/* 2: ساعات اضافه‌کار */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-2 transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      ساعات اضافه‌کار
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      ({totalAccounted > 0 ? toPersianDigits(((totalOvertime / totalAccounted) * 100).toFixed(1)) : '۰'}٪)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    عادی: {formatMinutesToPersianHM(monthStats.normalOvertimeMinutes || 0)} | تعطیل: {formatMinutesToPersianHM(monthStats.H_minutes || 0)}
                  </span>
                </div>
              </div>
              <div className="text-left font-mono shrink-0">
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                  {formatMinutesToPersianHM(totalOvertime)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatDecimalHours(totalOvertime)} ساعت
                </span>
              </div>
            </div>

            {/* 3: ساعات مرخصی */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-2 transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      ساعات مرخصی
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      ({totalAccounted > 0 ? toPersianDigits(((totalLeave / totalAccounted) * 100).toFixed(1)) : '۰'}٪)
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    استحقاقی و ساعتی ({toPersianDigits(monthStats.daysWithLeaveCount)} روز)
                  </span>
                </div>
              </div>
              <div className="text-left font-mono shrink-0">
                <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block">
                  {formatMinutesToPersianHM(totalLeave)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatDecimalHours(totalLeave)} ساعت
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
