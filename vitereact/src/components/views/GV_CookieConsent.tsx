import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GV_CookieConsent: React.FC = () => {
  // Local state variables for cookie consent management
  const [is_banner_visible, setIsBannerVisible] = useState(false);
  const [is_preferences_modal_open, setIsPreferencesModalOpen] = useState(false);
  const [consent_preferences, setConsentPreferences] = useState({
    essential: true, // Always true
    analytics: false,
    marketing: false,
  });

  // Check for existing consent on component mount
  useEffect(() => {
    const stored_consent = localStorage.getItem('cookie_consent');
    
    if (stored_consent) {
      // User has already given consent, don't show banner
      try {
        const parsed_consent = JSON.parse(stored_consent);
        setConsentPreferences(parsed_consent);
        setIsBannerVisible(false);
      } catch (error) {
        console.error('Error parsing stored consent:', error);
        // Show banner if stored data is corrupted
        setIsBannerVisible(true);
      }
    } else {
      // First visit or consent not given yet, show banner
      setIsBannerVisible(true);
    }
  }, []);

  /**
   * Accept all cookie types and hide banner
   * Stores full consent in localStorage and enables all tracking
   */
  const acceptAllCookies = () => {
    const all_consent = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    
    localStorage.setItem('cookie_consent', JSON.stringify(all_consent));
    setConsentPreferences(all_consent);
    setIsBannerVisible(false);
  };

  /**
   * Accept only essential cookies and hide banner
   * Stores minimal consent in localStorage
   */
  const rejectNonEssential = () => {
    const minimal_consent = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    
    localStorage.setItem('cookie_consent', JSON.stringify(minimal_consent));
    setConsentPreferences(minimal_consent);
    setIsBannerVisible(false);
  };

  /**
   * Open preferences modal for granular cookie control
   */
  const openCustomizeModal = () => {
    setIsPreferencesModalOpen(true);
  };

  /**
   * Save custom cookie preferences from modal
   * Stores preferences in localStorage, closes modal and banner
   */
  const saveCustomPreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(consent_preferences));
    setIsPreferencesModalOpen(false);
    setIsBannerVisible(false);
  };

  /**
   * Toggle analytics cookie preference in modal
   */
  const toggleAnalytics = () => {
    setConsentPreferences(prev => ({
      ...prev,
      analytics: !prev.analytics,
    }));
  };

  /**
   * Toggle marketing cookie preference in modal
   */
  const toggleMarketing = () => {
    setConsentPreferences(prev => ({
      ...prev,
      marketing: !prev.marketing,
    }));
  };

  // Don't render anything if banner is not visible
  if (!is_banner_visible) {
    return null;
  }

  return (
    <>
      {/* ===========================
          COOKIE CONSENT BANNER
          =========================== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl shadow-gray-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Text Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">
                  We Value Your Privacy
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
                Essential cookies are always enabled to ensure the website functions properly. You can choose to accept all cookies or customize your preferences.
                {' '}
                <Link 
                  to="/privacy" 
                  className="text-orange-600 hover:text-orange-700 font-medium underline focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                >
                  Learn more in our Privacy Policy
                </Link>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto lg:flex-shrink-0">
              <button
                onClick={rejectNonEssential}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg border border-gray-300 transition-all duration-200 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
                aria-label="Reject non-essential cookies"
              >
                Reject Non-Essential
              </button>
              
              <button
                onClick={openCustomizeModal}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-lg border-2 border-gray-300 transition-all duration-200 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
                aria-label="Customize cookie preferences"
              >
                Customize
              </button>
              
              <button
                onClick={acceptAllCookies}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm focus:outline-none focus:ring-4 focus:ring-orange-100"
                aria-label="Accept all cookies"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================
          PREFERENCES MODAL
          =========================== */}
      {is_preferences_modal_open && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-200"
            onClick={() => setIsPreferencesModalOpen(false)}
            aria-hidden="true"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div 
                className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                {/* Modal Header - Sticky */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                  <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
                    Cookie Preferences
                  </h2>
                  <button
                    onClick={() => setIsPreferencesModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-lg p-1"
                    aria-label="Close preferences modal"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {/* Essential Cookies - Always Enabled */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Essential Cookies
                        </h3>
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Always Enabled
                        </span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <div className="w-12 h-6 bg-green-600 rounded-full relative" aria-label="Essential cookies enabled">
                          <div className="absolute right-0 top-0 bottom-0 w-6 bg-white rounded-full shadow-md" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      These cookies are necessary for the website to function properly. 
                      They enable core functionality such as security, authentication, and session management. 
                      The website cannot function properly without these cookies.
                    </p>
                  </div>

                  {/* Analytics Cookies - Optional */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Analytics Cookies
                        </h3>
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          Optional
                        </span>
                      </div>
                      <button
                        onClick={toggleAnalytics}
                        className="ml-4 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full"
                        aria-label={`${consent_preferences.analytics ? 'Disable' : 'Enable'} analytics cookies`}
                        aria-pressed={consent_preferences.analytics}
                      >
                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                          consent_preferences.analytics ? 'bg-orange-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-0 bottom-0 w-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            consent_preferences.analytics ? 'right-0' : 'left-0'
                          }`} />
                        </div>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. 
                      This helps us improve our services and provide a better user experience. We use this data to analyze traffic patterns, 
                      identify popular content, and optimize the website's performance.
                    </p>
                  </div>

                  {/* Marketing Cookies - Optional */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Marketing Cookies
                        </h3>
                        <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                          Optional
                        </span>
                      </div>
                      <button
                        onClick={toggleMarketing}
                        className="ml-4 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full"
                        aria-label={`${consent_preferences.marketing ? 'Disable' : 'Enable'} marketing cookies`}
                        aria-pressed={consent_preferences.marketing}
                      >
                        <div className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                          consent_preferences.marketing ? 'bg-orange-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-0 bottom-0 w-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                            consent_preferences.marketing ? 'right-0' : 'left-0'
                          }`} />
                        </div>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      These cookies are used to deliver relevant advertisements and track campaign effectiveness. 
                      They may be set by our advertising partners to build a profile of your interests and show you relevant ads on other sites. 
                      These cookies help us understand which marketing campaigns are most effective.
                    </p>
                  </div>

                  {/* Privacy Policy Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-blue-900 leading-relaxed">
                        For more detailed information about how we use cookies and process your data, please read our{' '}
                        <Link 
                          to="/privacy"
                          className="font-medium text-blue-700 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                        >
                          Privacy Policy
                        </Link>
                        {' '}and{' '}
                        <Link 
                          to="/terms"
                          className="font-medium text-blue-700 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                        >
                          Terms & Conditions
                        </Link>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Current Selection Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Your Current Preferences:
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Essential Cookies</span>
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Enabled
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Analytics Cookies</span>
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          consent_preferences.analytics ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          {consent_preferences.analytics ? (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Enabled
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Disabled
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">Marketing Cookies</span>
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          consent_preferences.marketing ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          {consent_preferences.marketing ? (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Enabled
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Disabled
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer - Sticky */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={() => setIsPreferencesModalOpen(false)}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCustomPreferences}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-100"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default GV_CookieConsent;