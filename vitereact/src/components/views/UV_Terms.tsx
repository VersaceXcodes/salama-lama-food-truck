import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { FileText, Printer, ChevronRight, ArrowUp, Menu, X } from 'lucide-react';

// Types for terms content structure
interface TermsSubsection {
  heading: string;
  content: string;
}

interface TermsSection {
  id: string;
  heading: string;
  content: string;
  subsections?: TermsSubsection[];
}

interface TermsContent {
  title: string;
  last_updated: string;
  sections: TermsSection[];
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
}

const UV_Terms: React.FC = () => {
  // State management - individual selectors as per critical rules
  const [termsContent, setTermsContent] = useState<TermsContent | null>(null);
  const [loadingState, setLoadingState] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<TOCItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Global state access - individual selectors
  const businessSettings = useAppStore(state => state.business_settings);

  // Refs for scroll tracking
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Static terms content (production would fetch from API)
  const staticTermsContent: TermsContent = {
    title: 'Terms and Conditions',
    last_updated: '2024-01-15',
    sections: [
      {
        id: 'general-terms',
        heading: '1. General Terms',
        content: 'These Terms and Conditions ("Terms") govern your use of the Salama Lama Food Truck online ordering platform and services. By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.',
        subsections: [
          {
            heading: '1.1 Agreement to Terms',
            content: 'By creating an account or placing an order through our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.'
          },
          {
            heading: '1.2 Eligibility',
            content: 'You must be at least 18 years old to use our services. By using our services, you represent and warrant that you meet this age requirement.'
          },
          {
            heading: '1.3 Changes to Terms',
            content: 'We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated Terms.'
          }
        ]
      },
      {
        id: 'account-registration',
        heading: '2. Account Registration and Security',
        content: 'To use certain features of our service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials.',
        subsections: [
          {
            heading: '2.1 Account Creation',
            content: 'You must provide accurate, current, and complete information during registration. You agree to update your information promptly if it changes.'
          },
          {
            heading: '2.2 Account Security',
            content: 'You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.'
          },
          {
            heading: '2.3 Account Termination',
            content: 'We reserve the right to suspend or terminate your account if you violate these Terms or engage in fraudulent or abusive behavior. You may also request account deletion at any time through your account settings.'
          }
        ]
      },
      {
        id: 'menu-pricing',
        heading: '3. Menu Items and Pricing',
        content: 'Our menu items and prices are subject to change without notice. We make every effort to ensure accuracy in our menu descriptions and pricing.',
        subsections: [
          {
            heading: '3.1 Menu Accuracy',
            content: 'While we strive to provide accurate descriptions and images of our menu items, actual items may vary slightly. We reserve the right to modify menu items, ingredients, or recipes at any time.'
          },
          {
            heading: '3.2 Pricing',
            content: 'All prices are displayed in Euros (€) and include applicable VAT. Prices are subject to change without notice. The price applicable to your order will be the price displayed at the time you complete your order.'
          },
          {
            heading: '3.3 Availability',
            content: 'Menu items are subject to availability. We reserve the right to limit quantities or discontinue items. If an ordered item becomes unavailable, we will notify you and offer a substitute or refund.'
          },
          {
            heading: '3.4 Dietary Information',
            content: 'While we provide dietary information and accommodate dietary restrictions where possible, we cannot guarantee that our food is free from allergens. Please inform us of any allergies when ordering.'
          }
        ]
      },
      {
        id: 'ordering-process',
        heading: '4. Ordering Process',
        content: 'Orders can be placed through our online platform for collection or delivery (where available). All orders are subject to acceptance by Salama Lama.',
        subsections: [
          {
            heading: '4.1 Order Placement',
            content: 'To place an order, you must add items to your cart, select a collection time or delivery address, and complete payment. Your order is not confirmed until you receive an order confirmation.'
          },
          {
            heading: '4.2 Order Confirmation',
            content: 'Upon successful order placement, you will receive an order confirmation via email and/or SMS containing your order details and unique order number.'
          },
          {
            heading: '4.3 Order Modifications',
            content: 'Order modifications are subject to availability and must be requested within a reasonable timeframe. Contact us immediately if you need to modify your order.'
          },
          {
            heading: '4.4 Minimum Order Values',
            content: 'Delivery orders may be subject to minimum order value requirements based on delivery zone. These requirements will be clearly displayed during checkout.'
          }
        ]
      },
      {
        id: 'payment-terms',
        heading: '5. Payment Terms',
        content: 'We accept various payment methods through our secure payment processor. All payments must be completed before order fulfillment.',
        subsections: [
          {
            heading: '5.1 Payment Methods',
            content: 'We accept major credit and debit cards (Visa, Mastercard, American Express) through our payment processor SumUp. For collection orders, we may also accept cash payment on collection where indicated.'
          },
          {
            heading: '5.2 Payment Processing',
            content: 'Your payment will be processed immediately upon order confirmation. We do not store your full card details; they are securely processed and stored by our payment processor.'
          },
          {
            heading: '5.3 Failed Payments',
            content: 'If payment fails, your order will not be processed. You will be notified and given the opportunity to retry payment or use an alternative payment method.'
          },
          {
            heading: '5.4 Pricing Errors',
            content: 'In the event of a pricing error, we reserve the right to cancel the order and offer a refund or the correct price. We will notify you before taking any action.'
          }
        ]
      },
      {
        id: 'collection-delivery',
        heading: '6. Collection and Delivery Services',
        content: 'We offer both collection and delivery services (delivery subject to location and availability). Service-specific terms apply.',
        subsections: [
          {
            heading: '6.1 Collection Service',
            content: 'For collection orders, you must collect your order at the specified time slot from the food truck location provided in your order confirmation. Please bring your order number for identification.'
          },
          {
            heading: '6.2 Delivery Service',
            content: 'Delivery is available to selected areas as indicated during checkout. Delivery fees and minimum order values vary by zone. Estimated delivery times are approximate and subject to traffic and weather conditions.'
          },
          {
            heading: '6.3 Delivery Address',
            content: 'You are responsible for providing an accurate and complete delivery address. We are not responsible for delays or failed deliveries due to incorrect address information.'
          },
          {
            heading: '6.4 Delivery Delays',
            content: 'While we aim to deliver within the estimated timeframe, delivery times are approximate and not guaranteed. We are not liable for delays caused by circumstances beyond our control.'
          },
          {
            heading: '6.5 Failed Delivery',
            content: 'If delivery cannot be completed due to incorrect address, unavailability of recipient, or access issues, the order may be deemed completed and no refund will be provided.'
          }
        ]
      },
      {
        id: 'cancellation-refunds',
        heading: '7. Cancellation and Refunds',
        content: 'Cancellation and refund rights vary depending on the stage of order processing and the nature of the service.',
        subsections: [
          {
            heading: '7.1 Customer Cancellation',
            content: 'You may cancel your order within a limited time after placement, provided the order has not yet been prepared. Cancellation requests must be made through your account or by contacting us immediately.'
          },
          {
            heading: '7.2 Refund Policy',
            content: 'Refunds will be issued to the original payment method. Processing time for refunds typically takes 5-10 business days. Partial refunds may be issued for partial order fulfillment or resolved issues.'
          },
          {
            heading: '7.3 Business Cancellation',
            content: 'We reserve the right to cancel orders if items are unavailable, payment fails, or we identify fraudulent activity. You will be notified immediately and receive a full refund.'
          },
          {
            heading: '7.4 Complaints and Issues',
            content: 'If you have issues with your order quality or service, please contact us within 24 hours with your order details, photos (if applicable), and description of the issue. We will review and respond promptly.'
          }
        ]
      },
      {
        id: 'catering-services',
        heading: '8. Catering Services',
        content: 'Our catering services are subject to separate terms in addition to these general terms. Catering requires advance booking and agreement to a customized quote.',
        subsections: [
          {
            heading: '8.1 Catering Inquiries',
            content: 'Catering services must be requested through our catering inquiry form with at least 7 days advance notice. All inquiries are subject to availability and approval.'
          },
          {
            heading: '8.2 Catering Quotes',
            content: 'We will provide a detailed quote including menu items, pricing, service details, and terms. The quote is valid for 7 days unless otherwise specified.'
          },
          {
            heading: '8.3 Catering Confirmation',
            content: 'Catering bookings are confirmed upon acceptance of the quote and receipt of the required deposit (if applicable). Final details must be confirmed at least 48 hours before the event.'
          },
          {
            heading: '8.4 Catering Cancellation',
            content: 'Catering cancellations made more than 48 hours before the event may receive a partial refund. Cancellations within 48 hours are non-refundable unless due to circumstances beyond your control.'
          },
          {
            heading: '8.5 Event Day Responsibilities',
            content: 'You are responsible for providing accurate event details, suitable venue access, power/water connections if required, and any necessary permits. We are not liable for issues arising from incomplete or inaccurate information.'
          }
        ]
      },
      {
        id: 'loyalty-program',
        heading: '9. Loyalty and Rewards Program',
        content: 'Our loyalty program allows customers to earn points and rewards. Participation is optional and subject to program terms.',
        subsections: [
          {
            heading: '9.1 Program Participation',
            content: 'By creating an account, you are automatically enrolled in our loyalty program. Points are earned on qualifying purchases and can be redeemed for rewards as described in your account.'
          },
          {
            heading: '9.2 Earning Points',
            content: 'Points are awarded based on your order total after discounts and before delivery fees and tax. The earning rate is subject to change with notice. Points are credited after order completion.'
          },
          {
            heading: '9.3 Redeeming Rewards',
            content: 'Rewards can be redeemed through your account when you have sufficient points. Rewards are subject to availability and expiration dates. Redeemed rewards cannot be returned or exchanged for cash.'
          },
          {
            heading: '9.4 Points Expiration',
            content: 'Points may expire after a period of account inactivity as specified in the loyalty program terms. We will notify you before points expire.'
          },
          {
            heading: '9.5 Program Changes',
            content: 'We reserve the right to modify, suspend, or terminate the loyalty program at any time with reasonable notice. Changes to the program will be communicated via email and through our platform.'
          },
          {
            heading: '9.6 Referral Program',
            content: 'Our referral program allows you to earn rewards by referring friends. Referral rewards are subject to program terms and may require the referred customer to complete their first order.'
          }
        ]
      },
      {
        id: 'intellectual-property',
        heading: '10. Intellectual Property Rights',
        content: 'All content on our platform, including text, graphics, logos, images, and software, is the property of Salama Lama Food Truck and protected by intellectual property laws.',
        subsections: [
          {
            heading: '10.1 Ownership',
            content: 'The Salama Lama name, logo, and all associated trademarks are our exclusive property. You may not use our intellectual property without prior written permission.'
          },
          {
            heading: '10.2 Limited License',
            content: 'We grant you a limited, non-exclusive, non-transferable license to access and use our platform for personal, non-commercial purposes in accordance with these Terms.'
          },
          {
            heading: '10.3 User Content',
            content: 'By submitting content to our platform (reviews, feedback, etc.), you grant us a worldwide, royalty-free license to use, reproduce, and display such content in connection with our services.'
          }
        ]
      },
      {
        id: 'liability-limitations',
        heading: '11. Limitation of Liability and Disclaimers',
        content: 'Our liability is limited to the maximum extent permitted by law. Important limitations and disclaimers apply to our services.',
        subsections: [
          {
            heading: '11.1 Service "As Is"',
            content: 'Our services are provided "as is" without warranties of any kind, either express or implied. We do not guarantee uninterrupted or error-free service.'
          },
          {
            heading: '11.2 Food Safety',
            content: 'While we maintain strict food safety standards, we are not responsible for adverse reactions or illness resulting from consumption of our products unless caused by our negligence.'
          },
          {
            heading: '11.3 Limitation of Liability',
            content: 'Our total liability for any claims arising from these Terms or your use of our services shall not exceed the amount you paid for the specific order giving rise to the claim.'
          },
          {
            heading: '11.4 Exclusion of Damages',
            content: 'We are not liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill.'
          },
          {
            heading: '11.5 Force Majeure',
            content: 'We are not liable for failure to perform obligations due to causes beyond our reasonable control, including natural disasters, power outages, strikes, or government actions.'
          }
        ]
      },
      {
        id: 'privacy-data',
        heading: '12. Privacy and Data Protection',
        content: 'We are committed to protecting your privacy and personal data in compliance with GDPR and applicable data protection laws.',
        subsections: [
          {
            heading: '12.1 Privacy Policy',
            content: 'Our Privacy Policy, which is incorporated into these Terms, describes how we collect, use, and protect your personal information. Please review our Privacy Policy carefully.'
          },
          {
            heading: '12.2 Data Collection',
            content: 'We collect personal information necessary to process orders, provide services, and improve customer experience. This includes contact details, payment information, and order history.'
          },
          {
            heading: '12.3 Data Security',
            content: 'We implement appropriate security measures to protect your personal data. However, no method of transmission over the internet is 100% secure.'
          },
          {
            heading: '12.4 Your Rights',
            content: 'Under GDPR, you have rights to access, correct, delete, or restrict processing of your personal data. You can exercise these rights through your account settings or by contacting us.'
          },
          {
            heading: '12.5 Marketing Communications',
            content: 'You may opt in or out of marketing communications at any time through your account preferences or by following unsubscribe instructions in our emails.'
          }
        ]
      },
      {
        id: 'dispute-resolution',
        heading: '13. Dispute Resolution and Governing Law',
        content: 'These Terms are governed by Irish law. Disputes will be resolved through negotiation, mediation, or litigation in Ireland.',
        subsections: [
          {
            heading: '13.1 Governing Law',
            content: 'These Terms and any disputes arising from them shall be governed by and construed in accordance with the laws of Ireland.'
          },
          {
            heading: '13.2 Jurisdiction',
            content: 'Any legal proceedings arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ireland.'
          },
          {
            heading: '13.3 Informal Resolution',
            content: 'Before initiating formal legal proceedings, we encourage you to contact us to attempt informal resolution of any dispute.'
          },
          {
            heading: '13.4 Consumer Rights',
            content: 'Nothing in these Terms affects your statutory rights as a consumer under Irish or EU law.'
          }
        ]
      },
      {
        id: 'changes-to-terms',
        heading: '14. Changes to Terms and Service',
        content: 'We may update these Terms periodically to reflect changes in our practices, services, or legal requirements.',
        subsections: [
          {
            heading: '14.1 Notification of Changes',
            content: 'We will notify registered users of material changes to these Terms via email or prominent notice on our platform at least 7 days before the changes take effect.'
          },
          {
            heading: '14.2 Acceptance of Changes',
            content: 'Your continued use of our services after changes to these Terms constitutes acceptance of the revised Terms. If you do not agree to the changes, you should discontinue use of our services.'
          },
          {
            heading: '14.3 Service Changes',
            content: 'We reserve the right to modify, suspend, or discontinue any aspect of our services at any time without notice. We are not liable for any modification, suspension, or discontinuation of services.'
          }
        ]
      },
      {
        id: 'contact-information',
        heading: '15. Contact Information and Support',
        content: 'For questions, concerns, or support regarding these Terms or our services, please contact us through the following channels.',
        subsections: [
          {
            heading: '15.1 Customer Support',
            content: `You can reach our customer support team via phone at ${businessSettings.business_info.phone || '+353-1-XXX-XXXX'}, email at ${businessSettings.business_info.email || 'hello@salamalama.ie'}, or through the contact form on our website.`
          },
          {
            heading: '15.2 Business Address',
            content: `Salama Lama Food Truck, ${businessSettings.business_info.address || 'Dublin, Ireland'}. Our registered business address and VAT number are available upon request.`
          },
          {
            heading: '15.3 Response Times',
            content: 'We aim to respond to all inquiries within 24-48 hours during business days. For urgent order-related issues, please call our phone line during operating hours.'
          },
          {
            heading: '15.4 Feedback',
            content: 'We welcome your feedback and suggestions. Please share your thoughts through our contact channels or leave a review on our platform.'
          }
        ]
      }
    ]
  };

  // Initialize terms content and table of contents
  useEffect(() => {
    // Simulate API call loading
    const loadTerms = async () => {
      setLoadingState(true);
      
      // In production, this would be an API call:
      // const response = await axios.get(`${API_BASE_URL}/api/settings?key=terms_and_conditions`);
      // setTermsContent(response.data);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTermsContent(staticTermsContent);
      
      // Generate table of contents
      const toc: TOCItem[] = [];
      staticTermsContent.sections.forEach(section => {
        toc.push({
          id: section.id,
          title: section.heading,
          level: 1
        });
        
        if (section.subsections) {
          section.subsections.forEach((subsection, idx) => {
            toc.push({
              id: `${section.id}-${idx}`,
              title: subsection.heading,
              level: 2
            });
          });
        }
      });
      
      setTableOfContents(toc);
      setLoadingState(false);
    };
    
    loadTerms();
  }, []);

  // Set up Intersection Observer for scroll tracking
  useEffect(() => {
    if (!termsContent) return;

    const options = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, options);

    // Observe all section elements
    sectionRefs.current.forEach(element => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [termsContent]);

  // Track scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current.get(sectionId);
    if (element) {
      const offset = 80; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu
      setMobileMenuOpen(false);
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Print terms
  const printTerms = () => {
    window.print();
  };

  // Register section ref
  const registerSectionRef = (id: string, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(id, element);
    } else {
      sectionRefs.current.delete(id);
    }
  };

  return (
    <>
      {/* Main Container */}
      <div className="min-h-screen bg-gray-50">
        {/* Loading State */}
        {loadingState && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading Terms & Conditions...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loadingState && termsContent && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 print:shadow-none print:border-0">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-8 h-8 text-orange-600" />
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                      {termsContent.title}
                    </h1>
                  </div>
                  <p className="text-gray-600 mb-2">
                    {businessSettings.business_info.name || 'Salama Lama Food Truck'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Last Updated: {new Date(termsContent.last_updated).toLocaleDateString('en-IE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                  <button
                    onClick={printTerms}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
                    aria-label="Print Terms & Conditions"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <span>Back to Home</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex gap-8">
              {/* Table of Contents - Desktop Sidebar */}
              <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
                <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Table of Contents
                  </h2>
                  
                  <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150
                          ${item.level === 2 ? 'pl-6' : ''}
                          ${activeSection === item.id 
                            ? 'bg-orange-50 text-orange-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {activeSection === item.id && (
                            <ChevronRight className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Mobile TOC Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 print:hidden"
                aria-label="Toggle table of contents"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* Mobile TOC Overlay */}
              {mobileMenuOpen && (
                <>
                  <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 print:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  
                  <div className="lg:hidden fixed inset-y-0 right-0 w-80 max-w-full bg-white shadow-2xl z-50 overflow-y-auto print:hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900">
                          Table of Contents
                        </h2>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Close menu"
                        >
                          <X className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      
                      <nav className="space-y-1">
                        {tableOfContents.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150
                              ${item.level === 2 ? 'pl-6' : ''}
                              ${activeSection === item.id 
                                ? 'bg-orange-50 text-orange-700 font-medium' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }
                            `}
                          >
                            {item.title}
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </>
              )}

              {/* Terms Content */}
              <main className="flex-1 min-w-0">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 lg:p-12 print:shadow-none print:border-0">
                  {/* Important Notice */}
                  <div className="bg-orange-50 border-l-4 border-orange-600 p-4 mb-8 rounded-r-lg print:break-inside-avoid">
                    <p className="text-sm text-orange-900 leading-relaxed">
                      <strong>Please read these Terms and Conditions carefully.</strong> By accessing or using our services, 
                      you agree to be bound by these terms. If you do not agree to these terms, please do not use our services.
                    </p>
                  </div>

                  {/* Terms Sections */}
                  <article className="prose prose-gray max-w-none">
                    {termsContent.sections.map((section) => (
                      <section
                        key={section.id}
                        id={section.id}
                        ref={(el) => registerSectionRef(section.id, el)}
                        className="mb-12 scroll-mt-24 print:break-inside-avoid"
                      >
                        <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                          {section.heading}
                        </h2>
                        
                        <p className="text-gray-700 leading-relaxed mb-6">
                          {section.content}
                        </p>

                        {section.subsections && section.subsections.length > 0 && (
                          <div className="ml-0 sm:ml-4 space-y-6">
                            {section.subsections.map((subsection, subIdx) => (
                              <div
                                key={`${section.id}-${subIdx}`}
                                id={`${section.id}-${subIdx}`}
                                ref={(el) => registerSectionRef(`${section.id}-${subIdx}`, el)}
                                className="print:break-inside-avoid"
                              >
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                  {subsection.heading}
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                  {subsection.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </article>

                  {/* Contact and Agreement */}
                  <div className="mt-12 pt-8 border-t-2 border-gray-200 print:break-inside-avoid">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-3">
                        Questions About These Terms?
                      </h3>
                      <p className="text-blue-800 text-sm mb-4">
                        If you have any questions or concerns about these Terms and Conditions, please contact us:
                      </p>
                      <div className="space-y-2 text-sm text-blue-900">
                        <p>
                          <strong>Email:</strong>{' '}
                          <a 
                            href={`mailto:${businessSettings.business_info.email || 'hello@salamalama.ie'}`}
                            className="underline hover:text-blue-700"
                          >
                            {businessSettings.business_info.email || 'hello@salamalama.ie'}
                          </a>
                        </p>
                        <p>
                          <strong>Phone:</strong>{' '}
                          <a 
                            href={`tel:${businessSettings.business_info.phone || '+353-1-XXX-XXXX'}`}
                            className="underline hover:text-blue-700"
                          >
                            {businessSettings.business_info.phone || '+353-1-XXX-XXXX'}
                          </a>
                        </p>
                        <p>
                          <strong>Address:</strong> {businessSettings.business_info.address || 'Dublin, Ireland'}
                        </p>
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                      <p className="mb-2">
                        By using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                      </p>
                      <p className="font-medium text-gray-900">
                        © {new Date().getFullYear()} {businessSettings.business_info.name || 'Salama Lama Food Truck'}. All rights reserved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Links */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center print:hidden">
                  <Link
                    to="/privacy"
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Privacy Policy
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link
                    to="/contact"
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Contact Us
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link
                    to="/faqs"
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    FAQs
                  </Link>
                </div>
              </main>
            </div>
          </div>
        )}

        {/* Back to Top Button */}
        {showBackToTop && !loadingState && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 print:hidden"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .print\\:hidden {
              display: none !important;
            }
            
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            
            .print\\:border-0 {
              border: 0 !important;
            }
            
            .print\\:break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            h1, h2, h3 {
              break-after: avoid;
              page-break-after: avoid;
            }
            
            @page {
              margin: 2cm;
            }
          }
        `}
      </style>
    </>
  );
};

export default UV_Terms;