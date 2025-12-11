import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ===========================
// Type Definitions
// ===========================

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
}

interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  description: string;
  mission_statement: string;
  team_members: TeamMember[];
}

// ===========================
// API Functions
// ===========================

const fetchBusinessInfo = async (): Promise<BusinessInfo> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get(`${API_BASE_URL}/api/business/info`, {
    params: {
      include_team: true,
    },
  });

  // Transform backend response to frontend format
  return {
    name: response.data.name || '',
    phone: response.data.phone || '',
    email: response.data.email || '',
    address: response.data.address || '',
    logo_url: response.data.logo_url || '',
    description: response.data.about_description || '',
    mission_statement: response.data.mission || '',
    team_members: response.data.team_info || [],
  };
};

// ===========================
// Main Component
// ===========================

const UV_About: React.FC = () => {
  // Access global business settings for fallback
  const businessSettings = useAppStore(state => state.business_settings);

  // Fetch comprehensive business info for About page
  const {
    data: businessInfo,
    isLoading,
    isError,
    error,
  } = useQuery<BusinessInfo>({
    queryKey: ['business-info', 'about-page'],
    queryFn: fetchBusinessInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Handle contact clicks (tel and mailto)
  const handleContactClick = (type: 'phone' | 'email', value: string) => {
    if (type === 'phone') {
      window.location.href = `tel:${value}`;
    } else if (type === 'email') {
      window.location.href = `mailto:${value}`;
    }
  };

  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading About Us...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Information</h2>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : 'We encountered an error while loading our information. Please try again later.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
              >
                Back to Home
              </Link>
              <Link
                to="/contact"
                className="px-6 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !isError && businessInfo && (
        <div className="min-h-screen bg-gray-50">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-orange-50 to-red-50 py-20 lg:py-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  About {businessInfo.name || businessSettings.business_info.name || 'Salama Lama'}
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  Bringing authentic flavors to the streets of {businessInfo.address || businessSettings.business_info.address || 'Dublin'}
                </p>
                <div className="mt-8">
                  <Link
                    to="/menu"
                    className="inline-flex items-center px-8 py-4 bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <span>Browse Our Menu</span>
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Story Section */}
          {businessInfo.description && (
            <div className="py-16 lg:py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8 text-center">
                    Our Story
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                    {businessInfo.description.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-6">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mission Statement Section */}
          {businessInfo.mission_statement && (
            <div className="py-16 lg:py-24 bg-gradient-to-br from-orange-50 to-red-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-full mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                    Our Mission
                  </h2>
                  <p className="text-xl lg:text-2xl text-gray-700 leading-relaxed italic">
                    "{businessInfo.mission_statement}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Team Section */}
          {businessInfo.team_members && businessInfo.team_members.length > 0 && (
            <div className="py-16 lg:py-24 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                    Meet Our Team
                  </h2>
                  <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    The passionate people behind the flavors you love
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {businessInfo.team_members.map((member, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
                    >
                      {/* Team Member Photo */}
                      <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center overflow-hidden">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-5xl font-bold text-white">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Team Member Info */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {member.name}
                        </h3>
                        <p className="text-orange-600 font-semibold mb-4">
                          {member.role}
                        </p>
                        <p className="text-gray-600 leading-relaxed">
                          {member.bio}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Values Section */}
          <div className="py-16 lg:py-24 bg-gradient-to-br from-orange-50 to-red-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  Our Values
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  The principles that guide everything we do
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Quality */}
                <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Quality First
                  </h3>
                  <p className="text-gray-600">
                    Only the freshest ingredients and authentic recipes
                  </p>
                </div>

                {/* Community */}
                <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Community Focus
                  </h3>
                  <p className="text-gray-600">
                    Building connections through great food
                  </p>
                </div>

                {/* Sustainability */}
                <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Sustainability
                  </h3>
                  <p className="text-gray-600">
                    Eco-friendly practices and local sourcing
                  </p>
                </div>

                {/* Innovation */}
                <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Innovation
                  </h3>
                  <p className="text-gray-600">
                    Creative flavors and modern food experiences
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call-to-Action Section */}
          <div className="py-16 lg:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-12 sm:px-12 lg:py-16 lg:px-16 text-center">
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                    Ready to Experience Our Food?
                  </h2>
                  <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
                    Order online for collection or delivery and taste the difference that passion and quality make.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      to="/menu"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg shadow-lg hover:bg-gray-50 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <span>View Menu</span>
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex items-center justify-center px-8 py-4 bg-orange-800 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-900 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                      <span>Contact Us</span>
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Footer */}
          <div className="py-12 bg-gray-100 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Get in Touch
                </h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-700">
                  {/* Phone */}
                  <button
                    onClick={() => handleContactClick('phone', businessInfo.phone || businessSettings.business_info.phone)}
                    className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium">
                      {businessInfo.phone || businessSettings.business_info.phone}
                    </span>
                  </button>

                  {/* Email */}
                  <button
                    onClick={() => handleContactClick('email', businessInfo.email || businessSettings.business_info.email)}
                    className="flex items-center gap-2 hover:text-orange-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">
                      {businessInfo.email || businessSettings.business_info.email}
                    </span>
                  </button>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">
                      {businessInfo.address || businessSettings.business_info.address}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_About;