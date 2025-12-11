import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Social media icon components
const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
  </svg>
);

// Interface for newsletter subscription
interface NewsletterSubscribePayload {
  email: string;
}

interface NewsletterSubscribeResponse {
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const GV_Footer: React.FC = () => {
  // CRITICAL: Individual Zustand selectors - NO object destructuring
  const businessInfo = useAppStore(state => state.business_settings.business_info);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // Local state for newsletter form
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Newsletter subscription mutation
  const subscribeMutation = useMutation<NewsletterSubscribeResponse, any, NewsletterSubscribePayload>({
    mutationFn: async (payload: NewsletterSubscribePayload) => {
      const response = await axios.post(`${API_BASE_URL}/api/newsletter/subscribe`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStatusMessage(data.message || 'Successfully subscribed!');
      setIsSuccess(true);
      setIsError(false);
      setNewsletterEmail('');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Subscription failed. Please try again.';
      setStatusMessage(errorMessage);
      setIsSuccess(false);
      setIsError(true);
    },
  });

  // Handle newsletter form submission
  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous messages
    setStatusMessage('');
    setIsSuccess(false);
    setIsError(false);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail)) {
      setStatusMessage('Please enter a valid email address.');
      setIsError(true);
      return;
    }

    // Trigger mutation
    subscribeMutation.mutate({ email: newsletterEmail });
  };

  // Auto-clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
        setIsSuccess(false);
        setIsError(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Social media links (with fallback if not configured)
  const socialLinks = {
    instagram: 'https://www.instagram.com/salamalama',
    facebook: 'https://www.facebook.com/SalamaLamaFoodTruck',
    twitter: 'https://twitter.com/SalamaLamaIE',
    tiktok: 'https://www.tiktok.com/@salamalama',
  };

  return (
    <>
      <footer className="bg-gray-900 border-t border-gray-800" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Business Information Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                {businessInfo.name || 'Salama Lama Food Truck'}
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                {businessInfo.phone && (
                  <li>
                    <a
                      href={`tel:${businessInfo.phone}`}
                      className="hover:text-white transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {businessInfo.phone}
                    </a>
                  </li>
                )}
                {businessInfo.email && (
                  <li>
                    <a
                      href={`mailto:${businessInfo.email}`}
                      className="hover:text-white transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {businessInfo.email}
                    </a>
                  </li>
                )}
                {businessInfo.address && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{businessInfo.address}</span>
                  </li>
                )}
              </ul>
              
              {/* Social Media Links */}
              <div className="flex space-x-4 pt-2">
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white hover:opacity-75 transition-all duration-200"
                  aria-label="Visit our Instagram"
                >
                  <InstagramIcon className="w-6 h-6" />
                </a>
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white hover:opacity-75 transition-all duration-200"
                  aria-label="Visit our Facebook"
                >
                  <FacebookIcon className="w-6 h-6" />
                </a>
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white hover:opacity-75 transition-all duration-200"
                  aria-label="Visit our Twitter"
                >
                  <TwitterIcon className="w-6 h-6" />
                </a>
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white hover:opacity-75 transition-all duration-200"
                  aria-label="Visit our TikTok"
                >
                  <TikTokIcon className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                Quick Links
              </h3>
              <nav aria-label="Quick links navigation">
                <ul className="space-y-3 text-sm text-gray-300">
                  <li>
                    <Link
                      to="/menu"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Menu
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/catering"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Catering
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/about"
                      className="hover:text-white transition-colors duration-200"
                    >
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/faqs"
                      className="hover:text-white transition-colors duration-200"
                    >
                      FAQs
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Legal & Account Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                Legal & Account
              </h3>
              <nav aria-label="Legal and account navigation">
                <ul className="space-y-3 text-sm text-gray-300">
                  <li>
                    <Link
                      to="/terms"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Terms & Conditions
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="hover:text-white transition-colors duration-200"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  {isAuthenticated && (
                    <li className="pt-2 border-t border-gray-700">
                      <Link
                        to="/dashboard"
                        className="hover:text-white transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Account
                      </Link>
                    </li>
                  )}
                </ul>
              </nav>
            </div>

            {/* Newsletter Signup Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-300">
                Get exclusive offers, new menu items, and location updates.
              </p>
              
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div>
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={subscribeMutation.isPending}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={subscribeMutation.isPending || !newsletterEmail}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {subscribeMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>

                {/* Status Messages */}
                {statusMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`text-sm p-3 rounded-lg ${
                      isSuccess
                        ? 'bg-green-900/50 text-green-200 border border-green-700'
                        : isError
                        ? 'bg-red-900/50 text-red-200 border border-red-700'
                        : ''
                    }`}
                  >
                    <div className="flex items-start">
                      {isSuccess && (
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {isError && (
                        <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span>{statusMessage}</span>
                    </div>
                  </div>
                )}
              </form>

              <p className="text-xs text-gray-400">
                We respect your privacy. See our{' '}
                <Link
                  to="/privacy"
                  className="text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Copyright Notice */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-400 text-center">
              © {new Date().getFullYear()} {businessInfo.name || 'Salama Lama Food Truck'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;