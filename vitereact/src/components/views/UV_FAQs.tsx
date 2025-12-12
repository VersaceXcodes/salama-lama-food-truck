import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Search, X, ChevronDown, ChevronUp, HelpCircle, Phone, Mail, MessageCircle } from 'lucide-react';

// ===========================
// TypeScript Interfaces
// ===========================

interface FAQCategory {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

interface FAQItem {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  keywords: string[];
}

// ===========================
// Hardcoded FAQ Data
// ===========================

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'ordering',
    name: 'Ordering',
    description: 'Questions about placing and managing orders',
    sort_order: 1,
  },
  {
    id: 'delivery',
    name: 'Delivery',
    description: 'Delivery zones, fees, and timing',
    sort_order: 2,
  },
  {
    id: 'catering',
    name: 'Catering',
    description: 'Catering services and event inquiries',
    sort_order: 3,
  },
  {
    id: 'loyalty',
    name: 'Loyalty Program',
    description: 'Points, rewards, and referrals',
    sort_order: 4,
  },
  {
    id: 'account',
    name: 'Account & Payments',
    description: 'Account management and payment methods',
    sort_order: 5,
  },
];

const FAQ_ITEMS: FAQItem[] = [
  // Ordering Category
  {
    id: 'faq_1',
    category_id: 'ordering',
    question: 'How do I place an order?',
    answer: 'You can place an order by browsing our menu, adding items to your cart, and proceeding to checkout. You can choose between collection or delivery (if available in your area). Create an account for faster checkout and to track your orders.',
    sort_order: 1,
    is_active: true,
    keywords: ['place order', 'how to order', 'ordering process', 'menu', 'cart', 'checkout'],
  },
  {
    id: 'faq_2',
    category_id: 'ordering',
    question: 'Can I customize my order?',
    answer: 'Yes! Most of our menu items can be customized. When adding an item to your cart, you\'ll see available customization options such as spice level, extra toppings, and dietary modifications. Some items may have additional charges for premium customizations.',
    sort_order: 2,
    is_active: true,
    keywords: ['customize', 'modifications', 'spice level', 'toppings', 'extras', 'changes'],
  },
  {
    id: 'faq_3',
    category_id: 'ordering',
    question: 'What are your operating hours?',
    answer: 'Our operating hours vary by day. You can view our current schedule on our homepage or contact page. We typically operate Monday-Friday 11:00 AM - 8:00 PM and weekends 12:00 PM - 9:00 PM. Check our website for holiday hours and special events.',
    sort_order: 3,
    is_active: true,
    keywords: ['hours', 'open', 'closed', 'schedule', 'timing', 'when open'],
  },
  {
    id: 'faq_4',
    category_id: 'ordering',
    question: 'Can I cancel or modify my order?',
    answer: 'You can cancel your order within 10 minutes of placing it from your order tracking page. After that, please contact us immediately at our phone number. Modifications to orders in progress may not be possible, but we\'ll do our best to accommodate your request.',
    sort_order: 4,
    is_active: true,
    keywords: ['cancel', 'modify', 'change order', 'edit order', 'update order'],
  },
  {
    id: 'faq_5',
    category_id: 'ordering',
    question: 'Do you offer vegetarian and vegan options?',
    answer: 'Absolutely! We have a wide selection of vegetarian and vegan dishes clearly marked on our menu with dietary icons. Use the dietary filters on our menu page to easily find options that suit your preferences. Our staff can also help with dietary questions.',
    sort_order: 5,
    is_active: true,
    keywords: ['vegetarian', 'vegan', 'dietary', 'plant-based', 'meat-free', 'dietary requirements'],
  },

  // Delivery Category
  {
    id: 'faq_6',
    category_id: 'delivery',
    question: 'Do you deliver to my area?',
    answer: 'We deliver to most areas within Dublin. Enter your address during checkout to see if we deliver to your location. Delivery availability and fees may vary by distance. Check our delivery zones map on the checkout page for specific coverage areas.',
    sort_order: 1,
    is_active: true,
    keywords: ['delivery area', 'delivery zone', 'do you deliver', 'delivery coverage', 'location'],
  },
  {
    id: 'faq_7',
    category_id: 'delivery',
    question: 'What are your delivery fees?',
    answer: 'Delivery fees typically range from €3.50 to €6.00 depending on your distance from our location. The exact fee will be calculated and displayed before you complete your order. We offer free delivery on orders over €40 within our standard delivery zone.',
    sort_order: 2,
    is_active: true,
    keywords: ['delivery fee', 'delivery cost', 'delivery charge', 'how much delivery', 'delivery price'],
  },
  {
    id: 'faq_8',
    category_id: 'delivery',
    question: 'How long does delivery take?',
    answer: 'Most deliveries arrive within 30-45 minutes during regular hours. Delivery times may be longer during peak hours (lunch and dinner rush). You\'ll receive an estimated delivery time when placing your order, and you can track your order in real-time from your account.',
    sort_order: 3,
    is_active: true,
    keywords: ['delivery time', 'how long delivery', 'delivery duration', 'wait time', 'delivery speed'],
  },
  {
    id: 'faq_9',
    category_id: 'delivery',
    question: 'Is there a minimum order for delivery?',
    answer: 'Yes, most delivery zones have a minimum order value of €15-€20. The specific minimum for your area will be displayed when you enter your delivery address at checkout. Collection orders have no minimum order value.',
    sort_order: 4,
    is_active: true,
    keywords: ['minimum order', 'minimum delivery', 'order minimum', 'least order amount'],
  },
  {
    id: 'faq_10',
    category_id: 'delivery',
    question: 'Can I track my delivery?',
    answer: 'Yes! Once your order is confirmed, you can track its status in real-time from your order tracking page. You\'ll receive notifications when your order is being prepared, ready, and out for delivery. You can access tracking from the link in your confirmation email or through your account.',
    sort_order: 5,
    is_active: true,
    keywords: ['track delivery', 'order tracking', 'track order', 'where is my order', 'order status'],
  },

  // Catering Category
  {
    id: 'faq_11',
    category_id: 'catering',
    question: 'Do you offer catering services?',
    answer: 'Yes! We provide full catering services for corporate events, weddings, private parties, and community gatherings. Visit our catering page to learn more about our packages and submit an inquiry. We can accommodate groups from 20 to 200+ guests.',
    sort_order: 1,
    is_active: true,
    keywords: ['catering', 'events', 'parties', 'corporate catering', 'wedding catering', 'large orders'],
  },
  {
    id: 'faq_12',
    category_id: 'catering',
    question: 'What is the minimum guest count for catering?',
    answer: 'Our standard minimum for catering services is 20 guests. However, we may be able to accommodate smaller groups depending on availability and event type. Contact us directly to discuss your specific needs and we\'ll do our best to help.',
    sort_order: 2,
    is_active: true,
    keywords: ['minimum guests', 'catering minimum', 'how many people', 'guest count', 'catering size'],
  },
  {
    id: 'faq_13',
    category_id: 'catering',
    question: 'How far in advance should I book catering?',
    answer: 'We recommend booking at least 7-10 days in advance for standard catering requests. For large events (100+ guests) or peak season dates (weekends, holidays), please book 2-3 weeks ahead. Last-minute requests may be accommodated based on availability.',
    sort_order: 3,
    is_active: true,
    keywords: ['book catering', 'catering notice', 'advance booking', 'lead time', 'catering reservation'],
  },
  {
    id: 'faq_14',
    category_id: 'catering',
    question: 'Can you accommodate dietary restrictions for catering?',
    answer: 'Absolutely! We specialize in creating custom menus that accommodate various dietary needs including vegetarian, vegan, gluten-free, halal, and nut-free options. Mention your requirements in the catering inquiry form and we\'ll design a menu to suit your guests.',
    sort_order: 4,
    is_active: true,
    keywords: ['dietary restrictions', 'catering dietary', 'allergies', 'special diet', 'food requirements'],
  },
  {
    id: 'faq_15',
    category_id: 'catering',
    question: 'What equipment and services are included?',
    answer: 'Our catering services include serving equipment, utensils, plates, napkins, and setup assistance. We can also provide staff for larger events. Specific inclusions vary by package - full details will be provided in your custom quote.',
    sort_order: 5,
    is_active: true,
    keywords: ['catering equipment', 'included services', 'setup', 'staff', 'catering package'],
  },

  // Loyalty Program Category
  {
    id: 'faq_16',
    category_id: 'loyalty',
    question: 'How does the loyalty program work?',
    answer: 'Earn 1 point for every €1 you spend on orders. Points can be redeemed for discounts, free items, and special perks. Create an account to automatically start earning points with every order. Track your points and view available rewards in your loyalty dashboard.',
    sort_order: 1,
    is_active: true,
    keywords: ['loyalty program', 'points', 'rewards', 'how to earn', 'loyalty system'],
  },
  {
    id: 'faq_17',
    category_id: 'loyalty',
    question: 'How do I redeem my loyalty points?',
    answer: 'Visit your loyalty dashboard to browse available rewards. Click "Redeem" on any reward you can afford with your points. You\'ll receive a unique reward code to use at checkout. Codes are typically valid for 30 days after redemption.',
    sort_order: 2,
    is_active: true,
    keywords: ['redeem points', 'use points', 'rewards redemption', 'reward code', 'spend points'],
  },
  {
    id: 'faq_18',
    category_id: 'loyalty',
    question: 'Do loyalty points expire?',
    answer: 'Points remain valid for 12 months from the date earned, as long as your account remains active. Any activity (orders or redemptions) extends the expiration of all your points. You\'ll receive notifications before points are about to expire.',
    sort_order: 3,
    is_active: true,
    keywords: ['points expire', 'expiration', 'points validity', 'lose points', 'point duration'],
  },
  {
    id: 'faq_19',
    category_id: 'loyalty',
    question: 'How does the referral program work?',
    answer: 'Share your unique referral code with friends. When they sign up and place their first order, you both earn bonus points! Find your referral code in your loyalty dashboard. There\'s no limit to how many friends you can refer.',
    sort_order: 4,
    is_active: true,
    keywords: ['referral', 'refer friend', 'referral code', 'invite friends', 'referral bonus'],
  },
  {
    id: 'faq_20',
    category_id: 'loyalty',
    question: 'What are badges and how do I earn them?',
    answer: 'Badges are special achievements you unlock by reaching milestones like total orders, spending thresholds, or consecutive weekly orders. Each badge comes with bonus points and bragging rights! View all available badges and your progress in your loyalty dashboard.',
    sort_order: 5,
    is_active: true,
    keywords: ['badges', 'achievements', 'unlock badges', 'badges earn', 'loyalty badges'],
  },

  // Account & Payments Category
  {
    id: 'faq_21',
    category_id: 'account',
    question: 'Do I need an account to order?',
    answer: 'You can browse our menu as a guest, but creating an account provides benefits: faster checkout, order history, loyalty points, saved addresses, and order tracking. Account creation is quick, free, and includes a welcome discount code!',
    sort_order: 1,
    is_active: true,
    keywords: ['account', 'registration', 'sign up', 'create account', 'guest order'],
  },
  {
    id: 'faq_22',
    category_id: 'account',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) through our secure payment processor. You can save your payment methods for faster checkout. For collection orders, we also accept cash payment at pickup.',
    sort_order: 2,
    is_active: true,
    keywords: ['payment methods', 'credit card', 'debit card', 'cash', 'how to pay', 'payment options'],
  },
  {
    id: 'faq_23',
    category_id: 'account',
    question: 'Is my payment information secure?',
    answer: 'Absolutely. We never store your full card details. All payment processing is handled by our secure PCI-compliant payment provider (SumUp). We only store a tokenized reference to your card for future use. Your CVV is never stored and must be re-entered for each transaction.',
    sort_order: 3,
    is_active: true,
    keywords: ['security', 'payment security', 'safe payment', 'card security', 'data protection'],
  },
  {
    id: 'faq_24',
    category_id: 'account',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive a password reset link valid for 1 hour. Click the link and create a new password. If you don\'t receive the email, check your spam folder or contact support.',
    sort_order: 4,
    is_active: true,
    keywords: ['reset password', 'forgot password', 'password recovery', 'change password', 'login issues'],
  },
  {
    id: 'faq_25',
    category_id: 'account',
    question: 'Can I update my account information?',
    answer: 'Yes, you can update your profile information, email, phone number, saved addresses, and payment methods anytime from your account settings. Click on your profile icon and select "My Profile" to make changes. Some changes may require email verification.',
    sort_order: 5,
    is_active: true,
    keywords: ['update account', 'change email', 'edit profile', 'update information', 'account settings'],
  },
];

// ===========================
// Main Component
// ===========================

const UV_FAQs: React.FC = () => {
  // Global state access for business settings
  const businessSettings = useAppStore(state => state.business_settings);

  // Local state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());
  const [_loadingState, _setLoadingState] = useState<boolean>(false);

  // Filtered FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    let filtered = FAQ_ITEMS.filter(faq => faq.is_active);

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category_id === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    // Sort by sort_order
    return filtered.sort((a, b) => a.sort_order - b.sort_order);
  }, [searchQuery, selectedCategory]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FAQ_ITEMS.filter(faq => faq.is_active).forEach(faq => {
      counts[faq.category_id] = (counts[faq.category_id] || 0) + 1;
    });
    return counts;
  }, []);

  // Toggle FAQ expansion
  const toggleFaqExpansion = (faqId: string) => {
    setExpandedFaqIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(faqId)) {
        newSet.delete(faqId);
      } else {
        newSet.add(faqId);
      }
      return newSet;
    });
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Clear category filter
  const clearCategoryFilter = () => {
    setSelectedCategory(null);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null); // Deselect if clicking same category
    } else {
      setSelectedCategory(categoryId);
    }
  };

  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* Breadcrumb */}
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-gray-600">
                <li>
                  <Link to="/" className="hover:text-orange-600 transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <span className="mx-2">/</span>
                </li>
                <li className="text-gray-900 font-medium">FAQs</li>
              </ol>
            </nav>

            {/* Page Title */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <HelpCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Find answers to common questions about ordering, delivery, catering, loyalty rewards, and more.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search FAQs... (e.g., delivery, payment, rewards)"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 text-base"
                aria-label="Search FAQs"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={clearCategoryFilter}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  selectedCategory === null
                    ? 'bg-orange-600 text-white shadow-lg hover:bg-orange-700'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600'
                }`}
              >
                All Categories ({FAQ_ITEMS.filter(f => f.is_active).length})
              </button>
              {FAQ_CATEGORIES.sort((a, b) => a.sort_order - b.sort_order).map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-orange-600 text-white shadow-lg hover:bg-orange-700'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600'
                  }`}
                >
                  {category.name} ({categoryCounts[category.id] || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory) && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-600">Active Filters:</span>
              {searchQuery && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>Search: "{searchQuery}"</span>
                  <button
                    onClick={clearSearch}
                    className="hover:text-orange-900 transition-colors"
                    aria-label="Clear search filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {selectedCategory && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  <span>
                    Category: {FAQ_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </span>
                  <button
                    onClick={clearCategoryFilter}
                    className="hover:text-blue-900 transition-colors"
                    aria-label="Clear category filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredFaqs.length}</span> {filteredFaqs.length === 1 ? 'question' : 'questions'}
            </p>
          </div>

          {/* FAQ Items List */}
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4 max-w-4xl mx-auto">
              {filteredFaqs.map(faq => {
                const isExpanded = expandedFaqIds.has(faq.id);
                const category = FAQ_CATEGORIES.find(c => c.id === faq.category_id);

                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <button
                      onClick={() => toggleFaqExpansion(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 rounded-xl transition-colors"
                      aria-expanded={isExpanded}
                      aria-controls={`faq-answer-${faq.id}`}
                    >
                      <div className="flex-1">
                        {/* Category Badge */}
                        {category && (
                          <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full mb-2">
                            {category.name}
                          </span>
                        )}
                        {/* Question */}
                        <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                      {/* Expand/Collapse Icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-orange-600" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Answer (Collapsible) */}
                    {isExpanded && (
                      <div
                        id={`faq-answer-${faq.id}`}
                        className="px-6 pb-4 pt-2 border-t border-gray-100 animate-fadeIn"
                      >
                        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Empty State
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No FAQs Found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any questions matching your search or filter criteria.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-md"
                  >
                    Clear Search
                  </button>
                )}
                {selectedCategory && (
                  <button
                    onClick={clearCategoryFilter}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Clear Category Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact Support Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gradient-to-br from-orange-600 to-yellow-600 rounded-2xl shadow-xl p-8 lg:p-12 text-white">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Still Have Questions?
              </h2>
              <p className="text-lg text-orange-100 mb-8">
                Can't find the answer you're looking for? Our friendly support team is here to help!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Phone Contact */}
                <a
                  href={`tel:${businessSettings.business_info.phone}`}
                  className="bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 rounded-xl p-6 transition-all duration-200 group"
                >
                  <Phone className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-lg mb-1">Call Us</h3>
                  <p className="text-orange-100 text-sm">
                    {businessSettings.business_info.phone || '+353-1-234-5678'}
                  </p>
                </a>

                {/* Email Contact */}
                <a
                  href={`mailto:${businessSettings.business_info.email}`}
                  className="bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 rounded-xl p-6 transition-all duration-200 group"
                >
                  <Mail className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-lg mb-1">Email Us</h3>
                  <p className="text-orange-100 text-sm">
                    {businessSettings.business_info.email || 'hello@salamalama.ie'}
                  </p>
                </a>

                {/* Contact Page Link */}
                <Link
                  to="/contact"
                  className="bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 rounded-xl p-6 transition-all duration-200 group"
                >
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-lg mb-1">Contact Form</h3>
                  <p className="text-orange-100 text-sm">
                    Visit our contact page
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default UV_FAQs;