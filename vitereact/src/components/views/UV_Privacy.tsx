import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, Download, Shield, Phone, Mail, ExternalLink, Printer, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';

// ===========================
// Types & Interfaces
// ===========================

interface PrivacySubsection {
  heading: string;
  content: string;
}

interface PrivacySection {
  id: string;
  heading: string;
  content: string;
  subsections?: PrivacySubsection[];
}

interface PrivacyPolicyContent {
  title: string;
  last_updated: string;
  sections: PrivacySection[];
  contact_info: {
    dpo_email: string;
    support_email: string;
    phone: string;
  };
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

// ===========================
// API Functions
// ===========================

const fetchPrivacyPolicy = async (): Promise<PrivacyPolicyContent> => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/content/privacy`
    );
    return response.data;
  } catch (error) {
    // Fallback to hardcoded GDPR-compliant privacy policy
    return {
      title: "Privacy Policy",
      last_updated: new Date().toISOString(),
      sections: [
        {
          id: "introduction",
          heading: "1. Introduction",
          content: "Salama Lama Food Truck ('we', 'us', or 'our') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.",
          subsections: []
        },
        {
          id: "data-controller",
          heading: "2. Data Controller",
          content: "Salama Lama Food Truck is the data controller responsible for your personal data. We are committed to ensuring that your privacy is protected in accordance with the General Data Protection Regulation (GDPR) and applicable Irish data protection laws.",
          subsections: []
        },
        {
          id: "information-collected",
          heading: "3. Information We Collect",
          content: "We collect various types of information in connection with the services we provide, including:",
          subsections: [
            {
              heading: "Personal Identification Information",
              content: "Name, email address, phone number, delivery address, and payment information when you create an account or place an order."
            },
            {
              heading: "Order Information",
              content: "Details of your food orders, including items purchased, customizations, delivery preferences, and order history."
            },
            {
              heading: "Technical Information",
              content: "IP address, browser type, device information, operating system, and usage data collected through cookies and similar technologies."
            },
            {
              heading: "Location Data",
              content: "Delivery addresses and location information necessary to provide our services."
            },
            {
              heading: "Loyalty Program Data",
              content: "Points balance, rewards redemption history, badges earned, and referral activity."
            },
            {
              heading: "Communication Data",
              content: "Correspondence with customer support, catering inquiries, and marketing preferences."
            }
          ]
        },
        {
          id: "how-we-use",
          heading: "4. How We Use Your Information",
          content: "We use the information we collect for the following purposes:",
          subsections: [
            {
              heading: "Service Delivery",
              content: "To process and fulfill your orders, manage deliveries, and provide customer support."
            },
            {
              heading: "Account Management",
              content: "To create and maintain your account, authenticate your identity, and manage your preferences."
            },
            {
              heading: "Payment Processing",
              content: "To process payments securely through our payment provider (SumUp) and prevent fraud."
            },
            {
              heading: "Loyalty Program",
              content: "To manage your loyalty points, rewards, badges, and referral program participation."
            },
            {
              heading: "Communications",
              content: "To send order confirmations, status updates, promotional offers (with your consent), and respond to inquiries."
            },
            {
              heading: "Service Improvement",
              content: "To analyze usage patterns, improve our menu offerings, and enhance user experience."
            },
            {
              heading: "Legal Compliance",
              content: "To comply with legal obligations, resolve disputes, and enforce our terms of service."
            }
          ]
        },
        {
          id: "legal-basis",
          heading: "5. Legal Basis for Processing",
          content: "Under GDPR, we process your personal data based on the following legal grounds:",
          subsections: [
            {
              heading: "Contract Performance",
              content: "Processing necessary to fulfill our contract with you (order processing and delivery)."
            },
            {
              heading: "Consent",
              content: "Marketing communications and optional features (you can withdraw consent at any time)."
            },
            {
              heading: "Legitimate Interests",
              content: "Fraud prevention, service improvement, and business analytics."
            },
            {
              heading: "Legal Obligations",
              content: "Compliance with tax, accounting, and other legal requirements."
            }
          ]
        },
        {
          id: "data-sharing",
          heading: "6. How We Share Your Information",
          content: "We do not sell your personal information. We may share your information with:",
          subsections: [
            {
              heading: "Service Providers",
              content: "Payment processors (SumUp), email service providers, cloud hosting, and analytics platforms that help us operate our business."
            },
            {
              heading: "Delivery Partners",
              content: "Delivery address and contact information necessary to fulfill delivery orders."
            },
            {
              heading: "Legal Authorities",
              content: "When required by law or to protect our rights, property, or safety."
            },
            {
              heading: "Business Transfers",
              content: "In the event of a merger, acquisition, or sale of assets, your information may be transferred."
            }
          ]
        },
        {
          id: "data-retention",
          heading: "7. Data Retention",
          content: "We retain your personal data only as long as necessary for the purposes outlined in this policy:",
          subsections: [
            {
              heading: "Active Accounts",
              content: "Account and order data retained while your account is active."
            },
            {
              heading: "Anonymized Data",
              content: "After account deletion, order history is anonymized but retained for legal and accounting purposes (7 years)."
            },
            {
              heading: "Marketing Data",
              content: "Removed immediately upon unsubscribe or consent withdrawal."
            },
            {
              heading: "Technical Logs",
              content: "Retained for 90 days for security and troubleshooting purposes."
            }
          ]
        },
        {
          id: "your-rights",
          heading: "8. Your Data Protection Rights (GDPR)",
          content: "Under GDPR, you have the following rights:",
          subsections: [
            {
              heading: "Right to Access",
              content: "Request a copy of all personal data we hold about you."
            },
            {
              heading: "Right to Rectification",
              content: "Request correction of inaccurate or incomplete data."
            },
            {
              heading: "Right to Erasure",
              content: "Request deletion of your personal data ('right to be forgotten')."
            },
            {
              heading: "Right to Restriction",
              content: "Request limitation of processing in certain circumstances."
            },
            {
              heading: "Right to Data Portability",
              content: "Receive your data in a structured, commonly used format."
            },
            {
              heading: "Right to Object",
              content: "Object to processing based on legitimate interests or direct marketing."
            },
            {
              heading: "Right to Withdraw Consent",
              content: "Withdraw consent at any time for consent-based processing."
            },
            {
              heading: "Right to Lodge a Complaint",
              content: "File a complaint with the Data Protection Commission (Ireland) if you believe your rights have been violated."
            }
          ]
        },
        {
          id: "cookies",
          heading: "9. Cookies and Tracking Technologies",
          content: "We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can manage your cookie preferences through our Cookie Settings. For more information, please see our Cookie Policy.",
          subsections: [
            {
              heading: "Essential Cookies",
              content: "Required for website functionality (authentication, cart management)."
            },
            {
              heading: "Analytics Cookies",
              content: "Help us understand how visitors use our website (with your consent)."
            },
            {
              heading: "Marketing Cookies",
              content: "Used for personalized advertising and retargeting (with your consent)."
            }
          ]
        },
        {
          id: "data-security",
          heading: "10. Data Security",
          content: "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These include:",
          subsections: [
            {
              heading: "Encryption",
              content: "All data transmissions are encrypted using SSL/TLS. Payment information is tokenized and never stored in plain text."
            },
            {
              heading: "Access Controls",
              content: "Limited employee access to personal data based on job requirements."
            },
            {
              heading: "Regular Audits",
              content: "Security assessments and penetration testing to identify vulnerabilities."
            },
            {
              heading: "Secure Infrastructure",
              content: "Data hosted on secure cloud platforms with regular backups."
            }
          ]
        },
        {
          id: "international-transfers",
          heading: "11. International Data Transfers",
          content: "Your data is primarily processed within the European Economic Area (EEA). If we transfer data outside the EEA, we ensure adequate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the European Commission."
        },
        {
          id: "childrens-privacy",
          heading: "12. Children's Privacy",
          content: "Our services are not intended for individuals under the age of 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected information from a child, please contact us immediately."
        },
        {
          id: "third-party-links",
          heading: "13. Third-Party Links",
          content: "Our website may contain links to third-party websites (social media, payment processors). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any information."
        },
        {
          id: "changes-policy",
          heading: "14. Changes to This Privacy Policy",
          content: "We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. The 'Last Updated' date at the top of this policy indicates when it was last revised. We will notify you of significant changes via email or prominent notice on our website."
        },
        {
          id: "contact-us",
          heading: "15. Contact Us",
          content: "If you have any questions about this Privacy Policy, wish to exercise your data protection rights, or need to contact our Data Protection Officer, please reach out to us:",
          subsections: []
        }
      ],
      contact_info: {
        dpo_email: "privacy@salamalama.ie",
        support_email: "hello@salamalama.ie",
        phone: "+353-1-234-5678"
      }
    };
  }
};

const requestDataExport = async (token: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/gdpr/export-data`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// ===========================
// Main Component
// ===========================

const UV_Privacy: React.FC = () => {
  // Global State Access (individual selectors)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const businessInfo = useAppStore(state => state.business_settings.business_info);

  // Local State
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [cookieSettingsModalOpen, setCookieSettingsModalOpen] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch Privacy Policy Content
  const { data: privacyContent, isLoading, error } = useQuery({
    queryKey: ['privacyPolicy'],
    queryFn: fetchPrivacyPolicy,
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    retry: 1
  });

  // Data Export Mutation
  const dataExportMutation = useMutation({
    mutationFn: () => {
      if (!authToken) throw new Error('Not authenticated');
      return requestDataExport(authToken);
    },
    onSuccess: (data) => {
      setExportSuccessMessage('Data export request submitted successfully! You will receive an email with your data within 48 hours.');
      setExportErrorMessage(null);
      
      // Auto-clear success message after 10 seconds
      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 10000);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to request data export. Please try again or contact support.';
      setExportErrorMessage(errorMsg);
      setExportSuccessMessage(null);
    }
  });

  // Generate Table of Contents
  useEffect(() => {
    if (privacyContent) {
      const toc: TOCItem[] = privacyContent.sections.map(section => ({
        id: section.id,
        title: section.heading,
        level: 1
      }));
      setTableOfContents(toc);
    }
  }, [privacyContent]);

  // Set up Intersection Observer for scroll tracking
  useEffect(() => {
    if (!privacyContent) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0.5]
      }
    );

    // Observe all sections
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) {
        observerRef.current?.observe(ref);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [privacyContent]);

  // Scroll to Section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  // Print Policy
  const handlePrint = () => {
    window.print();
  };

  // Request Data Export
  const handleDataExport = () => {
    if (!currentUser) {
      navigate('/login?redirect_url=/privacy');
      return;
    }
    
    setExportErrorMessage(null);
    setExportSuccessMessage(null);
    dataExportMutation.mutate();
  };

  // Request Account Deletion
  const handleAccountDeletion = () => {
    if (!currentUser) {
      navigate('/login?redirect_url=/privacy');
      return;
    }
    
    navigate('/profile#delete-account');
  };

  // Open Cookie Settings
  const handleOpenCookieSettings = () => {
    setCookieSettingsModalOpen(true);
  };

  // Loading State
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading Privacy Policy...</p>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error || !privacyContent) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Privacy Policy</h2>
            <p className="text-gray-600 mb-6">We're having trouble loading our privacy policy. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Shield className="h-12 w-12" />
                <div>
                  <h1 className="text-4xl font-bold mb-2">{privacyContent.title}</h1>
                  <p className="text-blue-100">
                    Last Updated: {new Date(privacyContent.last_updated).toLocaleDateString('en-IE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="hidden md:flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors print:hidden"
              >
                <Printer className="h-5 w-5" />
                <span>Print</span>
              </button>
            </div>
            
            <p className="text-lg text-blue-100 max-w-3xl">
              Your privacy is important to us. This policy explains how we collect, use, and protect your personal information in compliance with GDPR and Irish data protection laws.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table of Contents - Sticky Sidebar */}
            <aside className="lg:w-1/4 print:hidden">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Table of Contents
                </h2>
                <nav className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between group ${
                        activeSection === item.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                      {activeSection === item.id && (
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </nav>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <button
                    onClick={handleOpenCookieSettings}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Cookie Settings</span>
                  </button>
                  
                  {currentUser && (
                    <>
                      <button
                        onClick={handleDataExport}
                        disabled={dataExportMutation.isPending}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="h-4 w-4" />
                        <span>{dataExportMutation.isPending ? 'Requesting...' : 'Request My Data'}</span>
                      </button>
                      
                      <button
                        onClick={handleAccountDeletion}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Delete My Account</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </aside>

            {/* Privacy Policy Content */}
            <main className="lg:w-3/4">
              {/* Success/Error Messages */}
              {exportSuccessMessage && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-green-800">{exportSuccessMessage}</p>
                  </div>
                </div>
              )}

              {exportErrorMessage && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-red-800">{exportErrorMessage}</p>
                  </div>
                </div>
              )}

              {/* Policy Sections */}
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                {privacyContent.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                    className="p-8 scroll-mt-24"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {section.heading}
                    </h2>
                    
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                        {section.content}
                      </p>

                      {section.subsections && section.subsections.length > 0 && (
                        <div className="space-y-4 mt-6">
                          {section.subsections.map((subsection, idx) => (
                            <div key={idx} className="pl-4 border-l-2 border-blue-200">
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {subsection.heading}
                              </h3>
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {subsection.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contact Information Section */}
                      {section.id === 'contact-us' && (
                        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Data Protection Officer</p>
                                <a
                                  href={`mailto:${privacyContent.contact_info.dpo_email}`}
                                  className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {privacyContent.contact_info.dpo_email}
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Mail className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Customer Support</p>
                                <a
                                  href={`mailto:${privacyContent.contact_info.support_email}`}
                                  className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {privacyContent.contact_info.support_email}
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Phone className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">Phone</p>
                                <a
                                  href={`tel:${privacyContent.contact_info.phone}`}
                                  className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {privacyContent.contact_info.phone}
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>

              {/* GDPR Rights Summary */}
              {currentUser && (
                <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Shield className="h-6 w-6 mr-2 text-blue-600" />
                    Your GDPR Rights
                  </h3>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    As a registered user, you can exercise your data protection rights directly through your account settings or by contacting us:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleDataExport}
                      disabled={dataExportMutation.isPending}
                      className="flex items-center justify-center space-x-2 bg-white border-2 border-blue-200 text-blue-700 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-5 w-5" />
                      <span>{dataExportMutation.isPending ? 'Processing...' : 'Request My Data'}</span>
                    </button>
                    
                    <Link
                      to="/profile"
                      className="flex items-center justify-center space-x-2 bg-white border-2 border-blue-200 text-blue-700 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      <Shield className="h-5 w-5" />
                      <span>Manage Privacy Settings</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Related Links */}
              <div className="mt-8 flex flex-wrap gap-4 justify-center print:hidden">
                <Link
                  to="/terms"
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Terms & Conditions</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
                
                <button
                  onClick={handleOpenCookieSettings}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Cookie Policy</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
                
                <Link
                  to="/contact"
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 transition-colors"
                >
                  <span>Contact Us</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {cookieSettingsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Cookie Settings</h3>
                <button
                  onClick={() => setCookieSettingsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                  You can manage your preferences below.
                </p>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Essential Cookies</h4>
                        <p className="text-sm text-gray-600">
                          Required for website functionality (authentication, cart, security). Cannot be disabled.
                        </p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Always Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Analytics Cookies</h4>
                        <p className="text-sm text-gray-600">
                          Help us understand how visitors interact with our website.
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">Marketing Cookies</h4>
                        <p className="text-sm text-gray-600">
                          Used to deliver personalized advertisements and measure campaign effectiveness.
                        </p>
                      </div>
                      <div className="ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setCookieSettingsModalOpen(false)}
                    className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCookieSettingsModalOpen(false);
                      // Would save preferences here
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Privacy;