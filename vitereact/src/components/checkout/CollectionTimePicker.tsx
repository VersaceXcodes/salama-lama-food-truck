import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import TimeSlotsSheet from './TimeSlotsSheet';

// ===========================
// Type Definitions
// ===========================

export interface TimeSlot {
  slot_time: string;
  is_available: boolean;
  capacity_remaining: number;
}

interface CollectionTimePickerProps {
  availableTimeSlots: TimeSlot[];
  selectedTimeSlot: string | null;
  onSelectTimeSlot: (slotTime: string) => void;
  error?: string | null;
}

// ===========================
// Helper Functions
// ===========================

const formatSelectedTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  const timeString = date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (isToday) {
    return `Today ${timeString}`;
  } else if (isTomorrow) {
    return `Tomorrow ${timeString}`;
  } else {
    const dateString = date.toLocaleDateString('en-IE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `${dateString} ${timeString}`;
  }
};

// ===========================
// Main Component
// ===========================

const CollectionTimePicker: React.FC<CollectionTimePickerProps> = ({
  availableTimeSlots,
  selectedTimeSlot,
  onSelectTimeSlot,
  error,
}) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSelectTime = (slotTime: string) => {
    onSelectTimeSlot(slotTime);
    setIsSheetOpen(false);
  };

  return (
    <div className="w-full">
      {/* Label */}
      <label htmlFor="collection-time-picker" className="block text-sm font-medium mb-2" style={{ color: '#2C2018' }}>
        Collection time
      </label>

      {/* Dropdown Trigger */}
      <button
        id="collection-time-picker"
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className="w-full px-4 py-3 text-left border-2 rounded-2xl transition-all duration-200 flex items-center justify-between min-h-[48px]"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: error ? '#EF4444' : '#D4C5B5',
          boxShadow: '0 1px 3px rgba(44, 32, 24, 0.1)',
        }}
      >
        <div className="flex items-center flex-1">
          <Clock className="w-5 h-5 mr-3" style={{ color: '#80604A' }} />
          <span
            className="text-base"
            style={{ color: selectedTimeSlot ? '#2C2018' : '#80604A' }}
          >
            {selectedTimeSlot ? formatSelectedTime(selectedTimeSlot) : 'Choose a time'}
          </span>
        </div>
        <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: '#80604A' }} />
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}

      {/* Bottom Sheet Modal */}
      <TimeSlotsSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        availableTimeSlots={availableTimeSlots}
        selectedTimeSlot={selectedTimeSlot}
        onSelectTimeSlot={handleSelectTime}
      />
    </div>
  );
};

export default CollectionTimePicker;
