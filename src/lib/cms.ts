/**
 * Content Management System for PayNowGo
 * Manages all website content including landing page, features, pricing, etc.
 * Now with Supabase database integration for permanent storage
 */

import { CMSDB, migrateAdminDataToSupabase, needsAdminMigration } from './admin-database';
import { SupabaseTableNotFoundError } from './admin-database';
import { supabase } from './supabase';

export interface CMSContent {
  // Hero Section
  hero: {
    title: string;
    subtitle: string;
    description: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    primaryButtonVisible: boolean;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    secondaryButtonVisible: boolean;
    badgeText: string;
    certificationBadge: string;
    features: string[];
  };
  
  // Features Section
  features: {
    title: string;
    subtitle: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
    }>;
  };
  
  // Testimonials Section
  testimonials: {
    title: string;
    subtitle: string;
    items: Array<{
      id: string;
      name: string;
      business: string;
      rating: number;
      text: string;
    }>;
  };
  
  // Pricing Section
  pricing: {
    title: string;
    subtitle: string;
    plans: Array<{
      id: string;
      name: string;
      price: string;
      period: string;
      description: string;
      features: string[];
      popular: boolean;
    }>;
  };
  
  // CTA Section
  cta: {
    title: string;
    subtitle: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    primaryButtonVisible: boolean;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    secondaryButtonVisible: boolean;
  };
  
  // Footer
  footer: {
    description: string;
    copyright: string;
    supportText: string;
    navigationLinks: Array<{ text: string; href: string }>;
    productLinks: Array<{ text: string; href: string }>;
    supportLinks: Array<{ text: string; href: string }>;
  };
  
  // Navigation
  navigation: {
    menuItems: Array<{ text: string; href: string }>;
  };
  
  // Test QR Code
  testQR: {
    enabled: boolean;
    amount: number;
    uen: string;
    reference: string;
    description: string;
  };
  
  // SEO & Meta
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
}

const STORAGE_KEY = 'paynowgo_cms_content';

// Default content
const DEFAULT_CONTENT: CMSContent = {
  hero: {
    title: 'Accept PayNow Payments Effortlessly',
    subtitle: 'PayNow',
    description: 'Complete Point-of-Sale system with Singapore PayNow integration. Generate QR codes, track payments, and manage your business with ease.',
    primaryButtonText: 'Start Free Trial',
    primaryButtonLink: '/merchant',
    primaryButtonVisible: true,
    secondaryButtonText: 'View Demo',
    secondaryButtonLink: '/display',
    secondaryButtonVisible: true,
    badgeText: "Singapore's #1 PayNow POS System",
    certificationBadge: 'Singapore Certified',
    features: [
      'No setup fees',
      '14-day free trial',
      'Cancel anytime'
    ]
  },
  
  features: {
    title: 'Everything you need for modern payments',
    subtitle: 'Built specifically for Singapore businesses with PayNow integration, real-time analytics, and customer display systems.',
    items: [
      {
        id: 'paynow',
        title: 'PayNow Integration',
        description: 'Generate Singapore PayNow QR codes instantly. Support for both UEN and mobile payments.',
        icon: 'QrCode'
      },
      {
        id: 'display',
        title: 'Customer Display',
        description: 'Dual-screen setup with customer-facing QR code display for seamless transactions.',
        icon: 'Smartphone'
      },
      {
        id: 'analytics',
        title: 'Real-time Analytics',
        description: 'Track sales, monitor performance, and export detailed reports with just one click.',
        icon: 'BarChart3'
      },
      {
        id: 'security',
        title: 'Secure & Compliant',
        description: 'Bank-grade security with Singapore PayNow compliance and data protection.',
        icon: 'Shield'
      },
      {
        id: 'multitenant',
        title: 'Multi-Tenant',
        description: 'Manage multiple businesses from one admin portal with role-based access control.',
        icon: 'Users'
      },
      {
        id: 'fast',
        title: 'Lightning Fast',
        description: 'QR code generation in under 100ms. Real-time payment notifications and updates.',
        icon: 'Zap'
      }
    ]
  },
  
  testimonials: {
    title: 'Trusted by Singapore businesses',
    subtitle: 'Join hundreds of merchants already using PayNowGo',
    items: [
      {
        id: 'sarah',
        name: 'Sarah Lim',
        business: 'Kopitiam Corner',
        rating: 5,
        text: 'PayNowGo transformed our payment process. Customers love the quick QR payments!'
      },
      {
        id: 'david',
        name: 'David Tan',
        business: 'Hawker Delights',
        rating: 5,
        text: 'The dual display setup is perfect for our stall. Sales tracking is incredibly detailed.'
      },
      {
        id: 'michelle',
        name: 'Michelle Wong',
        business: 'Cafe Botanica',
        rating: 5,
        text: 'Setup was effortless. The admin portal makes managing multiple locations a breeze.'
      }
    ]
  },
  
  pricing: {
    title: 'Simple, transparent pricing',
    subtitle: 'Choose the plan that fits your business needs',
    plans: [
      {
        id: 'basic',
        name: 'Basic',
        price: 'S$29',
        period: '/month',
        description: 'Perfect for small businesses',
        features: [
          'Up to 500 transactions/month',
          '1 customer display',
          'Basic analytics',
          'Email support',
          'PayNow integration'
        ],
        popular: false,
        buttonText: 'Get Started',
        buttonLink: '/merchant',
        buttonVisible: true
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 'S$79',
        period: '/month',
        description: 'Ideal for growing businesses',
        features: [
          'Up to 2,000 transactions/month',
          '2 customer displays',
          'Advanced analytics & reports',
          'Priority support',
          'Multi-location support',
          'Custom branding'
        ],
        popular: true,
        buttonText: 'Get Started',
        buttonLink: '/merchant',
        buttonVisible: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'For large operations',
        features: [
          'Unlimited transactions',
          'Unlimited displays',
          'White-label solution',
          '24/7 phone support',
          'Custom integrations',
          'Dedicated account manager'
        ],
        popular: false,
        buttonText: 'Contact Sales',
        buttonLink: 'mailto:sales@paynowgo.com',
        buttonVisible: true
      }
    ]
  },
  
  cta: {
    title: 'Ready to modernize your payments?',
    subtitle: 'Join the PayNow revolution. Start accepting QR payments today with our 14-day free trial.',
    primaryButtonText: 'Start Free Trial',
    primaryButtonLink: '/merchant',
    primaryButtonVisible: true,
    secondaryButtonText: 'Admin Portal',
    secondaryButtonLink: '/admin',
    secondaryButtonVisible: true
  },
  
  footer: {
    description: 'The complete PayNow POS solution for Singapore businesses. Accept payments, manage inventory, and grow your business.',
    copyright: '© 2025 PayNowGo. All rights reserved.',
    supportText: 'Built for Singapore businesses • PayNow certified • Bank-grade security',
    navigationLinks: [
      { text: 'Home', href: '/' },
      { text: 'Features', href: '#features' },
      { text: 'Pricing', href: '#pricing' },
      { text: 'Contact', href: '#contact' }
    ],
    productLinks: [
      { text: 'Features', href: '#features' },
      { text: 'Pricing', href: '#pricing' },
      { text: 'Merchant Portal', href: '/merchant' },
      { text: 'Customer Display', href: '/display' }
    ],
    supportLinks: [
      { text: 'Contact Support', href: 'mailto:support@paynowgo.com' },
      { text: 'Admin Portal', href: '/admin' },
      { text: 'Singapore: +65 6123 4567', href: 'tel:+6561234567' },
      { text: 'support@paynowgo.com', href: 'mailto:support@paynowgo.com' }
    ]
  },
  
  navigation: {
    menuItems: [
      { text: 'Features', href: '#features' },
      { text: 'Pricing', href: '#pricing' },
      { text: 'Reviews', href: '#testimonials' },
      { text: 'Contact', href: '#contact' }
    ]
  },
  
  testQR: {
    enabled: true,
    amount: 10.00,
    uen: '202323584D',
    reference: 'Test-Do-Not-Pay-001',
    description: 'Please don\'t pay, this is for Test Purpose.'
  },
  
  meta: {
    title: 'PayNowGo - Singapore PayNow POS System',
    description: 'Complete Point-of-Sale system with Singapore PayNow integration. Generate QR codes, track payments, and manage your business with ease.',
    keywords: ['PayNow', 'Singapore', 'POS', 'QR Code', 'Payment', 'Point of Sale', 'UEN', 'Mobile Payment']
  }
};

// CMS API
export const CMSAPI = {
  async getContent(): Promise<CMSContent> {
    console.log('[CMS_API] Getting content from Supabase...');
    
    try {
      const cmsContent = await CMSDB.getAllContent();
      
      if (!cmsContent || Object.keys(cmsContent).length === 0) {
        console.log('[CMS_API] No content in Supabase, using default');
        return DEFAULT_CONTENT;
      }
      
      return {
        ...DEFAULT_CONTENT,
        ...cmsContent
      };
    } catch (error) {
      if (error instanceof SupabaseTableNotFoundError) {
        console.warn('CMS table not found, using default content:', error.message);
      } else {
        console.error('Error loading CMS content from Supabase:', error);
      }
      return DEFAULT_CONTENT;
    }
  },

  async saveContent(content: CMSContent): Promise<void> {
    console.log('[CMS_API] Saving content to Supabase...');
    
    try {
      // Save each section individually
      for (const [section, sectionContent] of Object.entries(content)) {
        console.log(`[CMS_API] Saving section: ${section}`);
        
        // Deactivate current active version for this section
        const { error: deactivateError } = await supabase
          .from('cms_content')
          .update({ active: false })
          .eq('section', section)
          .eq('active', true);
        
        if (deactivateError) {
          console.warn(`[CMS_API] Warning deactivating old content for ${section}:`, deactivateError);
        }
        
        // Insert new active version
        const { error: insertError } = await supabase
          .from('cms_content')
          .insert({
            section: section,
            content: sectionContent,
            active: true,
            version: 1
          });
        
        if (insertError) {
          console.error(`[CMS_API] Error saving section ${section}:`, insertError);
          throw new Error(`Failed to save ${section}: ${insertError.message}`);
        }
        
        console.log(`[CMS_API] Section ${section} saved successfully`);
      }
      
      console.log('[CMS_API] All content saved successfully');
    } catch (error) {
      console.error('[CMS_API] Error saving content:', error);
      throw error;
    }
  },

  async resetToDefault(): Promise<void> {
    console.log('[CMS_API] Resetting content to default in Supabase...');
    await this.saveContent(DEFAULT_CONTENT);
  },

  async exportContent(): Promise<string> {
    const content = await this.getContent();
    return JSON.stringify(content, null, 2);
  },

  async importContent(jsonString: string): Promise<void> {
    try {
      const content = JSON.parse(jsonString);
      this.validateContent(content);
      await this.saveContent(content);
    } catch (error) {
      console.error('Error importing CMS content:', error);
      throw new Error('Invalid content format');
    }
  },

  validateContent(content: any): boolean {
    // Basic validation
    const requiredSections = ['hero', 'features', 'testimonials', 'pricing', 'cta', 'footer', 'meta'];
    
    for (const section of requiredSections) {
      if (!content[section]) {
        throw new Error(`Missing required section: ${section}`);
      }
    }
    
    return true;
  }
};

// Initialize with default content if not exists
if (typeof window !== 'undefined') {
  // Initialize will happen automatically when getContent() is first called
  console.log('[CMS] CMS API initialized with database integration');
}