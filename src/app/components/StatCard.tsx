import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  textColor: string;
  onClick?: () => void;
  subtitle?: string;
}

export default function StatCard({ label, value, icon, borderColor, bgColor, textColor, onClick, subtitle }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: textColor }}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: bgColor }}>
          <div style={{ color: textColor }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
