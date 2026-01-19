import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/main';
import { useToast } from '@/hooks/use-toast';
import { MENU_DATA, HIGHLIGHTS, MenuItem } from '@/data/justEatMenuData';
import { Info, Plus, Search, X } from 'lucide-react';
import ItemCustomizationModal, { ItemCustomization } from '@/components/ItemCustomizationModal';

// ===========================
// Main Component
// ===========================

const UV_MenuJustEat: React.FC = () => {
  const { toast } = useToast();
  const addToCartAction = useAppStore(state => state.add_to_cart);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Active category for pills
  const [activeCategory, setActiveCategory] = useState('highlights');

  // Category refs for intersection observer
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const pillsContainerRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Intersection Observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        threshold: [0, 0.5, 1],
        rootMargin: '-120px 0px -50% 0px',
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
    }));
  }, [searchQuery]);

  // Smooth scroll to category
  const scrollToCategory = (categoryId: string) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const yOffset = -120; // Account for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Handle item click
  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setModalOpen(true);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedItem) return;

    const cartItem = {
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      quantity: quantity,
      unit_price: selectedItem.price,
      customizations: [],
      line_total: selectedItem.price * quantity,
    };

    addToCartAction(cartItem);

    toast({
      title: 'Added to cart',
      description: `${selectedItem.name} x${quantity}`,
    });

    setModalOpen(false);
    setSelectedItem(null);
    setQuantity(1);
  };

  // Category pills data
  const categoryPills = [
    { id: 'highlights', name: 'Highlights' },
    ...MENU_DATA.map(cat => ({ id: cat.id, name: cat.name })),
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menu</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search in Salama Lama"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 text-base border-2 border-gray-200 rounded-full focus:outline-none focus:border-orange-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Category Pills */}
      <div className="bg-white border-b sticky top-[73px] z-20 shadow-sm">
        <div
          ref={pillsContainerRef}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto scrollbar-hide"
        >
          <div className="flex gap-2 min-w-max">
            {categoryPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => scrollToCategory(pill.id)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  activeCategory === pill.id
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {pill.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Highlights Section */}
        <section
          id="highlights"
          ref={(el) => (categoryRefs.current['highlights'] = el)}
          className="mb-12"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Highlights</h2>
          </div>

          {/* Horizontal Scrollable Cards */}
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="min-w-[260px] sm:min-w-[280px] bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-4 sm:p-5 snap-start cursor-pointer border border-gray-100 flex-shrink-0 relative"
              >
                {/* Category Label */}
                <div className="text-xs text-orange-600 font-bold mb-2 uppercase tracking-wide">
                  {item.category}
                </div>
                
                {/* Content */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-gray-900 leading-tight mb-2">
                      {item.name}
                    </h3>
                    <p className="text-lg font-bold text-gray-900">
                      €{item.price.toFixed(2)}
                    </p>
                  </div>
                  {item.image && (
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-semibold">Image</span>
                    </div>
                  )}
                </div>
                
                {/* Add Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className="w-9 h-9 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-all shadow-md hover:scale-105 ml-auto"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Menu Categories */}
        {filteredData.map((category) => (
          <section
            key={category.id}
            id={category.id}
            ref={(el) => (categoryRefs.current[category.id] = el)}
            className="mb-12"
          >
            {/* Category Header */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
              <span className="text-gray-500 text-sm font-medium">{category.items.length} {category.items.length === 1 ? 'item' : 'items'}</span>
            </div>

            {/* Category Note */}
            {category.note && (
              <p className="text-sm text-gray-600 mb-4 italic">{category.note}</p>
            )}

            {/* Items Grid or Empty State */}
            {category.items.length === 0 ? (
              <div className="py-4">
                <p className="text-gray-500 text-sm">No matching items</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-5 cursor-pointer border border-gray-100 relative group hover:border-orange-200"
                  >
                    {/* Add Button - Top Right */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-all shadow-md group-hover:scale-110 z-10"
                      aria-label="Add to cart"
                    >
                      <Plus className="w-6 h-6" />
                    </button>

                    {/* Item Content */}
                    <div className="flex justify-between gap-4 pr-12">
                      <div className="flex-1">
                        {/* Item Name with Info Icon */}
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 flex-1 leading-tight">
                            {item.name}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(item);
                            }}
                            className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center hover:border-orange-600 hover:text-orange-600 transition-colors flex-shrink-0 mt-0.5"
                            aria-label="View details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Description - 2-3 lines with ellipsis */}
                        {item.description && (
                          <p className="text-gray-600 text-sm line-clamp-3 mb-3 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Price */}
                        <p className="text-xl font-bold text-gray-900">
                          €{item.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Optional Image - Right Thumbnail */}
                      {item.image && (
                        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex-shrink-0 flex items-center justify-center">
                          <span className="text-orange-600 text-xs font-semibold">Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* No Results Message */}
        {searchQuery && filteredData.every(cat => cat.items.length === 0) && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              Try searching with different keywords or browse our categories
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-3 bg-orange-600 text-white rounded-full font-semibold hover:bg-orange-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Item Modal (Simple Version) */}
      {modalOpen && selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Image */}
              {selectedItem.image && (
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
              )}

              {/* Description */}
              {selectedItem.description && (
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {selectedItem.description}
                </p>
              )}

              {/* Price */}
              <div className="text-2xl font-bold text-gray-900 mb-6">
                €{selectedItem.price.toFixed(2)}
              </div>

              {/* Customizations Notice */}
              {selectedItem.hasCustomizations && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-orange-800 font-semibold">
                    Customization options available for this item
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Choose your spice level, add-ons, and extras
                  </p>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-600 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-orange-600 text-white rounded-full font-bold text-lg hover:bg-orange-700 transition-colors shadow-lg"
              >
                Add to Cart • €{(selectedItem.price * quantity).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UV_MenuJustEat;
