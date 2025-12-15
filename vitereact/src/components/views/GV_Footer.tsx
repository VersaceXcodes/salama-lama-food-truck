import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import BrandLogo from '@/components/BrandLogo';

// Social media icon components
const InstagramIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
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
    instagram: 'https://www.instagram.com/salamalama369/#',
    tiktok: 'https://www.tiktok.com/@salamalama369',
  };

  return (
    <>
      <footer className="bg-[#23120E] border-t border-[#2C1A16]" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Business Information Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2EFE9]">
                {businessInfo.name || 'Salama Lama Food Truck'}
              </h3>
              <ul className="space-y-3 text-sm text-[#F2EFE9]">
                {businessInfo.phone && (
                  <li>
                    <a
                      href={`tel:${businessInfo.phone}`}
                      className="hover:opacity-80 transition-opacity duration-200 flex items-center"
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
                      className="hover:opacity-80 transition-opacity duration-200 flex items-center"
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
                    <span>
                      {typeof businessInfo.address === 'string' 
                        ? businessInfo.address 
                        : `${businessInfo.address.line1}${businessInfo.address.line2 ? ', ' + businessInfo.address.line2 : ''}, ${businessInfo.address.city}, ${businessInfo.address.postal_code}`
                      }
                    </span>
                  </li>
                )}
              </ul>
              
              {/* Social Media Links */}
              <div className="flex space-x-4 pt-2">
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F2EFE9] hover:opacity-75 transition-opacity duration-200"
                  aria-label="Visit our Instagram"
                >
                  <InstagramIcon className="w-6 h-6" />
                </a>
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F2EFE9] hover:opacity-75 transition-opacity duration-200"
                  aria-label="Visit our TikTok"
                >
                  <TikTokIcon className="w-6 h-6" />
                </a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2EFE9]">
                Quick Links
              </h3>
              <nav aria-label="Quick links navigation">
                <ul className="space-y-3 text-sm text-[#F2EFE9]">
                  <li>
                    <Link
                      to="/menu"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      Menu
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/catering"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      Catering
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/about"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/contact"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/faqs"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      FAQs
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Legal & Account Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2EFE9]">
                Legal & Account
              </h3>
              <nav aria-label="Legal and account navigation">
                <ul className="space-y-3 text-sm text-[#F2EFE9]">
                  <li>
                    <Link
                      to="/terms"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      Terms & Conditions
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="hover:opacity-80 transition-opacity duration-200"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  {isAuthenticated && (
                    <li className="pt-2 border-t border-[#2C1A16]">
                      <Link
                        to="/dashboard"
                        className="hover:opacity-80 transition-opacity duration-200 flex items-center"
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#F2EFE9]">
                Stay Updated
              </h3>
              <p className="text-sm text-[#F2EFE9]">
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
                    className="w-full px-4 py-2 bg-[#2C1A16] border-2 border-[#F2EFE9] rounded-lg text-[#F2EFE9] placeholder-[#F2EFE9]/60 focus:outline-none focus:border-[#F2EFE9] focus:ring-2 focus:ring-[#F2EFE9]/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={subscribeMutation.isPending || !newsletterEmail}
                  className="w-full px-4 py-2 bg-[#F2EFE9] text-[#2C1A16] text-sm font-bold rounded-lg hover:bg-[#F2EFE9]/90 focus:outline-none focus:ring-2 focus:ring-[#F2EFE9] focus:ring-offset-2 focus:ring-offset-[#23120E] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {subscribeMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#2C1A16]" fill="none" viewBox="0 0 24 24">
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

              <p className="text-xs text-[#F2EFE9]/70">
                We respect your privacy. See our{' '}
                <Link
                  to="/privacy"
                  className="text-[#F2EFE9] hover:opacity-80 underline transition-opacity duration-200"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Copyright Notice & Logo Integration */}
          <div className="mt-12 pt-8 border-t border-[#2C1A16]">
            <div className="text-center">
              {/* Monochrome Logo - The Brand Anchor */}
              <div className="flex justify-center mb-4">
                <BrandLogo variant="footer" />
              </div>
              <p className="text-sm text-[#F2EFE9]/70">
                © {new Date().getFullYear()} {businessInfo.name || 'Salama Lama Food Truck'}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;