import React from 'react';
import { ArrowRight, CheckCircle, Smartphone, QrCode, BarChart3, Shield, Users, Zap, Star, Globe, Sparkles } from 'lucide-react';
import { CMSAPI } from '@/lib/cms';
import { QRCodeGenerator } from '@/components/ui/QRCodeGenerator';

export function LandingPage() {
  // Load content from CMS
  const [content, setContent] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load CMS content on mount
  React.useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const cmsContent = await CMSAPI.getContent();
      setContent(cmsContent);
    } catch (error) {
      console.error('Failed to load CMS content:', error);
      // Use default content as fallback
      setContent({
        hero: {
          title: 'Accept PayNow Payments Effortlessly',
          subtitle: 'PayNow',
          description: 'Complete Point-of-Sale system with Singapore PayNow integration.',
          primaryButtonText: 'Start Free Trial',
          primaryButtonLink: '/merchant',
          secondaryButtonText: 'View Demo',
          secondaryButtonLink: '/display',
          badgeText: "Singapore's #1 PayNow POS System"
        },
        features: { title: 'Features', subtitle: 'Built for Singapore', items: [] },
        testimonials: { title: 'Testimonials', subtitle: 'Trusted by businesses', items: [] },
        pricing: { title: 'Pricing', subtitle: 'Simple pricing', plans: [] },
        cta: { title: 'Ready?', subtitle: 'Get started today', primaryButtonText: 'Start', primaryButtonLink: '/merchant', secondaryButtonText: 'Admin', secondaryButtonLink: '/admin' },
        footer: { description: 'PayNow POS', copyright: '© 2025 PayNowGo', supportText: 'Singapore', navigationLinks: [], productLinks: [], supportLinks: [] },
        navigation: { menuItems: [] },
        testQR: { enabled: false, amount: 10, uen: '', reference: '', description: '' },
        meta: { title: 'PayNowGo', description: 'PayNow POS', keywords: [] }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Icon mapping
  const iconMap = {
    QrCode, Smartphone, BarChart3, Shield, Users, Zap, CheckCircle, Globe, Star, ArrowRight
  };
  
  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || QrCode;
  };

  // Update document title and meta
  React.useEffect(() => {
    if (!content) return;
    
    document.title = content.meta.title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', content.meta.description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = content.meta.description;
      document.head.appendChild(meta);
    }
    
    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', content.meta.keywords.join(', '));
    } else {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = content.meta.keywords.join(', ');
      document.head.appendChild(meta);
    }
  }, [content]);

  // Show loading state
  if (isLoading || !content) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading website content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center transform hover:scale-110 transition-transform duration-200 shadow-lg hover:shadow-xl">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PayNowGo</h1>
                <p className="text-xs text-gray-600">Singapore POS System</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {(content.navigation?.menuItems || []).map((item, index) => (
                <a key={index} href={item.href} className="text-gray-600 hover:text-gray-900 transition-all duration-200 hover:scale-105 relative group">
                  {item.text}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
              <a href="/merchant" className="text-emerald-600 hover:text-emerald-700 font-medium transition-all duration-200 hover:scale-105">
                Sign In
              </a>
              <a 
                href={content.hero.primaryButtonLink}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {content.hero.primaryButtonText}
              </a>
            </div>
            
            {/* Mobile CTA Button - Only show on mobile */}
            <div className="flex md:hidden">
              {content.hero.primaryButtonVisible && (
                <a 
                  href={content.hero.primaryButtonLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg text-sm whitespace-nowrap"
                >
                  {content.hero.primaryButtonText}
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in-up">
                <Globe className="w-4 h-4" />
                <span>{content.hero.badgeText}</span>
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up animation-delay-200">
                {content.hero.title.split(content.hero.subtitle).map((part, index, array) => (
                  <React.Fragment key={index}>
                    {part}
                    {index < array.length - 1 && (
                      <span className="text-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent animate-pulse"> {content.hero.subtitle}</span>
                    )}
                  </React.Fragment>
                ))}
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed animate-fade-in-up animation-delay-400">
                {content.hero.description}
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in-up animation-delay-600">
                {content.hero.primaryButtonVisible && (
                  <a 
                    href={content.hero.primaryButtonLink}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 group"
                  >
                    <span>{content.hero.primaryButtonText}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </a>
                )}
                {content.hero.secondaryButtonVisible && (
                  <a 
                    href={content.hero.secondaryButtonLink}
                    className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-emerald-300 flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
                  >
                    <Smartphone className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
                    <span>{content.hero.secondaryButtonText}</span>
                  </a>
                )}
              </div>
              
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600 animate-fade-in-up animation-delay-800">
                {(content.hero?.features || []).map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className={`w-4 h-4 text-emerald-600 animate-bounce animation-delay-${index * 200}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative z-10 animate-fade-in-up animation-delay-1000">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl">
                {content.testQR.enabled ? (
                  <div className="text-center">
                    <div className="mb-6 transform hover:scale-110 transition-transform duration-300">
                      <QRCodeGenerator
                        payNowOptions={{
                          mobile: null,
                          uen: content.testQR.uen,
                          amount: content.testQR.amount,
                          refId: content.testQR.reference,
                          editable: false,
                          company: 'PayNowGo'
                        }}
                        size={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-emerald-600">
                        SGD {content.testQR.amount.toFixed(2)}
                      </div>
                      <div className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded hover:bg-emerald-50 transition-colors duration-200">
                        {content.testQR.reference}
                      </div>
                      <p className="text-sm text-gray-600">{content.testQR.description}</p>
                      <p className="text-xs text-gray-500">Scan with any Singapore banking app</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-48 h-48 mx-auto bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-6 transform hover:rotate-3 transition-transform duration-300">
                      <div className="text-center">
                        <QrCode className="w-16 h-16 text-emerald-600 mx-auto mb-3 animate-pulse" />
                        <p className="text-sm font-medium text-emerald-700">PayNowGo</p>
                        <p className="text-xs text-emerald-600">POS System</p>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete POS Solution</h3>
                    <p className="text-gray-600">Generate PayNow QR codes, track payments, and manage your business with ease.</p>
                  </div>
                )}
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium animate-bounce hover:animate-pulse cursor-pointer">
                {content.hero.certificationBadge}
              </div>
              
              {/* Additional floating elements */}
              <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse animation-delay-1000"></div>
              <div className="absolute top-1/2 -right-8 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-30 animate-bounce animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fade-in-up">{content.features.title}</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">{content.features.subtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {(content.features?.items || []).map((feature, index) => {
              const Icon = getIcon(feature.icon);
              return (
                <div 
                  key={feature.id} 
                  className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 group animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-200 transition-colors duration-300 group-hover:rotate-6 transform">
                  <Icon className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors duration-300">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">{feature.description}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fade-in-up">{content.testimonials.title}</h2>
            <p className="text-xl text-gray-600 animate-fade-in-up animation-delay-200">{content.testimonials.subtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(content.testimonials?.items || []).map((testimonial, index) => (
              <div 
                key={testimonial.id} 
                className="bg-gray-50 p-8 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center mb-4 space-x-1">
                  {Array.from({ length: testimonial.rating || 0 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className="w-5 h-5 text-yellow-400 fill-current animate-pulse" 
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic hover:text-gray-900 transition-colors duration-300">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold text-gray-900 hover:text-emerald-700 transition-colors duration-300">{testimonial.name}</div>
                  <div className="text-sm text-gray-600 hover:text-gray-700 transition-colors duration-300">{testimonial.business}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-blue-50/50 animate-gradient-x"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fade-in-up">{content.pricing.title}</h2>
            <p className="text-xl text-gray-600 animate-fade-in-up animation-delay-200">{content.pricing.subtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {(content.pricing?.plans || []).map((plan, index) => (
              <div 
                key={plan.id} 
                className={`bg-white p-8 rounded-2xl shadow-sm border-2 ${
                  plan.popular 
                    ? 'border-emerald-500 relative transform scale-105 shadow-xl' 
                    : 'border-gray-100'
                } hover:shadow-2xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 animate-fade-in-up group`}
                style={{ animationDelay: `${index * 200}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors duration-300">{plan.name}</h3>
                  <p className="text-gray-600 mb-4 group-hover:text-gray-700 transition-colors duration-300">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors duration-300">{plan.price}</span>
                    <span className="text-gray-600 ml-1 group-hover:text-gray-700 transition-colors duration-300">{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {(plan.features || []).map((feature, featureIndex) => (
                    <li 
                      key={featureIndex} 
                      className="flex items-center space-x-3 animate-fade-in-left"
                      style={{ animationDelay: `${(index * 200) + (featureIndex * 50)}ms` }}
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
               {plan.buttonVisible !== false && (
                 <a 
                   href={plan.buttonLink || '/merchant'}
                   className={`w-full py-3 px-6 rounded-xl font-semibold text-center block transition-all duration-300 transform hover:scale-105 ${
                     plan.popular 
                       ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-2xl' 
                       : 'bg-gray-100 hover:bg-emerald-50 text-gray-900 hover:text-emerald-700 border-2 border-transparent hover:border-emerald-200'
                   }`}
                 >
                   {plan.buttonText || 'Get Started'}
                 </a>
               )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-400/20 to-transparent animate-pulse"></div>
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full animate-float"></div>
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full animate-float animation-delay-2000"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4 animate-fade-in-up relative z-10">{content.cta.title}</h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-200 relative z-10">{content.cta.subtitle}</p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in-up animation-delay-400 relative z-10">
            {content.cta.primaryButtonVisible && (
              <a 
                href={content.cta.primaryButtonLink}
                className="bg-white hover:bg-gray-100 text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 group"
              >
                <span>{content.cta.primaryButtonText}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
            )}
            {content.cta.secondaryButtonVisible && (
              <a 
                href={content.cta.secondaryButtonLink}
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-emerald-500 hover:border-emerald-400 flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
              >
                <Users className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
                <span>{content.cta.secondaryButtonText}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="col-span-1 md:col-span-2 animate-fade-in-up">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-500 transition-colors duration-300 hover:rotate-12 transform">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">PayNowGo</h3>
                  <p className="text-sm text-gray-400">Singapore POS System</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                {content.footer.description}
              </p>
              <div className="text-sm text-gray-500">
                {content.footer.copyright}
              </div>
            </div>
            
            <div className="animate-fade-in-up animation-delay-200">
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                {(content.footer?.productLinks || []).map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block">
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 animate-fade-in-up animation-delay-400 relative z-10">
            <p>{content.footer.supportText}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}