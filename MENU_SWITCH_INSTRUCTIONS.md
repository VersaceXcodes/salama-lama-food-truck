# Menu Switch Instructions

## Quick Start - See the New Just Eat Menu

### Option 1: Temporary Test (No Code Changes)
To test the new menu without modifying App.tsx:

1. Open `/app/vitereact/src/App.tsx`
2. Find line 21: `import UV_Menu from '@/components/views/UV_Menu';`
3. Temporarily change it to: `import UV_Menu from '@/components/views/UV_MenuJustEat';`
4. Save and reload the browser
5. Navigate to `/menu`

### Option 2: Keep Both Menus (Recommended for Testing)
Add a new route for the Just Eat menu:

1. Open `/app/vitereact/src/App.tsx`
2. After line 21, add:
   ```tsx
   import UV_MenuJustEat from '@/components/views/UV_MenuJustEat';
   ```

3. After line 326 (`<Route path="/menu" element={<UV_Menu />} />`), add:
   ```tsx
   <Route path="/menu-justeat" element={<UV_MenuJustEat />} />
   ```

4. Now you can access:
   - Old menu: http://localhost:5173/menu
   - New Just Eat menu: http://localhost:5173/menu-justeat

### Option 3: Fully Replace Old Menu
1. Open `/app/vitereact/src/App.tsx`
2. Change line 21 from:
   ```tsx
   import UV_Menu from '@/components/views/UV_Menu';
   ```
   to:
   ```tsx
   import UV_Menu from '@/components/views/UV_MenuJustEat';
   ```
3. Save and the new menu will replace the old one at `/menu`

## Features Checklist

The new menu includes:

✅ Full-width search bar with "Search in Salama Lama" placeholder
✅ Live filtering by item name and description
✅ Sticky category pills (Highlights, Most Popular, Grilled Subs, etc.)
✅ Active pill updates on scroll (intersection observer)
✅ Smooth scroll to section when clicking pills
✅ Horizontal scrollable pills on mobile
✅ Highlights section with horizontal carousel (4 compact cards)
✅ Section headers with item counts (e.g., "Most Popular • 4 items")
✅ Section notes (e.g., "All grilled subs are served with signature topped fries")
✅ 2-column grid on desktop, 1-column on mobile
✅ Clean card design with rounded corners and shadows
✅ Item cards with name, price, description (2-3 lines), info icon, + button
✅ Empty state when search has no results (per category)
✅ Modal/drawer on item click with quantity stepper
✅ EUR pricing (€) on all items
✅ Responsive mobile-first design

## Menu Data

All menu data with exact pricing is in:
- `/app/vitereact/src/data/justEatMenuData.ts`

Current data includes:
- **Highlights**: 4 items
- **Most Popular**: 4 items
- **Grilled Subs**: 3 items (with note)
- **Saj Wraps**: 3 items (with note)
- **Loaded Fries**: 3 items
- **Rice Bowls**: 3 items (with note)
- **Sides**: 4 items
- **Sauces and Dips**: 7 items
- **Drinks**: 10 items

**Total**: 37 items across 9 categories

## Next Steps

### To Connect to Real Backend:

The new component (`UV_MenuJustEat.tsx`) currently uses static data from `justEatMenuData.ts`. To connect it to your existing backend API:

1. Replace the import:
   ```tsx
   // Remove:
   import { MENU_DATA, HIGHLIGHTS } from '@/data/justEatMenuData';
   
   // Add:
   import { useQuery } from '@tanstack/react-query';
   import axios from 'axios';
   ```

2. Add the API fetch functions from the original `UV_Menu.tsx`:
   - `fetchMenuItems`
   - `fetchCategories`

3. Replace static data with React Query hooks:
   ```tsx
   const { data: menuData } = useQuery({
     queryKey: ['menu-items'],
     queryFn: fetchMenuItems,
   });
   ```

4. Transform backend data to match the component's expected structure

### To Apply Database Migration:

1. Backup your current database:
   ```bash
   cp backend/your_database.db backend/your_database.backup.db
   ```

2. Apply the migration:
   ```bash
   cd backend
   sqlite3 your_database.db < migrate_justeat_menu_update.sql
   ```

3. Restart your backend server

4. The API endpoints will now return the new Just Eat menu data

## Customizations

The component is designed to work with the existing `ProductCustomizerSheet` component. When an item has `hasCustomizations: true`, clicking it will open the customization modal.

To add full customization support:

1. Fetch customization groups from the backend (like in original `UV_Menu.tsx`)
2. Pass them to `ProductCustomizerSheet`
3. Handle the selected customizations in `handleAddToCart`

## Troubleshooting

### Search not working?
- Make sure you're typing in the search bar
- Check the browser console for errors
- Verify the `filteredData` useMemo is running

### Pills not highlighting?
- Check that Intersection Observer is supported in your browser
- Verify category IDs match between `categoryPills` and section elements
- Adjust the `rootMargin` in the useEffect if needed

### Styling issues?
- Make sure Tailwind CSS is configured correctly
- Check that lucide-react icons are installed: `npm install lucide-react`
- Verify the `scrollbar-hide` utility is defined in your Tailwind config

### Items not showing?
- Check the `MENU_DATA` import in `justEatMenuData.ts`
- Verify the data structure matches the `MenuItem` and `MenuCategory` interfaces
- Check browser console for any errors

## Support

If you encounter any issues, check:
1. Browser console for errors
2. Network tab for failed API requests
3. React DevTools for component state

The implementation follows modern React best practices:
- Functional components with hooks
- TypeScript for type safety
- Intersection Observer for scroll spy
- Tailwind CSS for styling
- Mobile-first responsive design
