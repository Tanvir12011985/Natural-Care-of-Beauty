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

interface CartItem extends Product {
  quantity: number;
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Dummy Data for UI mockup
  const products: Product[] = [
    { id: '1', name: 'Organic Rosehip Oil', price: 1200, description: 'Pure cold-pressed rosehip oil for radiant, youthful skin.', imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80', category: 'skin care' },
    { id: '2', name: 'Revitalizing Eye Serum', price: 950, description: 'Caffeine-infused serum to reduce puffiness and dark circles.', imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', category: 'eye care' },
    { id: '3', name: 'Mineral Glow Foundation', price: 2100, description: 'Lightweight mineral foundation for a natural, flawless finish.', imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80', category: 'makeover' },
    { id: '4', name: 'Vitamin C Night Cream', price: 1800, description: 'Brightening night cream with stabilized Vitamin C and hyaluronic acid.', imageUrl: 'https://images.unsplash.com/photo-1611080541599-8c6dbde6ed28?w=800&q=80', category: 'skin care' },
    { id: '5', name: 'Botanical Lash Mascara', price: 1100, description: 'Volumizing mascara made with clean, eye-safe plant extracts.', imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80', category: 'eye care' },
    { id: '6', name: 'Velvet Matte Lipstick', price: 1400, description: 'Long-lasting matte lipstick enriched with shea butter.', imageUrl: 'https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=800&q=80', category: 'makeover' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const categories = ['All Products', 'eye care', 'skin care', 'makeover'];

  const filteredProducts = selectedCategory === 'All Products' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const next = item.quantity + delta;
        return next > 0 ? { ...item, quantity: next } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const members: Member[] = [
    { id: 'm1', email: 'alex.m@example.com', plan: 'Premium', status: 'Pending Review', createdAt: '2024-05-01' },
    { id: 'm2', email: 'sj.enks@gmail.com', plan: 'Elite', status: 'Active', createdAt: '2024-01-15' },
    { id: 'm3', email: 'wu.david@tech.io', plan: 'Standard', status: 'Pending Review', createdAt: '2024-05-10' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden text-[13px]">
      {/* Sidebar - Sleek Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col text-white shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-pink-500/20 text-base">B</div>
            <span className="font-semibold text-base tracking-tight leading-tight">Natural Care <br/> of Beauty</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-2">Navigation</div>
          
          <button 
            onClick={() => setActiveTab('store')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${activeTab === 'store' ? 'bg-pink-600/10 text-pink-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Product Catalog
          </button>
          
          <button 
            onClick={() => setActiveTab('membership')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${activeTab === 'membership' ? 'bg-pink-600/10 text-pink-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-4 h-4" />
            Memberships
          </button>

          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-6 pb-2">Administration</div>
          
          <button 
            onClick={() => setActiveTab('admin')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${activeTab === 'admin' ? 'bg-pink-600/10 text-pink-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
          </button>
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Administrator</div>
            <div className="text-xs font-medium text-white truncate mb-2">tanvir.khc@gmail.com</div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Verified Status</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="font-bold text-slate-900">Natural Care of Beauty</span>
            <span className="text-slate-300 text-lg">/</span>
            <span className="text-slate-900 capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[11px] text-slate-600 font-medium">Server Live</span>
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2.5 hover:bg-slate-50 rounded-full transition-colors relative group"
            >
              <ShoppingBag className="w-5 h-5 text-slate-600 group-hover:text-pink-500" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-pink-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>

            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-pink-500">
              <Star className="w-4 h-4" />
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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Our Collection</h1>
                    <p className="text-slate-500 text-xs mt-1">Nature's finest ingredients for your beauty ritual.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
                          selectedCategory === cat 
                            ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-pink-300 hover:text-pink-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-all hover:border-pink-100">
                      <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur rounded-[4px] text-[9px] font-black uppercase text-pink-600 border border-pink-100">
                          {product.category}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors">{product.name}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-900 font-black text-base">{formatPrice(product.price)}</span>
                          <button 
                            onClick={() => addToCart(product)}
                            className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-pink-500 transition-all shadow-lg shadow-slate-900/5 hover:shadow-pink-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" />
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

        {/* Shopping Cart Drawer */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 text-pink-500" />
                    <h2 className="text-xl font-bold text-slate-900">Your Cart</h2>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{cartCount} ITEMS</span>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-slate-200" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Your cart is empty</p>
                        <p className="text-xs text-slate-400 mt-1">Add items from the catalog to get started</p>
                      </div>
                      <button 
                        onClick={() => { setIsCartOpen(false); setActiveTab('store'); }}
                        className="text-pink-500 text-xs font-bold uppercase tracking-widest hover:underline"
                      >
                        Browse Products
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-4 group">
                          <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 py-1 flex flex-col">
                            <div className="flex justify-between items-start mb-1">
                              <h3 className="font-bold text-slate-900 text-[12px] uppercase truncate pr-4">{item.name}</h3>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="text-slate-300 hover:text-pink-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] text-pink-600 font-bold uppercase tracking-wider mb-auto">{item.category}</p>
                            
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                                <button 
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="px-2 py-1 hover:bg-white rounded-l-lg transition-colors text-slate-500"
                                >-</button>
                                <span className="px-2 text-[11px] font-bold text-slate-900">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="px-2 py-1 hover:bg-white rounded-r-lg transition-colors text-slate-500"
                                >+</button>
                              </div>
                              <span className="font-black text-slate-900">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Delivery</span>
                      <span className="text-green-600 uppercase font-black text-[9px]">Free</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="font-black text-slate-900 uppercase text-[12px]">Total Amount</span>
                      <span className="font-black text-pink-600 text-lg">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                  <button 
                    disabled={cart.length === 0}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

