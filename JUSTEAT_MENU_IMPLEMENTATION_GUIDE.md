# Just Eat Menu Implementation Guide for Salama Lama

## Overview
This guide outlines the complete implementation to transform the Salama Lama menu to match the Just Eat UI and data structure.

## Phase 1: Database Migration ✅

### Files Created:
- `/app/backend/migrate_justeat_menu_update.sql` - SQL migration with new menu structure
- `/app/vitereact/src/data/justEatMenuData.ts` - TypeScript data file with complete menu

### Migration includes:
- 9 categories (Highlights, Most Popular, Grilled Subs, Saj Wraps, Loaded Fries, Rice Bowls, Sides, Sauces and Dips, Drinks)
- 37 total menu items with exact pricing in EUR
- Customization groups for applicable categories
  - Spice Level (Required)
  - Remove Items (Optional, free)
  - Add-ons (Optional, paid)
  - Extras (Optional, paid)
  - Add a Drink (Optional)

### To apply migration:
```bash
cd /app/backend
# Using SQLite
sqlite3 your_database.db < migrate_justeat_menu_update.sql

# Or using Node.js
node apply_migration.js migrate_justeat_menu_update.sql
```

## Phase 2: UI Components Needed

### 2.1 Search Bar Component
**Location**: Top of menu page
**Features**:
- Full-width search input with placeholder "Search in Salama Lama"
- Live filter by item name + description
- Don't hide categories on search - show empty state within each category

### 2.2 Sticky Category Pills
**Features**:
- Horizontal scrollable pills: Highlights, Most Popular, Grilled Subs, Saj Wraps, Loaded Fries, Rice Bowls, Sides, Sauces and Dips, Drinks
- Sticky positioning on scroll
- Active pill updates via Intersection Observer
- Smooth scroll to section on click
- Responsive: horizontal scroll on mobile, single row on desktop

**Implementation Pattern**:
```tsx
const [activeCategory, setActiveCategory] = useState('highlights');
const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveCategory(entry.target.id);
        }
      });
    },
    { threshold: 0.5, rootMargin: '-100px 0px 0px 0px' }
  );

  Object.values(categoryRefs.current).forEach((ref) => {
    if (ref) observer.observe(ref);
  });

  return () => observer.disconnect();
}, []);
```

### 2.3 Section Headers with Item Counts
**Pattern**:
```tsx
<div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-bold">{category.name}</h2>
  <span className="text-gray-500">{category.itemCount} items</span>
</div>
{category.note && (
  <p className="text-sm text-gray-600 mb-4">{category.note}</p>
)}
```

### 2.4 Highlights Section (Horizontal Carousel)
**Features**:
- 4 compact highlight cards
- Horizontal scrollable on mobile
- Each card shows: small category label, item name, price, circular "+" button
- 1 card (Chicken Grilled Sub) has thumbnail image on right
- 3 cards are text-only

**Card Layout**:
```tsx
<div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
  {HIGHLIGHTS.map((item) => (
    <div key={item.id} className="min-w-[280px] bg-white rounded-lg shadow p-4 snap-start">
      <div className="text-xs text-gray-500 mb-1">{item.category}</div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{item.name}</h3>
          <p className="text-lg font-bold text-orange-600 mt-2">€{item.price.toFixed(2)}</p>
        </div>
        {item.image && (
          <img src={item.image} className="w-16 h-16 rounded-lg object-cover ml-2" />
        )}
      </div>
      <button className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center mt-2">
        +
      </button>
    </div>
  ))}
</div>
```

### 2.5 Menu Item Cards (2-column grid)
**Features**:
- Clean light background, rounded corners, subtle shadow
- 2-column on desktop/tablet, 1-column on mobile
- Item name (bold), price, short description (2-3 lines with ellipsis)
- Small "i" info icon next to name
- Optional thumbnail image on right
- Circular "+" button at top-right

**Card Layout**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {category.items.map((item) => (
    <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <button className="w-4 h-4 rounded-full border border-gray-400 text-gray-400 text-xs flex items-center justify-center">
              i
            </button>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">{item.description}</p>
          <p className="text-xl font-bold">€{item.price.toFixed(2)}</p>
        </div>
        {item.image && (
          <img src={item.image} className="w-24 h-24 rounded-lg object-cover ml-4" />
        )}
      </div>
      <button className="w-10 h-10 rounded-full bg-orange-600 text-white text-2xl flex items-center justify-center absolute top-4 right-4">
        +
      </button>
    </div>
  ))}
</div>
```

### 2.6 Item Modal/Drawer
**Features**:
- Full item name, full description, price, image
- Customization groups (when applicable)
- Quantity stepper
- "Add to cart" button
- Mobile-first design (bottom sheet on mobile, modal on desktop)

**Customization Groups Display**:
```tsx
{item.hasCustomizations && (
  <div className="space-y-6 mt-6">
    {/* Spice Level (Required) */}
    <div>
      <h4 className="font-bold mb-2">Spice Level <span className="text-red-500">*</span></h4>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="radio" name="spice" value="mild" defaultChecked />
          <span>Mild</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="spice" value="spicy" />
          <span>Spicy (harissa instead of hot honey)</span>
        </label>
      </div>
    </div>

    {/* Remove Items (Optional) */}
    <div>
      <h4 className="font-bold mb-2">Remove Items</h4>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" />
          <span>No cheese</span>
        </label>
        {/* ... more options */}
      </div>
    </div>

    {/* Add-ons (Optional, paid) */}
    <div>
      <h4 className="font-bold mb-2">Add-ons</h4>
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input type="checkbox" />
            <span>Chicken topping on fries</span>
          </div>
          <span className="font-bold">+€3.00</span>
        </label>
        {/* ... more options */}
      </div>
    </div>
  </div>
)}
```

## Phase 3: Search Filtering Logic

```tsx
const [searchQuery, setSearchQuery] = useState('');

const filteredCategories = useMemo(() => {
  if (!searchQuery.trim()) return MENU_DATA;

  return MENU_DATA.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));
}, [searchQuery]);

// In render:
{filteredCategories.map(category => (
  <section key={category.id} ref={el => categoryRefs.current[category.id] = el}>
    <CategoryHeader category={category} />
    {category.items.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p>No items match your search</p>
      </div>
    ) : (
      <MenuItemGrid items={category.items} />
    )}
  </section>
))}
```

## Phase 4: QA Checklist

- [ ] Pills stick to top while scrolling
- [ ] Active pill highlights the correct section
- [ ] Clicking a pill scrolls smoothly to that section
- [ ] Search filters items correctly across all categories
- [ ] Empty state shows in each category when no matches
- [ ] Section headers show correct item counts
- [ ] Prices display as €X.XX format
- [ ] Modal shows correct customizations for applicable categories
- [ ] Highlights carousel scrolls horizontally on mobile
- [ ] 2-column grid on desktop, 1-column on mobile
- [ ] "+" button opens modal with item details
- [ ] No old menu items appear

## Implementation Priority

1. **HIGH**: Create new menu data structure (✅ Done)
2. **HIGH**: Add search bar with live filtering
3. **HIGH**: Implement sticky category pills with scroll spy
4. **HIGH**: Create Highlights carousel section
5. **HIGH**: Update menu item card design (2-column grid)
6. **MEDIUM**: Add section headers with counts and notes
7. **MEDIUM**: Update modal to show customization groups
8. **LOW**: Apply database migration
9. **LOW**: Connect UI to backend API (replace mock data)

## File Structure

```
/app/vitereact/src/
  ├── data/
  │   └── justEatMenuData.ts (✅ Created)
  ├── components/
  │   └── views/
  │       └── UV_Menu.tsx (Update needed)
  └── components/ui/
      ├── product-customizer-sheet.tsx (Update needed)
      └── ... (other UI components)

/app/backend/
  └── migrate_justeat_menu_update.sql (✅ Created)
```

## Next Steps

To proceed with the implementation, you can:

1. **Option A**: I can create the complete new UV_Menu.tsx component with all Just Eat features
2. **Option B**: I can create individual reusable components (SearchBar, CategoryPills, HighlightsCarousel, etc.) that you integrate
3. **Option C**: I can update the existing UV_Menu.tsx incrementally, adding one feature at a time

Which approach would you prefer?
