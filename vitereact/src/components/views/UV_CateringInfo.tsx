import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// ===========================
// Type Definitions
// ===========================

interface CateringPackage {
  name: string;
  description: string;
  min_guests: number;
  price_per_person: number;
}

interface CateringInfo {
  description: string;
  event_types: string[];
  packages: CateringPackage[];
}

// ===========================
// API Function
// ===========================

const fetchCateringInfo = async (): Promise<CateringInfo> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/catering/info`
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_CateringInfo: React.FC = () => {
  // Local state for FAQ accordion
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Fetch catering info using React Query
  const {
    data: cateringInfo,
    isLoading,
    error,
  } = useQuery<CateringInfo, Error>({
    queryKey: ['cateringInfo'],
    queryFn: fetchCateringInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // FAQ data
  const faqs = [
    {
      question: 'What is the minimum order requirement for catering?',
      answer: 'Our minimum catering order is for 20 guests. We can accommodate events of any size, from intimate gatherings to large corporate functions.',
    },
    {
      question: 'How far in advance should I book catering?',
      answer: 'We recommend booking at least 7 days in advance to ensure availability. However, we can sometimes accommodate last-minute requests depending on our schedule.',
    },
    {
      question: 'Do you provide equipment and setup?',
      answer: 'Yes! We provide all necessary serving equipment, setup, and cleanup. Our team will arrive early to set up and will handle all cleanup after your event.',
    },
    {
      question: 'Can you accommodate dietary restrictions?',
      answer: 'Absolutely! We offer vegetarian, vegan, gluten-free, halal, and nut-free options. Just let us know your requirements when submitting your inquiry.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, bank transfers, and company purchase orders for corporate events. A deposit is required to secure your booking.',
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'Cancellations made 72 hours or more before the event will receive a full refund of the deposit. Cancellations within 72 hours are subject to a 50% cancellation fee.',
    },
  ];

  // Event types with icons and descriptions
  const eventTypes = [
    {
      name: 'Corporate Events',
      description: 'Team lunches, meetings, conferences',
      icon: '🏢',
    },
    {
      name: 'Weddings',
      description: 'Ceremony receptions, rehearsal dinners',
      icon: '💑',
    },
    {
      name: 'Private Parties',
      description: 'Birthdays, anniversaries, celebrations',
      icon: '🎉',
    },
    {
      name: 'Festivals & Markets',
      description: 'Food festivals, farmers markets',
      icon: '🎪',
    },
    {
      name: 'Community Events',
      description: 'Fundraisers, charity events, gatherings',
      icon: '🤝',
    },
  ];

  // How it works steps
  const howItWorksSteps = [
    {
      number: 1,
      title: 'Submit Inquiry',
      description: 'Fill out our catering inquiry form with your event details',
      icon: '📝',
    },
    {
      number: 2,
      title: 'Receive Custom Quote',
      description: 'We\'ll send you a detailed quote within 24 hours',
      icon: '💰',
    },
    {
      number: 3,
      title: 'Finalize Details',
      description: 'Work with us to customize your menu and confirm arrangements',
      icon: '✅',
    },
    {
      number: 4,
      title: 'Enjoy Your Event',
      description: 'We handle everything - setup, service, and cleanup',
      icon: '🎊',
    },
  ];

  // Toggle FAQ accordion
  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-50 to-red-50 py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Catering for Every Occasion
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
              Bring the authentic taste of our food truck to your next event. From corporate lunches to weddings, we make every occasion special.
            </p>
            <Link
              to="/catering/inquiry"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-lg hover:scale-105"
            >
              Request a Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading catering information...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-4">Failed to load catering information</p>
            <p className="text-red-600 text-sm mb-4">{error.message}</p>
            <p className="text-gray-600 text-sm">Please try refreshing the page or contact us directly.</p>
          </div>
        </div>
      )}

      {/* Main Content - Only show when data is loaded */}
      {!isLoading && !error && cateringInfo && (
        <>
          {/* Services Description */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Our Catering Services
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {cateringInfo.description || 'We bring our award-winning menu directly to your event. Our mobile catering service combines convenience with exceptional food quality, ensuring your guests enjoy a memorable dining experience. Whether it\'s an intimate gathering or a large celebration, we have the perfect solution for you.'}
                </p>
              </div>
            </div>
          </section>

          {/* Event Types */}
          <section className="py-16 md:py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Events We Serve
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  From corporate functions to private celebrations, we cater to all types of events
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventTypes.map((eventType, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <div className="text-5xl mb-4">{eventType.icon}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {eventType.name}
                    </h3>
                    <p className="text-gray-600">{eventType.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Catering Packages */}
          {cateringInfo.packages && cateringInfo.packages.length > 0 && (
            <section className="py-16 md:py-20 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Our Packages
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Choose from our curated packages or let us create a custom menu for your event
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {cateringInfo.packages.map((pkg, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {pkg.name}
                      </h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        {pkg.description}
                      </p>
                      <div className="border-t border-gray-200 pt-6 mb-6">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className="text-4xl font-bold text-orange-600">
                            €{Number(pkg.price_per_person || 0).toFixed(2)}
                          </span>
                          <span className="text-gray-600 ml-2">per person</span>
                        </div>
                        <p className="text-sm text-gray-500 text-center">
                          Minimum {pkg.min_guests} guests
                        </p>
                      </div>
                      <Link
                        to={`/catering/inquiry?package=${encodeURIComponent(pkg.name)}`}
                        className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-center px-6 py-3 rounded-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        Request Quote
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Our simple 4-step process makes catering your event effortless
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {howItWorksSteps.map((step) => (
                  <div key={step.number} className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="text-6xl mb-2">{step.icon}</div>
                      <div className="absolute -top-2 -right-2 bg-orange-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg shadow-lg">
                        {step.number}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-gray-600">
                  Have questions? We have answers.
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg"
                      aria-expanded={expandedFaqIndex === index}
                      aria-label={`Toggle FAQ: ${faq.question}`}
                    >
                      <span className="text-lg font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </span>
                      <svg
                        className={`w-6 h-6 text-orange-600 flex-shrink-0 transition-transform duration-200 ${
                          expandedFaqIndex === index ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {expandedFaqIndex === index && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA Section */}
          <section className="py-16 md:py-20 bg-gradient-to-br from-orange-600 to-red-600">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Make Your Event Special?
              </h2>
              <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                Get a custom quote today and let us handle all the details. Our team is ready to make your event unforgettable.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/catering/inquiry"
                  className="inline-block bg-white hover:bg-gray-100 text-orange-600 font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Request a Quote
                </Link>
                <Link
                  to="/contact"
                  className="inline-block bg-orange-700 hover:bg-orange-800 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Contact Us
                </Link>
              </div>
              <p className="mt-6 text-orange-100 text-sm">
                Questions? Call us at{' '}
                <a
                  href="tel:+353-1-234-5678"
                  className="underline hover:text-white transition-colors"
                >
                  +353-1-234-5678
                </a>{' '}
                or email{' '}
                <a
                  href="mailto:catering@salamalama.ie"
                  className="underline hover:text-white transition-colors"
                >
                  catering@salamalama.ie
                </a>
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
};

export default UV_CateringInfo;