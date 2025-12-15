import React, { useState, useMemo } from 'react';
import { X, Clock } from 'lucide-react';
import { TimeSlot } from './CollectionTimePicker';

// ===========================
// Type Definitions
// ===========================

interface TimeSlotsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  availableTimeSlots: TimeSlot[];
  selectedTimeSlot: string | null;
  onSelectTimeSlot: (slotTime: string) => void;
}

type FilterType = 'all' | 'next' | 'afternoon' | 'evening';

interface GroupedSlots {
  [key: string]: {
    label: string;
    date: Date;
    slots: TimeSlot[];
  };
}

// ===========================
// Helper Functions
// ===========================

const getDayLabel = (date: Date): string => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  
  return date.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatTimeOnly = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const getHourOfDay = (isoString: string): number => {
  const date = new Date(isoString);
  return date.getHours();
};

const groupSlotsByDay = (slots: TimeSlot[]): GroupedSlots => {
  const grouped: GroupedSlots = {};

  slots.forEach((slot) => {
    const date = new Date(slot.slot_time);
    const dayKey = date.toDateString();

    if (!grouped[dayKey]) {
      grouped[dayKey] = {
        label: getDayLabel(date),
        date: date,
        slots: [],
      };
    }

    grouped[dayKey].slots.push(slot);
  });

  // Sort slots within each day
  Object.keys(grouped).forEach((dayKey) => {
    grouped[dayKey].slots.sort((a, b) => 
      new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime()
    );
  });

  return grouped;
};

const filterSlots = (slots: TimeSlot[], filterType: FilterType): TimeSlot[] => {
  if (filterType === 'all') return slots;

  const now = new Date();
  const availableSlots = slots.filter(s => s.is_available && new Date(s.slot_time) > now);

  if (filterType === 'next') {
    // Return first 6 available slots
    return availableSlots.slice(0, 6);
  }

  if (filterType === 'afternoon') {
    // 12:00 - 17:00
    return slots.filter(s => {
      const hour = getHourOfDay(s.slot_time);
      return hour >= 12 && hour < 17;
    });
  }

  if (filterType === 'evening') {
    // 17:00 onwards
    return slots.filter(s => {
      const hour = getHourOfDay(s.slot_time);
      return hour >= 17;
    });
  }

  return slots;
};

// ===========================
// Main Component
// ===========================

const TimeSlotsSheet: React.FC<TimeSlotsSheetProps> = ({
  isOpen,
  onClose,
  availableTimeSlots,
  selectedTimeSlot,
  onSelectTimeSlot,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Group slots by day
  const groupedSlots = useMemo(() => groupSlotsByDay(availableTimeSlots), [availableTimeSlots]);
  const dayKeys = useMemo(() => Object.keys(groupedSlots).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  ), [groupedSlots]);

  // Auto-select first day on open
  React.useEffect(() => {
    if (isOpen && dayKeys.length > 0 && !selectedDay) {
      setSelectedDay(dayKeys[0]);
    }
  }, [isOpen, dayKeys, selectedDay]);

  // Get slots for selected day and apply filter
  const currentDaySlots = useMemo(() => {
    if (!selectedDay || !groupedSlots[selectedDay]) return [];
    return filterSlots(groupedSlots[selectedDay].slots, activeFilter);
  }, [selectedDay, groupedSlots, activeFilter]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl transition-transform duration-300 ease-out"
        style={{
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '85vh',
          backgroundColor: '#FAF8F5',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-12 h-1 rounded-full"
            style={{ backgroundColor: '#D4C5B5' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5DFD6' }}>
          <div className="flex items-center">
            <Clock className="w-6 h-6 mr-3" style={{ color: '#80604A' }} />
            <h2 className="text-xl font-semibold" style={{ color: '#2C2018' }}>
              Select collection time
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: '#DEBF93' }}
          >
            <X className="w-5 h-5" style={{ color: '#2C2018' }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {/* Day Selector (Segmented Control) */}
          {dayKeys.length > 1 && (
            <div className="px-6 py-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {dayKeys.map((dayKey) => (
                  <button
                    key={dayKey}
                    onClick={() => {
                      setSelectedDay(dayKey);
                      setActiveFilter('all');
                    }}
                    className="px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 min-h-[44px]"
                    style={{
                      backgroundColor: selectedDay === dayKey ? '#2C2018' : '#FFFFFF',
                      color: selectedDay === dayKey ? '#FFFFFF' : '#2C2018',
                      border: `2px solid ${selectedDay === dayKey ? '#2C2018' : '#D4C5B5'}`,
                    }}
                  >
                    {groupedSlots[dayKey].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Filter Chips */}
          <div className="px-6 py-3 border-b" style={{ borderColor: '#E5DFD6' }}>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveFilter('all')}
                className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: activeFilter === 'all' ? '#80604A' : '#FFFFFF',
                  color: activeFilter === 'all' ? '#FFFFFF' : '#80604A',
                  border: `1px solid ${activeFilter === 'all' ? '#80604A' : '#D4C5B5'}`,
                }}
              >
                All times
              </button>
              <button
                onClick={() => setActiveFilter('next')}
                className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: activeFilter === 'next' ? '#80604A' : '#FFFFFF',
                  color: activeFilter === 'next' ? '#FFFFFF' : '#80604A',
                  border: `1px solid ${activeFilter === 'next' ? '#80604A' : '#D4C5B5'}`,
                }}
              >
                Next available
              </button>
              <button
                onClick={() => setActiveFilter('afternoon')}
                className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: activeFilter === 'afternoon' ? '#80604A' : '#FFFFFF',
                  color: activeFilter === 'afternoon' ? '#FFFFFF' : '#80604A',
                  border: `1px solid ${activeFilter === 'afternoon' ? '#80604A' : '#D4C5B5'}`,
                }}
              >
                Afternoon
              </button>
              <button
                onClick={() => setActiveFilter('evening')}
                className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200"
                style={{
                  backgroundColor: activeFilter === 'evening' ? '#80604A' : '#FFFFFF',
                  color: activeFilter === 'evening' ? '#FFFFFF' : '#80604A',
                  border: `1px solid ${activeFilter === 'evening' ? '#80604A' : '#D4C5B5'}`,
                }}
              >
                Evening
              </button>
            </div>
          </div>

          {/* Time Slots List */}
          <div className="px-6 py-4">
            {currentDaySlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: '#D4C5B5' }} />
                <p className="text-base font-medium" style={{ color: '#80604A' }}>
                  No available time slots
                </p>
                <p className="text-sm mt-1" style={{ color: '#80604A' }}>
                  Try selecting a different day or filter
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {currentDaySlots.map((slot) => {
                  const isSelected = selectedTimeSlot === slot.slot_time;
                  const isAvailable = slot.is_available;

                  return (
                    <button
                      key={slot.slot_time}
                      onClick={() => isAvailable && onSelectTimeSlot(slot.slot_time)}
                      disabled={!isAvailable}
                      className="px-4 py-3 rounded-2xl font-medium text-base transition-all duration-200 min-h-[48px]"
                      style={{
                        backgroundColor: isSelected 
                          ? '#2C2018' 
                          : isAvailable 
                          ? '#FFFFFF' 
                          : '#F5F3F0',
                        color: isSelected 
                          ? '#FFFFFF' 
                          : isAvailable 
                          ? '#2C2018' 
                          : '#B8B0A5',
                        border: `2px solid ${
                          isSelected 
                            ? '#2C2018' 
                            : isAvailable 
                            ? '#D4C5B5' 
                            : '#E5DFD6'
                        }`,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.5,
                      }}
                    >
                      {formatTimeOnly(slot.slot_time)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom padding for safe area */}
          <div className="h-8" />
        </div>
      </div>
    </>
  );
};

export default TimeSlotsSheet;
