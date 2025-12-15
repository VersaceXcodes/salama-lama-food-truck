import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface MenuControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  onFilterClick: () => void;
  filterCount?: number;
  className?: string;
}

/**
 * MenuControls Component
 * 
 * Compact, mobile-optimized controls for menu pages:
 * - Full-width search input
 * - Side-by-side Filter and Sort controls
 * - Tight vertical spacing
 * - Clear visual hierarchy
 */
export const MenuControls: React.FC<MenuControlsProps> = ({
  searchValue,
  onSearchChange,
  sortValue,
  onSortChange,
  onFilterClick,
  filterCount = 0,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input - Full Width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--primary-text)] opacity-40" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search menu..."
          className="
            w-full pl-10 pr-4 py-3
            text-base
            bg-white
            border-2 border-[var(--border-light)]
            rounded-[var(--radius-btn)]
            text-[var(--primary-text)]
            placeholder:text-[var(--primary-text)]/40
            focus:border-[var(--primary-text)]
            focus:ring-2 focus:ring-[var(--primary-text)]/10
            focus:outline-none
            transition-colors
          "
          style={{ minHeight: 'var(--tap-target-comfortable)' }}
        />
      </div>

      {/* Filter and Sort Row - 2 Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Filter Button */}
        <button
          onClick={onFilterClick}
          className="
            relative
            flex items-center justify-center gap-2
            px-4 py-3
            bg-white
            border-2 border-[var(--border-light)]
            rounded-[var(--radius-btn)]
            text-[var(--primary-text)]
            font-medium
            hover:border-[var(--primary-text)]
            focus:outline-none focus:ring-2 focus:ring-[var(--primary-text)]/10
            transition-colors
          "
          style={{ minHeight: 'var(--tap-target-comfortable)' }}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span>Filters</span>
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--primary-text)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className="
            px-4 py-3
            bg-white
            border-2 border-[var(--border-light)]
            rounded-[var(--radius-btn)]
            text-[var(--primary-text)]
            font-medium
            focus:border-[var(--primary-text)]
            focus:ring-2 focus:ring-[var(--primary-text)]/10
            focus:outline-none
            transition-colors
            appearance-none
            bg-[length:1.25rem] bg-[position:right_0.75rem_center] bg-no-repeat
            pr-10
          "
          style={{ 
            minHeight: 'var(--tap-target-comfortable)',
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%232C1A16' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
          }}
        >
          <option value="default">Sort by</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="price_asc">Price (Low-High)</option>
          <option value="price_desc">Price (High-Low)</option>
        </select>
      </div>
    </div>
  );
};

export default MenuControls;
