import React from 'react';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  icon: any;
  borderColor?: string;
  bgColor?: string;
  textColor?: string;
  color?: string;
  onClick?: () => void;
  subtitle?: string;
}

const colorPresets: Record<string, { border: string; bg: string; text: string }> = {
  blue: { border: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  green: { border: '#10B981', bg: '#ECFDF5', text: '#047857' },
  purple: { border: '#8B5CF6', bg: '#F5F3FF', text: '#6D28D9' },
  amber: { border: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  red: { border: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
};

export default function StatCard({
  label,
  title,
  value,
  icon: IconInput,
  borderColor,
  bgColor,
  textColor,
  color,
  onClick,
  subtitle,
}: StatCardProps) {
  const displayLabel = label || title || '';
  const preset = color ? colorPresets[color] : undefined;

  const finalBorder = borderColor || preset?.border || '#4F46E5';
  const finalBg = bgColor || preset?.bg || '#EEF2FF';
  const finalText = textColor || preset?.text || '#4F46E5';

  const renderIcon = () => {
    if (!IconInput) return null;
    if (React.isValidElement(IconInput)) {
      return IconInput;
    }
    if (typeof IconInput === 'function' || typeof IconInput === 'object') {
      const Comp = IconInput;
      return <Comp size={20} />;
    }
    return IconInput;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
      style={{ borderLeftColor: finalBorder }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{displayLabel}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: finalText }}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: finalBg }}>
          <div style={{ color: finalText }}>{renderIcon()}</div>
        </div>
      </div>
    </div>
  );
}
