import React from 'react';
import { X, BarChart3, CreditCard, FileText, Settings, PieChart, Package } from 'lucide-react';
import type { Page } from '../../App';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems = [
  { key: 'dashboard' as Page, label: 'Dashboard', icon: BarChart3 },
  { key: 'pos' as Page, label: 'POS System', icon: CreditCard },
  { key: 'items' as Page, label: 'Items', icon: Package },
  { key: 'orders' as Page, label: 'Orders', icon: FileText },
  { key: 'reports' as Page, label: 'Reports', icon: PieChart },
  { key: 'settings' as Page, label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">PayNowGo</h2>
                <p className="text-xs text-gray-500">Singapore POS</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.key;
                
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => {
                        setCurrentPage(item.key);
                        setIsOpen(false);
                      }}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                        ${isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
        </div>
      </div>
    </>
  );
}