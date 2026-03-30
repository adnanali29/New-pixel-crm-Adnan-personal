import React from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown } from 'lucide-react';

interface ServiceSelectorProps {
  serviceId: string;
  subServiceId: string;
  onServiceChange: (serviceId: string, subServiceId: string) => void;
  compact?: boolean;
}

export default function ServiceSelector({ serviceId, subServiceId, onServiceChange, compact }: ServiceSelectorProps) {
  const { services } = useApp();

  const selectedService = services.find(s => s.id === serviceId);

  return (
    <div className={`space-y-3 ${compact ? '' : ''}`}>
      {/* Service Dropdown */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
        <div className="relative group">
          <select
            value={serviceId}
            onChange={(e) => onServiceChange(e.target.value, '')}
            className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">Select Service</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Sub Category Dropdown */}
      {serviceId && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category *</label>
          <div className="relative group">
            <select
              value={subServiceId}
              onChange={(e) => onServiceChange(serviceId, e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">Select Sub Category</option>
              {selectedService?.subCategories.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name} {selectedService.hsnCode ? `(HSN: ${selectedService.hsnCode})` : ''}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

