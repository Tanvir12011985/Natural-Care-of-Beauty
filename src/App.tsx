/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Users, 
  Settings as SettingsIcon, 
  ChevronRight, 
  Star, 
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
}

interface Member {
  id: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
}

// Currency Formatter Utility
const formatPrice = (price: number) => {
  return `TK ${price.toLocaleString()}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'membership' | 'admin'>('store');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Default to true for demo based on user email in metadata

  // Dummy Data for UI mockup
  const products: Product[] = [
    { id: '1', name: 'Nexus Prime Watch', price: 15000, description: 'Cutting edge smart watch with AI integration.', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', category: 'Accessories' },
    { id: '2', name: 'Aether 1 Wireless Buds', price: 8500, description: 'True wireless sound with active noise cancellation.', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', category: 'Audio' },
    { id: '3', name: 'Lumina Tech Backpack', price: 4200, description: 'Durable, waterproof, and sleek design for modern professionals.', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', category: 'Lifestyle' },
    { id: '4', name: 'Quantum Mechanical Keyboard', price: 12000, description: 'Professional grade mechanical keyboard with custom RGB.', imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&q=80', category: 'Peripherals' },
  ];

  const members: Member[] = [
    { id: 'm1', email: 'alex.m@example.com', plan: 'Premium', status: 'Pending Review', createdAt: '2024-05-01' },
    { id: 'm2', email: 'sj.enks@gmail.com', plan: 'Elite', status: 'Active', createdAt: '2024-01-15' },
    { id: 'm3', email: 'wu.david@tech.io', plan: 'Standard', status: 'Pending Review', createdAt: '2024-05-10' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Sleek Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col text-white shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">N</div>
            <span className="font-semibold text-lg tracking-tight">Nexus Store</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 pb-2">Navigation</div>
          
          <button 
            onClick={() => setActiveTab('store')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${activeTab === 'store' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Store Catalog
          </button>
          
          <button 
            onClick={() => setActiveTab('membership')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${activeTab === 'membership' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            Memberships
          </button>

          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 pt-6 pb-2">Administration</div>
          
          <button 
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${activeTab === 'admin' ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Signed in as</div>
            <div className="text-sm font-medium text-white truncate">tanvir.khc@gmail.com</div>
            <div className="mt-2 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full inline-block">Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span>Nexus App</span>
            <span className="text-slate-300 text-lg">/</span>
            <span className="text-slate-900 capitalize">{activeTab} View</span>
            {activeTab === 'admin' && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold ml-2">V2 ACTIVE</span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-slate-600 font-medium">Systems Online</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
              <Star className="w-5 h-5" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'store' && (
              <motion.div
                key="store"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Main Catalog</h1>
                    <p className="text-slate-500 mt-1">Discover our latest minimalist essentials.</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                    {products.length} Products Available
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase text-slate-600 border border-slate-200">
                          {product.category}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-blue-600 font-bold text-lg">{formatPrice(product.price)}</span>
                          <button className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'membership' && (
              <motion.div
                key="membership"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="max-w-5xl mx-auto space-y-12 py-8"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Unlock Elite Access</h2>
                  <p className="text-slate-500 max-w-xl mx-auto">
                    Join the ranks of elite creators with our subscription tiers designed for visionaries.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    { name: 'Basic', price: 0, description: 'For occasional explorers', perks: ['Early access', 'Community board', 'Email updates'] },
                    { name: 'Prime', price: 2500, description: 'Our most popular choice', perks: ['15% off products', 'Dedicated support', 'Elite badge'], popular: true },
                    { name: 'Founder', price: 7500, description: 'For the inner circle', perks: ['30% off life-time', 'Private lounge', 'Beta tester access'] }
                  ].map((plan) => (
                    <div key={plan.name} className={`bg-white p-8 rounded-2xl border ${plan.popular ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} shadow-sm flex flex-col relative`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                          Recommended
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-slate-400 mt-1 mb-6">{plan.description}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900">{formatPrice(plan.price)}</span>
                        <span className="text-slate-400 text-sm">/mo</span>
                      </div>
                      <ul className="space-y-4 mb-8 flex-grow">
                        {plan.perks.map((perk) => (
                          <li key={perk} className="text-sm text-slate-600 flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-3 h-3 text-blue-500" />
                            </div>
                            {perk}
                          </li>
                        ))}
                      </ul>
                      <button className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${plan.popular ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 shadow-blue-500/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        Choose {plan.name}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Architecture Overview</h2>
                      <p className="text-sm text-slate-500 mt-1">Status of current Firestore security rules and access patterns.</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium border border-slate-200">View Blueprint</button>
                      <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">Edit Rules</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-700">Products</h3>
                        <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded font-bold uppercase">Public Read</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">Global access allowed for product catalog browsing. Write access restricted to Admin.</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>Write:</span>
                        <span className="text-blue-600 truncate">tanvir.khc@gmail.com</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-700">Settings</h3>
                        <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded font-bold uppercase">Public Read</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">General app configuration available to all clients. Write restricted to project owner.</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>Write:</span>
                        <span className="text-blue-600 truncate">tanvir.khc@gmail.com</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-700">Memberships</h3>
                        <span className="text-[10px] px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold uppercase">Secure Access</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">Public create allowed for sign-ups. Read, update, and delete exclusively for Admin.</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>Read:</span>
                        <span className="text-blue-600 truncate">tanvir.khc@gmail.com</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-[2] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Recent Membership Orders</h3>
                      <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">View All Applications</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-3">Email Address</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Plan</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600">
                          {members.map((member) => (
                            <tr key={member.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{member.email}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  member.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {member.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-medium text-slate-900">{member.plan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6">Product Insight</h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-end justify-between mb-2">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Products</div>
                          <div className="text-2xl font-bold text-slate-900">1,248</div>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full w-4/5"></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                          <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Admin Writes</div>
                          <div className="text-xl font-bold text-slate-800">42</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg text-center border border-slate-100">
                          <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Public Reads</div>
                          <div className="text-xl font-bold text-slate-800">12.5k</div>
                        </div>
                      </div>

                      <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10">
                        <Plus className="w-3 h-3" /> Add Product
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

