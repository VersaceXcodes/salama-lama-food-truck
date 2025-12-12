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

  // Helper function to render star rating
  const renderStars = (rating: number) => {
    const stars: JSX.Element[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1920&q=80')] bg-cover bg-center opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            {/* Service Availability Badge */}
            {!business_loading && business_info && (
              <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow-lg mb-8">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {business_info.delivery_enabled ? 'Collection & Delivery Available' : 'Collection Only'}
                </span>
              </div>
            )}

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Dublin's Favorite<br />
              <span className="text-orange-600">Food Truck Experience</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Fresh, delicious food made with love. Order now and taste the difference.
            </p>

            {/* Primary CTA */}
            <Link
              to="/menu"
              className="inline-flex items-center px-8 py-4 bg-orange-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-orange-700 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Order Now
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>

            {currentUser && (
              <p className="mt-4 text-sm text-gray-500">
                Welcome back, {currentUser.first_name}! 👋
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Featured Items
            </h2>
            <p className="text-lg text-gray-600">
              Try our most popular dishes
            </p>
          </div>

          {items_loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">
                        €{item.price.toFixed(2)}
                      </span>
                      <Link
                        to="/menu"
                        className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
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

          <div className="text-center mt-12">
            <Link
              to="/menu"
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Full Menu
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      {!reviews_loading && google_reviews && google_reviews.reviews.length > 0 && (
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                What Our Customers Say
              </h2>
              
              {google_reviews.aggregate_rating > 0 && (
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="flex">
                    {renderStars(google_reviews.aggregate_rating)}
                  </div>
                  <span className="text-xl font-semibold text-gray-900">
                    {google_reviews.aggregate_rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              <p className="text-gray-600">
                Based on {google_reviews.total_count} reviews
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {google_reviews.reviews.slice(0, 3).map((review, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
                >
                  <div className="flex items-center mb-4">
                    {review.profile_photo_url ? (
                      <img
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        className="w-12 h-12 rounded-full mr-4"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mr-4">
                        <span className="text-orange-600 font-semibold text-lg">
                          {review.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {review.author_name}
                      </h4>
                      <div className="flex mt-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    "{review.text}"
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(business_info?.name || 'Salama Lama Food Truck')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-orange-600 font-medium hover:text-orange-700 transition-colors"
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

      {/* Catering CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-orange-600 to-orange-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Let Us Cater Your Event
            </h2>
            <p className="text-xl mb-8 text-orange-100">
              From corporate events to weddings, we bring the flavor to your special occasion
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {['Corporate Events', 'Weddings', 'Private Parties', 'Festivals'].map((type) => (
                <div
                  key={type}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center"
                >
                  <p className="font-medium">{type}</p>
                </div>
              ))}
            </div>

            <Link
              to="/catering/inquiry"
              className="inline-flex items-center px-8 py-4 bg-white text-orange-600 text-lg font-semibold rounded-lg shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
    </>
  );
};

export default UV_Landing;