import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Download, Upload, Eye, EyeOff, Loader2, Home, Star, DollarSign, Megaphone, FileText, Settings } from 'lucide-react';
import { CMSAPI, type CMSContent } from '../../lib/cms';

export function CMSEditor() {
  const [content, setContent] = useState<CMSContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  const sections = [
    { id: 'hero', label: 'Hero Section', icon: Home },
    { id: 'features', label: 'Features', icon: Star },
    { id: 'testimonials', label: 'Testimonials', icon: FileText },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'cta', label: 'Call-to-Action', icon: Megaphone },
    { id: 'meta', label: 'SEO & Meta', icon: Settings }
  ];

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const cmsContent = await CMSAPI.getContent();
      setContent(cmsContent);
    } catch (error) {
      console.error('Failed to load CMS content:', error);
      alert('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const saveContent = async () => {
    if (!content) return;

    try {
      setIsSaving(true);
      await CMSAPI.saveContent(content);
      setLastSaved(new Date());
      alert('Content saved successfully!');
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!confirm('Are you sure you want to reset all content to default? This cannot be undone.')) {
      return;
    }

    try {
      await CMSAPI.resetToDefault();
      await loadContent();
      alert('Content reset to default successfully!');
    } catch (error) {
      console.error('Failed to reset content:', error);
      alert('Failed to reset content');
    }
  };

  const exportContent = async () => {
    try {
      const jsonString = await CMSAPI.exportContent();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paynowgo-cms-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export content:', error);
      alert('Failed to export content');
    }
  };

  const importContent = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await CMSAPI.importContent(text);
      await loadContent();
      alert('Content imported successfully!');
    } catch (error) {
      console.error('Failed to import content:', error);
      alert('Failed to import content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Reset file input
    event.target.value = '';
  };

  const updateContent = (path: string[], value: any) => {
    if (!content) return;

    setContent(prev => {
      if (!prev) return prev;
      
      const newContent = { ...prev };
      let current: any = newContent;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      
      current[path[path.length - 1]] = value;
      return newContent;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading CMS content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load CMS content</p>
        <button
          onClick={loadContent}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Content Management</h2>
          <p className="text-gray-600 mt-1">Edit landing page content and settings</p>
          {lastSaved && (
            <p className="text-sm text-green-600 mt-1">
              Last saved: {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              previewMode 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{previewMode ? 'Edit Mode' : 'Preview Mode'}</span>
          </button>
          
          <input
            type="file"
            accept=".json"
            onChange={importContent}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </label>
          
          <button
            onClick={exportContent}
            className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={resetToDefault}
            className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          
          <button
            onClick={saveContent}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Live Preview</h3>
          <iframe
            src="/"
            className="w-full h-96 border border-gray-300 rounded-lg"
            title="Website Preview"
          />
          <p className="text-sm text-gray-600 mt-2">
            Preview shows the current saved content. Save changes to see updates.
          </p>
        </div>
      ) : (
        /* Edit Mode */
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 h-fit sticky top-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Content Sections</h3>
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeSection === section.id
                        ? 'bg-red-50 text-red-700 border-r-2 border-red-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Editor */}
          <div className="flex-1">
            {activeSection === 'hero' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Hero Section</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={content.hero.title}
                        onChange={(e) => updateContent(['hero', 'title'], e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                      <input
                        type="text"
                        value={content.hero.subtitle}
                        onChange={(e) => updateContent(['hero', 'subtitle'], e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={content.hero.description}
                        onChange={(e) => updateContent(['hero', 'description'], e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Badge Text</label>
                      <input
                        type="text"
                        value={content.hero.badgeText}
                        onChange={(e) => updateContent(['hero', 'badgeText'], e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Primary Button */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Primary Button</h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!content.hero.primaryButtonVisible}
                            onChange={(e) => updateContent(['hero', 'primaryButtonVisible'], !e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Disable Button</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Button Text"
                          value={content.hero.primaryButtonText}
                          onChange={(e) => updateContent(['hero', 'primaryButtonText'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Button Link"
                          value={content.hero.primaryButtonLink}
                          onChange={(e) => updateContent(['hero', 'primaryButtonLink'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    {/* Secondary Button */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Secondary Button</h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!content.hero.secondaryButtonVisible}
                            onChange={(e) => updateContent(['hero', 'secondaryButtonVisible'], !e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Disable Button</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Button Text"
                          value={content.hero.secondaryButtonText}
                          onChange={(e) => updateContent(['hero', 'secondaryButtonText'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Button Link"
                          value={content.hero.secondaryButtonLink}
                          onChange={(e) => updateContent(['hero', 'secondaryButtonLink'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'features' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Features Section</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                    <input
                      type="text"
                      value={content.features.title}
                      onChange={(e) => updateContent(['features', 'title'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Subtitle</label>
                    <textarea
                      value={content.features.subtitle}
                      onChange={(e) => updateContent(['features', 'subtitle'], e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Feature Items</label>
                    <div className="space-y-4">
                      {content.features.items.map((feature, index) => (
                        <div key={feature.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <input
                                type="text"
                                placeholder="Feature Title"
                                value={feature.title}
                                onChange={(e) => {
                                  const newItems = [...content.features.items];
                                  newItems[index] = { ...feature, title: e.target.value };
                                  updateContent(['features', 'items'], newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Icon Name (e.g., QrCode)"
                                value={feature.icon}
                                onChange={(e) => {
                                  const newItems = [...content.features.items];
                                  newItems[index] = { ...feature, icon: e.target.value };
                                  updateContent(['features', 'items'], newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <textarea
                              placeholder="Feature Description"
                              value={feature.description}
                              onChange={(e) => {
                                const newItems = [...content.features.items];
                                newItems[index] = { ...feature, description: e.target.value };
                                updateContent(['features', 'items'], newItems);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'testimonials' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Testimonials Section</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                    <input
                      type="text"
                      value={content.testimonials.title}
                      onChange={(e) => updateContent(['testimonials', 'title'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Subtitle</label>
                    <input
                      type="text"
                      value={content.testimonials.subtitle}
                      onChange={(e) => updateContent(['testimonials', 'subtitle'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Testimonials</label>
                    <div className="space-y-4">
                      {content.testimonials.items.map((testimonial, index) => (
                        <div key={testimonial.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <input
                                type="text"
                                placeholder="Customer Name"
                                value={testimonial.name}
                                onChange={(e) => {
                                  const newItems = [...content.testimonials.items];
                                  newItems[index] = { ...testimonial, name: e.target.value };
                                  updateContent(['testimonials', 'items'], newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                placeholder="Business Name"
                                value={testimonial.business}
                                onChange={(e) => {
                                  const newItems = [...content.testimonials.items];
                                  newItems[index] = { ...testimonial, business: e.target.value };
                                  updateContent(['testimonials', 'items'], newItems);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <textarea
                              placeholder="Testimonial Text"
                              value={testimonial.text}
                              onChange={(e) => {
                                const newItems = [...content.testimonials.items];
                                newItems[index] = { ...testimonial, text: e.target.value };
                                updateContent(['testimonials', 'items'], newItems);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={testimonial.rating}
                              onChange={(e) => {
                                const newItems = [...content.testimonials.items];
                                newItems[index] = { ...testimonial, rating: parseInt(e.target.value) || 5 };
                                updateContent(['testimonials', 'items'], newItems);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'pricing' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Pricing Section</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                    <input
                      type="text"
                      value={content.pricing.title}
                      onChange={(e) => updateContent(['pricing', 'title'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section Subtitle</label>
                    <input
                      type="text"
                      value={content.pricing.subtitle}
                      onChange={(e) => updateContent(['pricing', 'subtitle'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Pricing Plans</label>
                    <div className="space-y-6">
                      {content.pricing.plans.map((plan, index) => (
                        <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">{plan.name} Plan</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                              <input
                                type="text"
                                placeholder="Plan Name"
                                value={plan.name}
                                onChange={(e) => {
                                  const newPlans = [...content.pricing.plans];
                                  newPlans[index] = { ...plan, name: e.target.value };
                                  updateContent(['pricing', 'plans'], newPlans);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                              <input
                                type="text"
                                placeholder="Price"
                                value={plan.price}
                                onChange={(e) => {
                                  const newPlans = [...content.pricing.plans];
                                  newPlans[index] = { ...plan, price: e.target.value };
                                  updateContent(['pricing', 'plans'], newPlans);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                              <input
                                type="text"
                                placeholder="Period"
                                value={plan.period}
                                onChange={(e) => {
                                  const newPlans = [...content.pricing.plans];
                                  newPlans[index] = { ...plan, period: e.target.value };
                                  updateContent(['pricing', 'plans'], newPlans);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                              />
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Description</label>
                            <textarea
                              placeholder="Plan Description"
                              value={plan.description}
                              onChange={(e) => {
                                const newPlans = [...content.pricing.plans];
                                newPlans[index] = { ...plan, description: e.target.value };
                                updateContent(['pricing', 'plans'], newPlans);
                              }}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          
                          <div className="mb-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                               checked={plan.buttonVisible === false}
                                onChange={(e) => {
                                  const newPlans = [...content.pricing.plans];
                                 newPlans[index] = { ...plan, buttonVisible: !e.target.checked };
                                  updateContent(['pricing', 'plans'], newPlans);
                                }}
                                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Disable Button</span>
                            </label>
                          </div>
                         
                          <div className="mb-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={plan.popular}
                                onChange={(e) => {
                                  const newPlans = [...content.pricing.plans];
                                  newPlans[index] = { ...plan, popular: e.target.checked };
                                  updateContent(['pricing', 'plans'], newPlans);
                                }}
                                className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Mark as Popular</span>
                            </label>
                          </div>
                         
                          {/* Button Configuration */}
                          <div className="border-t pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                                <input
                                  type="text"
                                  placeholder="Button Text"
                                  value={plan.buttonText || 'Get Started'}
                                  onChange={(e) => {
                                    const newPlans = [...content.pricing.plans];
                                    newPlans[index] = { ...plan, buttonText: e.target.value };
                                    updateContent(['pricing', 'plans'], newPlans);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                                <input
                                  type="text"
                                  placeholder="Button Link"
                                  value={plan.buttonLink || '/merchant'}
                                  onChange={(e) => {
                                    const newPlans = [...content.pricing.plans];
                                    newPlans[index] = { ...plan, buttonLink: e.target.value };
                                    updateContent(['pricing', 'plans'], newPlans);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'cta' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Call-to-Action Section</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CTA Title</label>
                      <input
                        type="text"
                        value={content.cta.title}
                        onChange={(e) => updateContent(['cta', 'title'], e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CTA Subtitle</label>
                      <textarea
                        value={content.cta.subtitle}
                        onChange={(e) => updateContent(['cta', 'subtitle'], e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Primary CTA Button */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Primary CTA Button</h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!content.cta.primaryButtonVisible}
                            onChange={(e) => updateContent(['cta', 'primaryButtonVisible'], !e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Disable Button</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Button Text"
                          value={content.cta.primaryButtonText}
                          onChange={(e) => updateContent(['cta', 'primaryButtonText'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Button Link"
                          value={content.cta.primaryButtonLink}
                          onChange={(e) => updateContent(['cta', 'primaryButtonLink'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>

                    {/* Secondary CTA Button */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Secondary CTA Button</h4>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!content.cta.secondaryButtonVisible}
                            onChange={(e) => updateContent(['cta', 'secondaryButtonVisible'], !e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Disable Button</span>
                        </label>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Button Text"
                          value={content.cta.secondaryButtonText}
                          onChange={(e) => updateContent(['cta', 'secondaryButtonText'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                        <input
                          type="text"
                          placeholder="Button Link"
                          value={content.cta.secondaryButtonLink}
                          onChange={(e) => updateContent(['cta', 'secondaryButtonLink'], e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'meta' && (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">SEO & Meta Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Page Title</label>
                    <input
                      type="text"
                      value={content.meta.title}
                      onChange={(e) => updateContent(['meta', 'title'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                    <textarea
                      value={content.meta.description}
                      onChange={(e) => updateContent(['meta', 'description'], e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={content.meta.keywords.join(', ')}
                      onChange={(e) => updateContent(['meta', 'keywords'], e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Test QR Configuration */}
                  <div className="border-t pt-6 mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Test QR Code Configuration</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={content.testQR.enabled}
                            onChange={(e) => updateContent(['testQR', 'enabled'], e.target.checked)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Enable Test QR Code on Landing Page</span>
                        </label>
                      </div>

                      {content.testQR.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-gray-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (SGD)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={content.testQR.amount}
                              onChange={(e) => updateContent(['testQR', 'amount'], parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">UEN</label>
                            <input
                              type="text"
                              value={content.testQR.uen}
                              onChange={(e) => updateContent(['testQR', 'uen'], e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
                            <input
                              type="text"
                              value={content.testQR.reference}
                              onChange={(e) => updateContent(['testQR', 'reference'], e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <input
                              type="text"
                              value={content.testQR.description}
                              onChange={(e) => updateContent(['testQR', 'description'], e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}