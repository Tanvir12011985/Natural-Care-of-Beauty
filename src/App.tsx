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
  Plus,
  ArrowLeft,
  Check,
  Printer,
  Truck
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
  name: string;
  mobile: string;
  address: string;
  email: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  customerName: string;
  status: 'Pending' | 'Packing done' | 'Hand over to the currier agent' | 'delivery done';
  timestamp: string;
}

// Currency Formatter Utility
const formatPrice = (price: number) => {
  return `TK ${price.toLocaleString()}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'admin' | 'checkout' | 'success' | 'tracking'>('store');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'products' | 'members' | 'status' | 'plans'>('products');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true); // Default to true for demo based on user email in metadata
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [showSlip, setShowSlip] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Members State
  const [memberData, setMemberData] = useState<Member[]>([
    { id: 'm1', name: 'Alex M.', mobile: '01700000001', address: '123 Dhaka St', email: 'alex.m@example.com', plan: 'Premium', status: 'Pending Review', createdAt: '2024-05-01' },
    { id: 'm2', name: 'SJ Enks', mobile: '01700000002', address: '456 Chittagong Rd', email: 'sj.enks@gmail.com', plan: 'Elite', status: 'Active', createdAt: '2024-01-15' },
    { id: 'm3', name: 'David Wu', mobile: '01700000003', address: '789 Sylhet Ave', email: 'wu.david@tech.io', plan: 'Standard', status: 'Pending Review', createdAt: '2024-05-10' },
  ]);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    address: '',
    mobile: '',
    paymentMethod: 'cash on delivery',
    invoiceNumber: '',
    date: new Date().toLocaleDateString('en-GB')
  });

  useEffect(() => {
    if (activeTab === 'checkout' && !checkoutForm.invoiceNumber) {
      const inv = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setCheckoutForm(prev => ({ ...prev, invoiceNumber: inv }));
    }
  }, [activeTab]);

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ordNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(ordNum);
    setLastOrderItems([...cart]);
    
    // Auto-add Membership
    const newMember: Member = {
      id: `m${Date.now()}`,
      name: checkoutForm.name,
      mobile: checkoutForm.mobile,
      address: checkoutForm.address,
      email: 'customer@example.com', // Placeholder or real email if available
      plan: 'Basic', // Default plan for new shoppers
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    setMemberData(prev => [newMember, ...prev]);

    // Add to Tracking
    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: ordNum,
      invoiceNumber: checkoutForm.invoiceNumber,
      customerName: checkoutForm.name,
      status: 'Pending',
      timestamp: new Date().toLocaleString()
    };
    setOrders(prev => [newOrder, ...prev]);

    setActiveTab('success');
    setCart([]);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  // Products State
  const [productsList, setProductsList] = useState<Product[]>([
    { id: '1', name: 'Organic Rosehip Oil', price: 1200, description: 'Pure cold-pressed rosehip oil for radiant, youthful skin.', imageUrl: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800&q=80', category: 'screen care' },
    { id: '2', name: 'Revitalizing Eye Serum', price: 950, description: 'Caffeine-infused serum to reduce puffiness and dark circles.', imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', category: 'eye care' },
    { id: '3', name: 'Mineral Glow Foundation', price: 2100, description: 'Lightweight mineral foundation for a natural, flawless finish.', imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80', category: 'makeover' },
    { id: '4', name: 'Vitamin C Night Cream', price: 1800, description: 'Brightening night cream with stabilized Vitamin C and hyaluronic acid.', imageUrl: 'https://images.unsplash.com/photo-1611080541599-8c6dbde6ed28?w=800&q=80', category: 'screen care' },
    { id: '5', name: 'Botanical Lash Mascara', price: 1100, description: 'Volumizing mascara made with clean, eye-safe plant extracts.', imageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80', category: 'eye care' },
    { id: '6', name: 'Velvet Matte Lipstick', price: 1400, description: 'Long-lasting matte lipstick enriched with shea butter.', imageUrl: 'https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=800&q=80', category: 'makeover' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const categories = ['All Products', 'eye care', 'screen care', 'makeover'];

  const filteredProducts = selectedCategory === 'All Products' 
    ? productsList 
    : productsList.filter(p => p.category === selectedCategory);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    category: 'eye care',
    description: '',
    imageUrl: ''
  });

  const handleOpenProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ ...product });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, category: 'eye care', description: '', imageUrl: '' });
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setProductsList(prev => prev.map(p => p.id === editingProduct.id ? { ...productForm, id: p.id } : p));
    } else {
      const newProduct = { ...productForm, id: Date.now().toString() };
      setProductsList(prev => [...prev, newProduct]);
    }
    setIsProductModalOpen(false);
  };

  const deleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProductsList(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

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
            onClick={() => setActiveTab('tracking')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${activeTab === 'tracking' ? 'bg-pink-600/10 text-pink-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Truck className="w-4 h-4" />
            Order Tracking
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

            {activeTab === 'tracking' && (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Tracking</h1>
                    <p className="text-slate-500 text-xs mt-1">Monitor shipment progress and update courier status.</p>
                  </div>
                  <div className="w-full md:w-72">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search Order # or Name..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3">Order Info</th>
                          <th className="px-6 py-3">Customer</th>
                          <th className="px-6 py-3">Current Status</th>
                          <th className="px-6 py-3 text-right">Update Progression</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-slate-600">
                        {orders.filter(o => 
                          o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          o.invoiceNumber.toLowerCase().includes(orderSearchQuery.toLowerCase())
                        ).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                              {orderSearchQuery ? `No results found for "${orderSearchQuery}"` : "No orders in tracking yet. Complete a checkout to see orders here."}
                            </td>
                          </tr>
                        ) : (
                          orders
                            .filter(o => 
                              o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                              o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                              o.invoiceNumber.toLowerCase().includes(orderSearchQuery.toLowerCase())
                            )
                            .map((order) => (
                            <tr key={order.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900">{order.orderNumber}</p>
                                <p className="text-[10px] text-slate-400 font-mono">INV: {order.invoiceNumber}</p>
                                <p className="text-[9px] text-slate-400 uppercase mt-1">{order.timestamp}</p>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">{order.customerName}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  order.status === 'delivery done' ? 'bg-green-100 text-green-700' :
                                  order.status === 'Hand over to the currier agent' ? 'bg-blue-100 text-blue-700' :
                                  order.status === 'Packing done' ? 'bg-pink-100 text-pink-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                  Tracked System Item
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Admin Sub-navigation */}
                <div className="flex border-b border-slate-200">
                  <button 
                    onClick={() => setAdminSubTab('overview')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${adminSubTab === 'overview' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('products')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${adminSubTab === 'products' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Product Control
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('members')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${adminSubTab === 'members' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Members
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('status')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${adminSubTab === 'status' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Order Status
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('plans')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${adminSubTab === 'plans' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Membership Plans
                  </button>
                </div>

                {adminSubTab === 'status' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Order Fulfillment</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Update tracking status for packing, courier handover, and delivery.</p>
                      </div>
                      <div className="w-full md:w-64">
                         <input 
                          type="text" 
                          placeholder="Quick find by Order #..."
                          value={orderSearchQuery}
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Order Number</th>
                              <th className="px-6 py-3">Customer</th>
                              <th className="px-6 py-3">Stage Status</th>
                              <th className="px-6 py-3 text-right">Fulfillment Actions</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm text-slate-600">
                            {orders.filter(o => o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase())).length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic text-[10px]">
                                  No orders pending fulfillment
                                </td>
                              </tr>
                            ) : (
                              orders
                                .filter(o => o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()))
                                .map((order) => (
                                <tr key={order.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-black text-slate-900 tracking-tighter text-lg">{order.orderNumber}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">Placed: {order.timestamp}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-700">{order.customerName}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">Invoice: {order.invoiceNumber}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                      order.status === 'delivery done' ? 'bg-green-500 text-white' :
                                      order.status === 'Hand over to the currier agent' ? 'bg-blue-500 text-white' :
                                      order.status === 'Packing done' ? 'bg-pink-500 text-white' :
                                      'bg-slate-200 text-slate-600'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => updateOrderStatus(order.id, 'Packing done')}
                                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${order.status === 'Packing done' ? 'bg-pink-500 text-white border-pink-500' : 'border-slate-100 text-slate-400 hover:border-pink-500 hover:text-pink-500'}`}
                                      >
                                        Pack
                                      </button>
                                      <button 
                                        onClick={() => updateOrderStatus(order.id, 'Hand over to the currier agent')}
                                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${order.status === 'Hand over to the currier agent' ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-100 text-slate-400 hover:border-blue-500 hover:text-blue-500'}`}
                                      >
                                        Courier
                                      </button>
                                      <button 
                                        onClick={() => updateOrderStatus(order.id, 'delivery done')}
                                        className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${order.status === 'delivery done' ? 'bg-green-500 text-white border-green-500' : 'border-slate-100 text-slate-400 hover:border-green-500 hover:text-green-500'}`}
                                      >
                                        Finish
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {adminSubTab === 'overview' && (
                   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">৳ 2,45,000</p>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Members</p>
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">{memberData.length}</p>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orders</p>
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">{orders.length}</p>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Items in Stock</p>
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">{productsList.length}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-8 text-white overflow-hidden relative">
                      <div className="relative z-10">
                        <h2 className="text-2xl font-black italic tracking-tighter mb-2">Operational Excellence</h2>
                        <p className="text-slate-400 text-sm max-w-md font-medium leading-relaxed">
                          All systems are performing within optimal parameters. Product catalogs and membership nodes are synchronized across the edge network.
                        </p>
                      </div>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    </div>
                   </motion.div>
                )}

                {adminSubTab === 'products' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Product Control</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Add, Edit Price, Update Pictures, or Delete Items</p>
                      </div>
                      <button 
                        onClick={() => handleOpenProductModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/10"
                      >
                        <Plus className="w-4 h-4" /> Add Product
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Catalog Item</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3">Price Unit</th>
                              <th className="px-6 py-3 text-right">Control Actions</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm text-slate-600">
                            {productsList.map((product) => (
                              <tr key={product.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black text-slate-900 truncate uppercase text-[11px] tracking-tight">{product.name}</p>
                                      <p className="text-[9px] text-slate-400 line-clamp-1 max-w-[250px] font-medium">{product.description}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">
                                    {product.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-black text-pink-600 font-mono">
                                  {formatPrice(product.price)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-3">
                                    <button 
                                      onClick={() => handleOpenProductModal(product)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-600 text-[10px] font-black uppercase tracking-wider"
                                      title="Edit Product Details & Price"
                                    >
                                      Edit / Price
                                    </button>
                                    <button 
                                      onClick={() => deleteProduct(product.id)}
                                      className="p-2 bg-pink-50 hover:bg-pink-500 hover:text-white rounded-lg transition-all text-pink-500"
                                      title="Delete Product from Catalog"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {adminSubTab === 'members' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Verified Member Database</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-3">Customer ID</th>
                              <th className="px-6 py-3">Contact Details</th>
                              <th className="px-6 py-3">Address Path</th>
                              <th className="px-6 py-3">Status</th>
                              <th className="px-6 py-3 text-right">Tier</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm text-slate-600">
                            {memberData.map((member) => (
                              <tr key={member.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-900">{member.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{member.id}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-[11px] font-black text-slate-700">{member.mobile}</p>
                                  <p className="text-[10px] text-slate-400">{member.email}</p>
                                </td>
                                <td className="px-6 py-4 text-[10px] max-w-[180px] truncate font-medium">{member.address}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                    member.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {member.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-900 uppercase tracking-tighter italic">{member.plan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {adminSubTab === 'plans' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-12 py-4"
                  >
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Active Membership Tiers</h2>
                      <p className="text-slate-500 text-xs font-medium">Control the plans and benefits offered to your elite community.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      {[
                        { name: 'Basic', price: 0, description: 'For occasional explorers', perks: ['Early access', 'Community board', 'Email updates'] },
                        { name: 'Prime', price: 2500, description: 'Our most popular choice', perks: ['15% off products', 'Dedicated support', 'Elite badge'], popular: true },
                        { name: 'Founder', price: 7500, description: 'For the inner circle', perks: ['30% off life-time', 'Private lounge', 'Beta tester access'] }
                      ].map((plan) => (
                        <div key={plan.name} className={`bg-white p-6 rounded-2xl border ${plan.popular ? 'border-pink-500 ring-2 ring-pink-500/10' : 'border-slate-200'} shadow-sm flex flex-col relative`}>
                          {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                              Popular
                            </div>
                          )}
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{plan.name}</h3>
                          <p className="text-[10px] text-slate-400 mt-1 mb-4 font-bold uppercase">{plan.description}</p>
                          <div className="mb-4">
                            <span className="text-2xl font-black text-slate-900">{formatPrice(plan.price)}</span>
                            <span className="text-slate-400 text-[10px] font-bold">/MO</span>
                          </div>
                          <ul className="space-y-3 mb-6 flex-grow">
                            {plan.perks.map((perk) => (
                              <li key={perk} className="text-[11px] text-slate-600 flex items-center gap-2 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-pink-600 transition-all">
                              Edit Plan
                            </button>
                            <button className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-pink-500 transition-colors">
                              <SettingsIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Product Add/Edit Modal */}
            <AnimatePresence>
              {isProductModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsProductModalOpen(false)}
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative bg-white shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </h2>
                      <button 
                        onClick={() => setIsProductModalOpen(false)}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleProductSubmit} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Product Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Organic Serum"
                            value={productForm.name}
                            onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Price (TK)</label>
                          <input 
                            type="number" 
                            required
                            placeholder="0"
                            value={productForm.price || ''}
                            onChange={(e) => setProductForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Category</label>
                        <div className="relative">
                          <select 
                            value={productForm.category}
                            onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          >
                            {categories.filter(c => c !== 'All Products').map(cat => (
                              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Plus className="w-4 h-4 rotate-45" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description</label>
                        <textarea 
                          required
                          placeholder="Tell customers about the product benefits..."
                          value={productForm.description}
                          onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Product Image</label>
                        <div className="flex gap-4">
                          <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-all cursor-pointer bg-slate-50 group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleImageFile}
                              className="hidden"
                            />
                            <Printer className="w-6 h-6 text-slate-300 mb-2 group-hover:text-pink-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Click to Browse</p>
                          </label>
                          {productForm.imageUrl && (
                            <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <img src={productForm.imageUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-slate-900/10 mt-4"
                      >
                        {editingProduct ? 'Save Changes' : 'Create Product'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {activeTab === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="max-w-4xl mx-auto"
              >
                <button 
                  onClick={() => setActiveTab('store')}
                  className="flex items-center gap-2 text-slate-400 hover:text-pink-500 text-xs font-bold uppercase tracking-widest mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Store
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-pink-100 rounded-lg">
                            <CreditCard className="w-5 h-5 text-pink-500" />
                          </div>
                          <h2 className="text-xl font-bold text-slate-900">Payment Options</h2>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No</p>
                          <p className="text-sm font-mono font-bold text-slate-900">{checkoutForm.invoiceNumber}</p>
                        </div>
                      </div>

                      <form onSubmit={handleOrderSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Date</label>
                            <input 
                              type="text" 
                              value={checkoutForm.date} 
                              disabled 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Customer Name</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Alex Johnson"
                              value={checkoutForm.name}
                              onChange={(e) => setCheckoutForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Customer Mobile Number</label>
                          <input 
                            type="tel" 
                            required
                            placeholder="01XXXXXXXXX"
                            value={checkoutForm.mobile}
                            onChange={(e) => setCheckoutForm(prev => ({ ...prev, mobile: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Customer Address</label>
                          <textarea 
                            required
                            placeholder="Street address, City, Postal Code"
                            value={checkoutForm.address}
                            onChange={(e) => setCheckoutForm(prev => ({ ...prev, address: e.target.value }))}
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Method</label>
                          <div className="relative">
                            <select 
                              value={checkoutForm.paymentMethod}
                              onChange={(e) => setCheckoutForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                            >
                              <option value="cash on delivery">Cash on Delivery</option>
                              <option value="Bkash">Bkash</option>
                              <option value="Nagad">Nagad</option>
                              <option value="Bank card">Bank Card</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <Plus className="w-4 h-4 rotate-45" />
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-4 bg-pink-500 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20 mt-4"
                        >
                          Complete Order
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Order Summary</h3>
                      <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                        {cart.map((item) => (
                          <div key={item.id} className="flex gap-3 text-[11px]">
                            <div className="w-12 h-12 bg-slate-50 rounded border border-slate-100 overflow-hidden shrink-0">
                              <img src={item.imageUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate">{item.name}</p>
                              <p className="text-slate-400 font-medium">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-black text-slate-900">{formatPrice(item.price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                          <span>Subtotal</span>
                          <span>{formatPrice(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-green-600 font-black">
                          <span>Shipping</span>
                          <span className="uppercase">Free</span>
                        </div>
                        <div className="flex justify-between pt-3 text-lg font-black text-slate-900">
                          <span className="text-[12px] uppercase">Total</span>
                          <span className="text-pink-600">{formatPrice(cartTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Order Placed Successfully!</h2>
                <p className="text-slate-500 mt-2 max-w-md font-medium">Thank you for choosing Natural Care of Beauty. Your order has been recorded.</p>
                
                <div className="mt-8 p-6 bg-white border border-slate-200 rounded-2xl w-full max-w-sm space-y-4">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Order Number</span>
                    <span className="text-slate-900 font-mono italic">{orderNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Invoice Number</span>
                    <span className="text-slate-900 font-mono italic">{checkoutForm.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest">Customer</span>
                    <span className="text-slate-900">{checkoutForm.name}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 w-full max-w-sm">
                  <button 
                    onClick={() => setShowSlip(true)}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-pink-500 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20"
                  >
                    <Printer className="w-4 h-4" /> Generate Delivery Slip
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('store')}
                    className="px-8 py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                  >
                    Continue Shopping
                  </button>
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
                    onClick={() => { setIsCartOpen(false); setActiveTab('checkout'); }}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* Delivery Slip Modal */}
        <AnimatePresence>
          {showSlip && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSlip(false)}
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{ width: '2.5in' }}
              >
                <div className="flex-1 overflow-auto bg-white p-4 text-[10px] text-slate-900 font-sans">
                  {/* Slip Header */}
                  <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                    <p className="font-black uppercase tracking-wider text-[12px]">Natural Care</p>
                    <p className="font-bold uppercase tracking-widest text-[8px] mb-1">of Beauty</p>
                    <p className="font-medium text-slate-500">DELIVERY SLIP</p>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between font-bold">
                      <span>ORDER #:</span>
                      <span>{orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>INVOICE:</span>
                      <span className="font-mono">{checkoutForm.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DATE:</span>
                      <span>{checkoutForm.date}</span>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                    <p className="font-black uppercase mb-1">Deliver To:</p>
                    <p className="font-bold underline">{checkoutForm.name}</p>
                    <p className="mt-1 leading-tight">{checkoutForm.address}</p>
                    <p className="mt-1 font-bold">PH: {checkoutForm.mobile}</p>
                  </div>

                  {/* Items Table */}
                  <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                    <p className="font-black uppercase mb-2 text-center">ORDER ITEMS</p>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-1">ITEM</th>
                          <th className="text-right py-1">QTY</th>
                        </tr>
                      </thead>
                      <tbody className="font-medium">
                        {lastOrderItems.map(item => (
                          <tr key={item.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 pr-2">{item.name}</td>
                            <td className="py-2 text-right">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total & Payment */}
                  <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                    <div className="flex justify-between font-black text-[12px] mb-1">
                      <span>TOTAL:</span>
                      <span>{formatPrice(lastOrderItems.reduce((s, i) => s + (i.price * i.quantity), 0))}</span>
                    </div>
                    <div className="flex justify-between uppercase font-bold text-[8px] text-slate-500 italic">
                      <span>PAYMENT:</span>
                      <span>{checkoutForm.paymentMethod}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-4 border-t border-dashed border-slate-300 mt-4">
                    <p className="font-bold italic">Thank you for your order!</p>
                  </div>
                </div>
                
                {/* Modal Controls - Hidden in print potentially, but for UI */}
                <div className="p-2 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 bg-slate-900 text-white py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                  >
                    Print
                  </button>
                  <button 
                    onClick={() => setShowSlip(false)}
                    className="flex-1 border border-slate-200 py-2 rounded font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

