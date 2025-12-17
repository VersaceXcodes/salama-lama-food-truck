import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Star, MapPin, Phone, Clock, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';

// ===========================
// Type Definitions
// ===========================

interface FeaturedItem {
  item_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_limited_edition: boolean;
}

interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    postal_code: string;
  };
  operating_hours: Record<string, any>;
  delivery_enabled: boolean;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
}

interface Review {
  author_name: string;
  rating: number;
  text: string;
  time: string;
  profile_photo_url?: string;
}

interface GoogleReviews {
  aggregate_rating: number;
  total_count: number;
  reviews: Review[];
}

// ===========================
// API Functions
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchFeaturedItems = async (): Promise<FeaturedItem[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/menu/items`, {
    params: {
      is_featured: true,
      limit: 6,
      is_active: true,
    },
  });

  return response.data.items.map((item: any) => ({
    item_id: item.item_id,
    name: item.name,
    description: item.description?.substring(0, 100) + (item.description?.length > 100 ? '...' : '') || '',
    price: Number(item.price || 0),
    image_url: item.image_url || `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=300&fit=crop&q=80`,
    is_limited_edition: item.is_limited_edition || false,
  }));
};

const fetchBusinessInfo = async (): Promise<BusinessInfo> => {
  const response = await axios.get(`${API_BASE_URL}/api/business/info`);
  
  return {
    name: response.data.name || 'Salama Lama Food Truck',
    phone: response.data.phone || '',
    email: response.data.email || '',
    address: response.data.address || '',
    operating_hours: response.data.operating_hours || {},
    delivery_enabled: response.data.delivery_enabled || false,
    social_links: response.data.social_links || {},
  };
};

const fetchGoogleReviews = async (): Promise<GoogleReviews> => {
  const response = await axios.get(`${API_BASE_URL}/api/business/reviews`, {
    params: { limit: 5 },
  });

  return {
    aggregate_rating: Number(response.data.aggregate_rating || 0),
    total_count: response.data.total_count || 0,
    reviews: (response.data.reviews || []).map((review: any) => ({
      author_name: review.author_name || 'Anonymous',
      rating: review.rating || 5,
      text: review.text?.substring(0, 200) + (review.text?.length > 200 ? '...' : '') || '',
      time: review.time || new Date().toISOString(),
      profile_photo_url: review.profile_photo_url,
    })),
  };
};

const subscribeToNewsletter = async (email: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/api/newsletter/subscribe`, { email });
};

// ===========================
// Main Component
// ===========================

const UV_Landing: React.FC = () => {


  // Local state
  const [newsletter_email, setNewsletterEmail] = useState('');
  const [newsletter_error, setNewsletterError] = useState<string | null>(null);

  // Global state access (individual selectors - CRITICAL)
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // React Query - Fetch featured items
  const {
    data: featured_items = [],
    isLoading: items_loading,
    isError: items_error,
  } = useQuery({
    queryKey: ['featured-items'],
    queryFn: fetchFeaturedItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // React Query - Fetch business info
  const {
    data: business_info,
    isLoading: business_loading,
  } = useQuery({
    queryKey: ['business-info'],
    queryFn: fetchBusinessInfo,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // React Query - Fetch Google reviews
  const {
    data: google_reviews,
    isLoading: reviews_loading,
  } = useQuery({
    queryKey: ['google-reviews'],
    queryFn: fetchGoogleReviews,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });

  // React Query - Newsletter subscription mutation
  const newsletter_mutation = useMutation({
    mutationFn: subscribeToNewsletter,
    onSuccess: () => {
      setNewsletterEmail('');
      setNewsletterError(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Subscription failed. Please try again.';
      setNewsletterError(message);
    },
  });

  // Handle newsletter submission
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterError(null);

    if (!newsletter_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletter_email)) {
      setNewsletterError('Please enter a valid email address');
      return;
    }

    newsletter_mutation.mutate(newsletter_email);
  };

  // Helper function to render star rating (Solid Dark Brown)
  const renderStars = (rating: number) => {
    const stars: JSX.Element[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-5 h-5 fill-[#2C1A16] text-[#2C1A16]" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-5 h-5 fill-[#2C1A16] text-[#2C1A16]" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        );
      } else {
        stars.push(
          <Star key={i} className="w-5 h-5 text-gray-300" />
        );
      }
    }
    return stars;
  };

  // ONE BIG RENDER BLOCK - CRITICAL REQUIREMENT
  return (
    <>
      {/* Hero Section - Super Modern Split Screen */}
      <section className="relative bg-[#F2EFE9] overflow-hidden min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 lg:py-24 w-full">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            
            {/* Left Side - Text Content on Cream Background */}
            <div className="order-2 lg:order-1 bg-[#F2EFE9] w-full">
              {/* Service Availability Badge */}
              {!business_loading && business_info && (
                <div className="inline-flex items-center px-5 py-2 bg-[#2C1A16] rounded-full shadow-lg mb-8">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium text-[#F2EFE9]">
                    {business_info.delivery_enabled ? 'Collection & Delivery Available' : 'Collection Only'}
                  </span>
                </div>
              )}

              {/* COMMANDMENT #5: Main Heading - Mobile-First Typography */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-[#2C1A16] mb-4 sm:mb-6 leading-tight tracking-tight">
                Where Flavour<br />
                Meets Passion
              </h1>

              {/* Sub-headline - Mobile-First Sizing */}
              <p className="text-base sm:text-lg lg:text-xl text-[#4A3B32] mb-6 sm:mb-8 leading-relaxed font-medium">
                Authentic Subs. Custom Bowls. Made with Heart.
              </p>

              {/* COMMANDMENT #1: Primary CTA - 48px min-height, stacked on mobile, side-by-side on desktop */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full">
                <Link
                  to="/menu"
                  className="group flex items-center justify-center px-8 py-4 bg-[#3E2F26] text-[#F5F0EB] text-lg font-bold shadow-xl hover:bg-[#2C1A16] hover:scale-105 transition-all duration-300 ease-in-out w-full md:w-auto"
                  style={{ minHeight: '56px', borderRadius: '50px' }}
                >
                  Order Now
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
                
                <Link
                  to="/about"
                  className="group flex items-center justify-center px-8 py-4 bg-transparent text-[#3E2F26] text-lg font-bold hover:bg-[#3E2F26] hover:text-[#F5F0EB] transition-all duration-300 ease-in-out w-full md:w-auto"
                  style={{ minHeight: '56px', borderRadius: '50px', border: '1.5px solid #3E2F26' }}
                >
                  Our Story
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>

              {currentUser && (
                <p className="mt-6 text-base text-[#4A3B32] font-medium">
                  Welcome back, {currentUser.first_name}!
                </p>
              )}
            </div>

            {/* Right Side - Floating Food Image with Rounded Corners */}
            <div className="order-1 lg:order-2 relative w-full">
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl lg:shadow-2xl lg:transform lg:translate-x-8 hover:scale-105 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=1000&fit=crop&q=90"
                  alt="Delicious Food"
                  className="w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/5] object-cover"
                />
                {/* Subtle Overlay for Premium Look */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2C1A16]/20 via-transparent to-transparent"></div>
              </div>
              
              {/* Decorative Element - Optional floating badge - hidden on small mobile */}
              <div className="hidden sm:block absolute -bottom-4 sm:-bottom-6 -left-4 sm:-left-6 bg-[#2C1A16] text-[#F2EFE9] px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <p className="text-xs sm:text-sm font-medium mb-1">Made Fresh Daily</p>
                <p className="text-lg sm:text-2xl font-extrabold">100% Quality</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* COMMANDMENT #3: Featured Items Section - Mobile-First Grid */}
      <section className="py-8 sm:py-12 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
              Featured Items
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              Try our most popular dishes
            </p>
          </div>

          {items_loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse"></div>
              ))}
            </div>
          ) : items_error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Unable to load featured items. Please try again later.</p>
            </div>
          ) : featured_items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featured_items.map((item) => (
                <div
                  key={item.item_id}
                  className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                    {item.is_limited_edition && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        Limited Edition
                      </div>
                    )}
                  </div>

                  {/* COMMANDMENT #4: Full-width image on mobile */}
                  <div className="p-5 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2 leading-tight">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span className="text-2xl font-bold text-orange-600">
                        €{item.price.toFixed(2)}
                      </span>
                      <Link
                        to="/menu"
                        className="flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-orange-600 text-white text-base font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                        style={{ minHeight: '48px' }}
                      >
                        Add to Order
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No featured items available at the moment.</p>
            </div>
          )}

          {/* COMMANDMENT #1: Full-width button on mobile */}
          <div className="text-center mt-12">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center px-8 py-4 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors w-full sm:w-auto"
              style={{ minHeight: '56px' }}
            >
              View Full Menu
              <ChevronRight className="ml-2 w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      {!reviews_loading && google_reviews && google_reviews.reviews.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#F2EFE9]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2C1A16] mb-6" style={{ fontWeight: 800 }}>
                Locals Love Salama Lama
              </h2>
              
              {google_reviews.aggregate_rating > 0 && (
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="flex">
                    {renderStars(google_reviews.aggregate_rating)}
                  </div>
                  <span className="text-xl font-semibold text-[#2C1A16]">
                    {google_reviews.aggregate_rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              <p className="text-[#4A3B32]">
                Based on {google_reviews.total_count} reviews
              </p>
            </div>

            {/* Horizontal Scrolling Row */}
            <div className="relative">
              <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {google_reviews.reviews.slice(0, 5).map((review, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[350px] bg-white rounded-2xl shadow-xl border-2 border-[#2C1A16] p-6 snap-start"
                  >
                    <div className="flex items-center mb-4">
                      {review.profile_photo_url ? (
                        <img
                          src={review.profile_photo_url}
                          alt={review.author_name}
                          className="w-12 h-12 rounded-full mr-4"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#F2EFE9] flex items-center justify-center mr-4 border-2 border-[#2C1A16]">
                          <span className="text-[#2C1A16] font-bold text-lg">
                            {review.author_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-[#2C1A16]">
                          {review.author_name}
                        </h4>
                        <div className="flex mt-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="text-[#4A3B32] leading-relaxed">
                      "{review.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-8">
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(business_info?.name || 'Salama Lama Food Truck')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[#2C1A16] font-bold hover:underline transition-all"
              >
                See All Reviews
                <ChevronRight className="ml-1 w-5 h-5" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Location & Schedule Section */}
      {!business_loading && business_info && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Find Us
              </h2>
              <p className="text-lg text-gray-600">
                Come visit us at our location
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Map */}
              <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 h-[400px]">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(`${business_info.address.line1}, ${business_info.address.city}, ${business_info.address.postal_code}`)}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Salama Lama Location"
                ></iframe>
              </div>

              {/* Info */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <MapPin className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                      <p className="text-gray-600">
                        {business_info.address.line1}
                        {business_info.address.line2 && <><br />{business_info.address.line2}</>}
                        <br />
                        {business_info.address.city}, {business_info.address.postal_code}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business_info.address.line1}, ${business_info.address.city}, ${business_info.address.postal_code}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-orange-600 font-medium mt-2 hover:text-orange-700 transition-colors"
                      >
                        Get Directions
                        <ChevronRight className="ml-1 w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Operating Hours
                      </h3>
                      {Object.keys(business_info.operating_hours).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(business_info.operating_hours).map(([day, hours]: [string, any]) => (
                            <div key={day} className="flex justify-between text-sm">
                              <span className="text-gray-600 capitalize">{day}:</span>
                              <span className="text-gray-900 font-medium">
                                {hours.open} - {hours.close}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600">Hours not available</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <Phone className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
                      {business_info.phone && (
                        <a
                          href={`tel:${business_info.phone}`}
                          className="text-gray-600 hover:text-orange-600 transition-colors block mb-1"
                        >
                          {business_info.phone}
                        </a>
                      )}
                      {business_info.email && (
                        <a
                          href={`mailto:${business_info.email}`}
                          className="text-gray-600 hover:text-orange-600 transition-colors block"
                        >
                          {business_info.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Catering CTA Section - High Contrast */}
      <section className="py-16 lg:py-24 bg-[#2C1A16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6 text-[#F2EFE9]" style={{ fontWeight: 800 }}>
              Let Us Cater Your Event
            </h2>
            <p className="text-xl mb-8 text-[#F2EFE9]">
              From corporate events to weddings, we bring the flavor to your special occasion
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {['Corporate Events', 'Weddings', 'Private Parties', 'Festivals'].map((type) => (
                <Link
                  key={type}
                  to={`/catering?event=${encodeURIComponent(type)}`}
                  className="bg-[#F2EFE9]/10 backdrop-blur-sm rounded-lg p-4 text-center border border-[#F2EFE9]/20 hover:bg-[#F2EFE9]/20 hover:border-[#F2EFE9]/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#F2EFE9]/50 focus:ring-offset-2 focus:ring-offset-[#2C1A16]"
                >
                  <p className="font-medium text-[#F2EFE9]">{type}</p>
                </Link>
              ))}
            </div>

            <Link
              to="/catering/inquiry"
              className="inline-flex items-center px-8 py-4 bg-transparent text-[#F2EFE9] text-lg font-bold rounded-lg border-4 border-[#F2EFE9] hover:bg-[#F2EFE9] hover:text-[#2C1A16] transition-all duration-300"
            >
              Request Catering Quote
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 lg:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Stay Updated
              </h2>
              <p className="text-lg text-gray-600">
                Get exclusive offers, new menu items, and location updates
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={newsletter_email}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    setNewsletterError(null);
                  }}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none transition-all"
                  disabled={newsletter_mutation.isPending}
                />
                <button
                  type="submit"
                  disabled={newsletter_mutation.isPending || !newsletter_email}
                  className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {newsletter_mutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>

              {newsletter_mutation.isSuccess && (
                <div className="mt-4 flex items-center text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                  <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                  <p className="text-sm">Thanks for subscribing! Check your inbox.</p>
                </div>
              )}

              {newsletter_error && (
                <div className="mt-4 flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <p className="text-sm">{newsletter_error}</p>
                </div>
              )}

              <p className="mt-4 text-xs text-gray-500 text-center">
                By subscribing, you agree to our{' '}
                <Link to="/privacy" className="text-orange-600 hover:text-orange-700">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#2C1A16] border-t border-[#4A3B32] shadow-2xl">
        <div className="px-4 py-3">
          <Link
            to="/menu"
            className="flex items-center justify-center w-full px-8 py-4 bg-[#3E2F26] text-[#F5F0EB] text-lg font-bold rounded-full shadow-xl hover:bg-[#2C1A16] transition-all duration-300"
            style={{ minHeight: '56px' }}
          >
            Order Delivery
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_Landing;