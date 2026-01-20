import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import { MENU_DATA, HIGHLIGHTS, MenuItem } from '@/data/justEatMenuData';
import { Info, Plus, Search, X, ShoppingBag, Minus, Trash2 } from 'lucide-react';
import ItemCustomizationModal, { ModifierSelection } from '@/components/ItemCustomizationModal';
import { useNavigate } from 'react-router-dom';

// ===========================
// Main Component
// ===========================

const UV_MenuJustEat: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const addToCartAction = useAppStore(state => state.add_to_cart);
  const cartItems = useAppStore(state => state.cart_state.items);
  const updateCartQuantity = useAppStore(state => state.update_cart_quantity);
  const removeFromCart = useAppStore(state => state.remove_from_cart);
  const cartTotal = useAppStore(state => state.cart_state.total);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Active category for sidebar
  const [activeCategory, setActiveCategory] = useState('highlights');

  // Category refs for intersection observer
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Intersection Observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.1) { // Adjusted threshold
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        threshold: [0.1, 0.5, 0.8],
        rootMargin: '-100px 0px -70% 0px', // Adjusted rootMargin for better spy accuracy
      }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Filtered categories based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return MENU_DATA;

    return MENU_DATA.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  // Smooth scroll to category
  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const yOffset = -100; // Account for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveCategory(categoryId);
    }
  };

  // Handle item click
  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setModalOpen(true);
  };

  // Handle add to cart from Modal
  const handleAddToCart = (
    item: MenuItem,
    selectedModifiers: ModifierSelection[],
    quantity: number,
    totalPrice: number
  ) => {
    const unitTotal = totalPrice / quantity;

    const cartItem = {
      item_id: item.id,
      item_name: item.name,
      quantity: quantity,
      unit_price: item.price,
      selectedModifiers: selectedModifiers,
      unitTotal: unitTotal,
      line_total: totalPrice,
      customizations: selectedModifiers.flatMap(group => 
        group.selections.map(sel => ({
          group_name: group.groupTitle,
          option_name: sel.label,
          additional_price: sel.priceDelta
        }))
      )
    };

    addToCartAction(cartItem);

    toast({
      title: 'Added to cart',
      description: `${item.name} x${quantity}`,
      duration: 2000,
    });

    setModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="bg-white min-h-screen font-sans text-[#2C1A16]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
            
            {/* Search Bar */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border-none rounded-full focus:ring-2 focus:ring-[#2C1A16]/10 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout (3-Column) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 relative">
          
          {/* LEFT COLUMN: Navigation Sidebar (Sticky) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-thin">
              <nav className="space-y-1">
                <button
                  onClick={() => scrollToCategory('highlights')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === 'highlights'
                      ? 'bg-[#2C1A16] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-[#F9F5F0] hover:text-[#2C1A16]'
                  }`}
                >
                  Highlights
                </button>
                {MENU_DATA.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category.id
                        ? 'bg-[#2C1A16] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-[#F9F5F0] hover:text-[#2C1A16]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* CENTER COLUMN: Menu Feed */}
          <main className="flex-1 min-w-0">
            {/* Highlights Section */}
            {!searchQuery && (
              <section
                id="highlights"
                ref={(el) => (categoryRefs.current['highlights'] = el)}
                className="mb-10 scroll-mt-24"
              >
                <h2 className="text-xl font-bold mb-6 text-[#2C1A16]">Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {HIGHLIGHTS.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
                    >
                      <div className="relative aspect-[4/3] bg-[#F9F5F0] rounded-lg overflow-hidden mb-4">
                        {item.image ? (
                           <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-orange-800/30 font-bold">
                             {/* Placeholder for actual image */}
                             Food Image
                           </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#F9F5F0] to-gray-100" />
                        )}
                        <button className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white text-[#2C1A16] shadow-md flex items-center justify-center hover:scale-105 transition-transform">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-[#2C1A16] transition-colors">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                          {item.description}
                        </p>
                        <span className="font-semibold text-[#2C1A16]">
                          €{item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Menu Categories */}
            {filteredData.map((category) => (
              <section
                key={category.id}
                id={category.id}
                ref={(el) => (categoryRefs.current[category.id] = el)}
                className="mb-10 scroll-mt-24"
              >
                <div className="flex items-baseline justify-between mb-4 border-b border-gray-100 pb-2">
                  <h2 className="text-xl font-bold text-[#2C1A16]">{category.name}</h2>
                </div>

                {category.note && (
                  <p className="text-sm text-gray-500 mb-6 bg-[#F9F5F0] p-3 rounded-lg inline-block">
                    <Info className="w-4 h-4 inline mr-2 text-[#2C1A16]" />
                    {category.note}
                  </p>
                )}

                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer flex justify-between gap-4"
                    >
                      {/* Left Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#2C1A16] transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-3 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-auto">
                          <span className="font-semibold text-[#2C1A16]">
                            €{item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Right Visual & Action */}
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                        <div className="w-full h-full bg-[#F9F5F0] rounded-xl overflow-hidden">
                           {/* Placeholder Image Logic */}
                           <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                             <span className="text-xs text-gray-300 font-medium">Image</span>
                           </div>
                        </div>
                        
                        {/* Add Button Overlay */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white text-[#2C1A16] shadow-md border border-gray-100 flex items-center justify-center hover:bg-[#2C1A16] hover:text-white transition-colors z-10"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            
             {/* No Results Message */}
            {searchQuery && filteredData.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500">
                  Try searching for something else
                </p>
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: Basket (Sticky) */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
              <div className="p-5 border-b border-gray-100 bg-[#F9F5F0]">
                <h2 className="text-lg font-bold text-[#2C1A16] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Your Order
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Your basket is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.cart_item_id || item.item_id} className="flex flex-col gap-2 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm font-medium text-gray-900 flex-1">
                            {item.quantity}x {item.item_name}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            €{(item.line_total || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Simple list of options if available */}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="text-xs text-gray-500 pl-4 border-l-2 border-gray-100 space-y-0.5">
                            {item.customizations.map((c, idx) => (
                              <p key={idx}>+ {c.option_name}</p>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => updateCartQuantity(item.item_id, Math.max(0, item.quantity - 1))}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                           <button 
                            onClick={() => removeFromCart(item.item_id)}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 text-gray-400 ml-auto"
                            title="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-5 border-t border-gray-100 bg-white space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold text-[#2C1A16]">
                    <span>Total</span>
                    <span>€{cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => navigate('/checkout')}
                    className="w-full py-3.5 bg-[#2C1A16] text-white font-bold rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] shadow-md"
                  >
                    Go to Checkout
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Item Customization Modal */}
      <ItemCustomizationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={selectedItem}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default UV_MenuJustEat;
