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
  Truck,
  MessageSquare,
  Send,
  User,
  LogIn,
  BarChart3,
  Package,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { db, auth } from './lib/firebase';

// Firebase Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Ignore permission errors during logout transitions
  if (errMessage.includes('insufficient permissions') && !auth.currentUser) {
    console.warn('Suppressing permission error during sign-out transition');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'none',
      emailVerified: auth.currentUser?.emailVerified || false,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Types
const BRAND_LOGO = "/natural_care_logo_v3.png";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  timestamp: string;
}

interface ChatSession {
  id: string;
  customerName: string;
  lastMessage: string;
  unreadCount: number;
}
interface Product {
  id: string;
  name: string;
  price: number;
  buyingPrice: number;
  description: string;
  imageUrl: string;
  category: string;
  stock: number;
}

interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  order: number;
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
  customerMobile: string;
  customerAddress: string;
  paymentMethod: string;
  status: 'Pending' | 'Packing done' | 'Hand over to the currier agent' | 'delivery done';
  timestamp: string;
  deliveryCharge: number;
  totalAmount: number;
  items: Omit<CartItem, 'imageUrl'>[]; // Don't store large base64 images in every order document
  dateFields: {
    day: string;
    month: string;
    year: string;
  };
}

// Currency Formatter Utility
const formatPrice = (price: number) => {
  return `TK ${price.toLocaleString()}`;
};

const formatTimestamp = (isoString: string) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoString;
  }
};

// Image Compression Utility
const compressImage = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = dataUrl;
  });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'admin' | 'checkout' | 'success' | 'tracking'>('store');
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'products' | 'members' | 'status' | 'plans' | 'chat' | 'slips' | 'accounts' | 'ads'>('products');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    active: true,
    order: 0
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [showSlip, setShowSlip] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [slipDate, setSlipDate] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<Order | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleOpenSlip = (order: Order) => {
    setSelectedSlipOrder(order);
    setShowSlip(true);
  };
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState('');
  
  // Persist visitor ID across sessions
  const [visitorChatId] = useState(() => {
    const saved = localStorage.getItem('visitorChatId');
    if (saved) return saved;
    const newId = `visitor-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('visitorChatId', newId);
    return newId;
  });

  const [visitorMessages, setVisitorMessages] = useState<Message[]>([]);
  const [visitorSession, setVisitorSession] = useState<ChatSession | null>(null);

  // Members State
  const [memberData, setMemberData] = useState<Member[]>([]);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    address: '',
    mobile: '',
    location: 'Inside Dhaka',
    paymentMethod: 'cash on delivery',
    invoiceNumber: '',
    date: new Date().toLocaleDateString('en-GB')
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAdmin(u?.email === 'tanvir.khc@gmail.com');
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setAuthError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error("Login failed", error);
      setAuthError('Google login failed. Please try again.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setIsAuthModalOpen(false);
    } catch (error: any) {
      console.error("Auth failed", error);
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const logout = () => {
    auth.signOut();
    setEmail('');
    setPassword('');
  };

  // Fetch Ads
  useEffect(() => {
    const q = query(collection(db, 'advertisements'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Advertisement[] = [];
      snapshot.forEach(doc => {
        items.push({ ...doc.data(), id: doc.id } as Advertisement);
      });
      setAds(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'advertisements'));
    return () => unsubscribe();
  }, []);

  // Fetch Products
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => {
        items.push({ ...doc.data(), id: doc.id } as Product);
      });
      setProductsList(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));
    return () => unsubscribe();
  }, []);

  // Fetch Orders
  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      return;
    }
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach(doc => {
        items.push({ ...doc.data(), id: doc.id } as Order);
      });
      setOrders(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch Members
  useEffect(() => {
    if (!isAdmin) {
      setMemberData([]);
      return;
    }
    const q = query(collection(db, 'members'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Member[] = [];
      snapshot.forEach(doc => {
        items.push({ ...doc.data(), id: doc.id } as Member);
      });
      setMemberData(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch Chat Sessions (Admin Only)
  useEffect(() => {
    if (!isAdmin) {
      setSessions([]);
      return;
    }
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatSessions: ChatSession[] = [];
      snapshot.forEach(doc => {
        chatSessions.push({ ...doc.data(), id: doc.id } as ChatSession);
      });
      setSessions(chatSessions);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'chats'));
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch Messages for Active Admin Chat
  useEffect(() => {
    if (!isAdmin || !activeChatId) return;
    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => {
        msgs.push({ ...doc.data(), id: doc.id } as Message);
      });
      setMessages(prev => ({ ...prev, [activeChatId]: msgs }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `chats/${activeChatId}/messages`));
    return () => unsubscribe();
  }, [isAdmin, activeChatId]);

  // Fetch Messages for Visitor Chat
  useEffect(() => {
    const sessionId = user ? (isAdmin ? null : user.uid) : visitorChatId;
    if (!sessionId) return;

    const q = query(collection(db, `chats/${sessionId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => {
        msgs.push({ ...doc.data(), id: doc.id } as Message);
      });
      setVisitorMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `chats/${sessionId}/messages`));
    return () => unsubscribe();
  }, [user, visitorChatId, isAdmin]);

  // Initial connection test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (activeTab === 'checkout' && !checkoutForm.invoiceNumber) {
      const inv = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setCheckoutForm(prev => ({ ...prev, invoiceNumber: inv }));
    }
  }, [activeTab]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ordNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(ordNum);
    setLastOrderItems([...cart]);
    
    // Auto-add Membership
    const newMember: Omit<Member, 'id'> = {
      name: checkoutForm.name,
      mobile: checkoutForm.mobile,
      address: checkoutForm.address,
      email: user?.email || 'customer@example.com',
      plan: 'Basic',
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    
    try {
      await addDoc(collection(db, 'members'), newMember);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'members');
    }

    // Add to Orders
    const newOrderData: Omit<Order, 'id'> = {
      orderNumber: ordNum,
      invoiceNumber: checkoutForm.invoiceNumber,
      customerName: checkoutForm.name,
      customerMobile: checkoutForm.mobile,
      customerAddress: checkoutForm.address,
      paymentMethod: checkoutForm.paymentMethod,
      status: 'Pending',
      timestamp: new Date().toLocaleString(),
      deliveryCharge: deliveryCharge,
      totalAmount: totalAmount,
      items: cart.map(({ imageUrl, ...item }) => item), // Strip large images from orders
      dateFields: {
        day: new Date().getDate().toString(),
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString()
      }
    };
    
    try {
      const docRef = await addDoc(collection(db, 'orders'), newOrderData);
      setLastPlacedOrder({ ...newOrderData, id: docRef.id } as Order);

      // Decrement stock in Firestore
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        const currentProduct = productsList.find(p => p.id === item.id);
        if (currentProduct) {
          const newStock = Math.max(0, currentProduct.stock - item.quantity);
          await updateDoc(productRef, { stock: newStock });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }

    setActiveTab('success');
    setCart([]);
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  // Products State
  const [productsList, setProductsList] = useState<Product[]>([]);

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
    buyingPrice: 0,
    category: 'eye care',
    description: '',
    imageUrl: '',
    stock: 0
  });

  const handleAdImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setAdForm(prev => ({ ...prev, imageUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ ...product });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, buyingPrice: 0, category: 'eye care', description: '', imageUrl: '', stock: 0 });
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      try {
        const { id, ...data } = productForm as any;
        await updateDoc(doc(db, 'products', editingProduct.id), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `products/${editingProduct.id}`);
      }
    } else {
      try {
        const { id, ...data } = productForm as any;
        await addDoc(collection(db, 'products'), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'products');
      }
    }
    setIsProductModalOpen(false);
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleOpenAdModal = (ad: Advertisement | null = null) => {
    if (ad) {
      setEditingAd(ad);
      setAdForm({ title: ad.title, description: ad.description || '', imageUrl: ad.imageUrl, linkUrl: ad.linkUrl || '', active: ad.active, order: ad.order });
    } else {
      setEditingAd(null);
      setAdForm({ title: '', description: '', imageUrl: '', linkUrl: '', active: true, order: ads.length });
    }
    setIsAdModalOpen(true);
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAd) {
      try {
        await updateDoc(doc(db, 'advertisements', editingAd.id), adForm);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `advertisements/${editingAd.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'advertisements'), adForm);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'advertisements');
      }
    }
    setIsAdModalOpen(false);
  };

  const deleteAd = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      try {
        await deleteDoc(doc(db, 'advertisements', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `advertisements/${id}`);
      }
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setProductForm(prev => ({ ...prev, imageUrl: compressed }));
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

  const handleSendVisitorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const sessionId = user ? user.uid : visitorChatId;
    const senderName = user?.email || 'Visitor';

    const msg = {
      text: newMessage,
      senderId: sessionId,
      senderName,
      isAdmin: false,
      timestamp: new Date().toISOString()
    };

    const sessionData = {
      customerName: senderName,
      lastMessage: newMessage,
      lastMessageAt: new Date().toISOString(),
      visitorId: sessionId,
      unreadCount: 1 // Admin unread
    };
    
    try {
      // Create/Update session
      await setDoc(doc(db, 'chats', sessionId), sessionData, { merge: true });
      // Add message
      await addDoc(collection(db, `chats/${sessionId}/messages`), msg);
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${sessionId}`);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    
    const msg = {
      text: newMessage,
      senderId: 'admin',
      senderName: 'Admin',
      isAdmin: true,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Update session last message
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: newMessage,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0
      });
      // Add message
      await addDoc(collection(db, `chats/${activeChatId}/messages`), msg);
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${activeChatId}`);
    }
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
  const deliveryCharge = cart.length > 0 ? (checkoutForm.location === 'Inside Dhaka' ? 80 : 120) : 0;
  const totalAmount = cartTotal + deliveryCharge;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);



  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden text-[13px]">
      {/* Sidebar - Sleek Theme */}
      <aside className="w-64 bg-slate-900 flex flex-col text-white shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center p-1 shadow-lg group overflow-hidden border border-white/10 shrink-0">
              <img 
                src={BRAND_LOGO} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-pink-500 flex items-center justify-center font-bold text-white text-lg">B</div>';
                }}
              />
            </div>
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

          {isAdmin && (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-6 pb-2">Administration</div>
              
              <button 
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-medium transition-colors ${activeTab === 'admin' ? 'bg-pink-600/10 text-pink-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Dashboard
              </button>
            </>
          )}
        </nav>

        <div className="p-4 mt-auto">
          {user ? (
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">{isAdmin ? 'Administrator' : 'Customer'}</div>
              <div className="text-xs font-medium text-white truncate mb-1">{user.email}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">{isAdmin ? 'Verified' : 'Member'}</span>
                </div>
                <button 
                  onClick={logout}
                  className="text-[9px] font-black text-pink-500 uppercase tracking-widest hover:text-pink-400"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" /> Sign In
            </button>
          )}
          
          {!isAdmin && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center">
              <button 
                onClick={() => setActiveTab('admin')}
                className="text-slate-700 hover:text-slate-500 transition-colors"
                title="Management"
              >
                <ShieldCheck className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-50">
              <img 
                src={BRAND_LOGO} 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
              />
            </div>
            <span className="font-bold text-slate-900 border-l border-slate-100 pl-4">Natural Care of Beauty</span>
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

                {/* Advertisement / Offers Section */}
                {ads.filter(a => a.active).length > 0 && (
                  <div className="relative overflow-hidden rounded-3xl bg-slate-900 h-[300px] mb-8">
                    <div className="flex h-full transition-transform duration-500">
                      {ads.filter(a => a.active).map((ad) => (
                        <div key={ad.id} className="min-w-full h-full relative group">
                          <img 
                            src={ad.imageUrl} 
                            alt={ad.title}
                            className="w-full h-full object-cover opacity-60"
                          />
                          <div className="absolute inset-0 flex flex-col justify-center px-12 text-white">
                            <motion.span 
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-400 mb-2"
                            >
                              Exclusive Offer
                            </motion.span>
                            <motion.h2 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              className="text-4xl font-black italic tracking-tighter mb-4 max-w-lg leading-none"
                            >
                              {ad.title}
                            </motion.h2>
                            <motion.p 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              className="text-slate-300 text-sm font-medium max-w-sm mb-6"
                            >
                              {ad.description}
                            </motion.p>
                            {ad.linkUrl && (
                              <button className="w-fit px-8 py-3 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20">
                                Shop Now
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                          <div>
                            <span className="text-slate-900 font-black text-base block">{formatPrice(product.price)}</span>
                          </div>
                          <button 
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                            className={`p-2.5 rounded-lg transition-all shadow-lg ${
                              product.stock > 0 
                                ? 'bg-slate-900 text-white hover:bg-pink-500 shadow-slate-900/5 hover:shadow-pink-500/20' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
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

            {/* Admin View Guard */}
            {activeTab === 'admin' && !isAdmin && (
              <motion.div
                key="admin-denied"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto py-20 text-center"
              >
                <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500 ring-8 ring-pink-50 shadow-xl">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">Restricted Access</h2>
                <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">
                  The Administration Control Panel is only accessible to authorized personnel. 
                  Please sign in with administrator credentials to continue.
                </p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
                >
                  <LogIn className="w-4 h-4" /> Sign In as Admin
                </button>
                <button 
                  onClick={() => setActiveTab('store')}
                  className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Return to Store
                </button>
              </motion.div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col md:flex-row gap-8"
              >
                {/* Admin Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0 space-y-1">
                  <div className="px-4 py-3 mb-2 bg-slate-900 rounded-xl">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</h2>
                    <p className="text-white text-xs font-bold italic">Admin Panel</p>
                  </div>
                  
                  {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'accounts', label: 'Accounts', icon: BarChart3 },
                    { id: 'products', label: 'Product Control', icon: Package },
                    { id: 'members', label: 'Members', icon: Users },
                    { id: 'status', label: 'Order Status', icon: Truck },
                    { id: 'ads', label: 'Home Advertisements', icon: Star },
                    { id: 'plans', label: 'Membership Plans', icon: CreditCard },
                    { id: 'chat', label: 'Live Chat', icon: MessageSquare, badge: sessions.some(s => s.unreadCount > 0) },
                    { id: 'slips', label: 'Delivery Slips', icon: Printer },
                  ].map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => setAdminSubTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        adminSubTab === item.id 
                          ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' 
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm"></span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Admin Main Content area */}
                <div className="flex-1">
                  {adminSubTab === 'ads' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div>
                          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Home Advertisements</h1>
                          <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Manage carousel banners and offers on the home page</p>
                        </div>
                        <button 
                          onClick={() => handleOpenAdModal()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/10"
                        >
                          <Plus className="w-4 h-4" /> Add Advertisement
                        </button>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="text-[10px] text-slate-400 font-bold uppercase bg-white border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-3">Banner</th>
                                <th className="px-6 py-3">Title & Info</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Order</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm text-slate-600">
                              {ads.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic text-[10px]">
                                    No advertisements added yet
                                  </td>
                                </tr>
                              ) : (
                                ads.map((ad) => (
                                  <tr key={ad.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="w-24 h-12 bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                                        <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{ad.title}</p>
                                      <p className="text-[9px] text-slate-400 line-clamp-1 font-medium">{ad.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                        ad.active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {ad.active ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-900 font-mono italic">#{ad.order}</td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-3">
                                        <button 
                                          onClick={() => handleOpenAdModal(ad)}
                                          className="p-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg transition-all text-slate-600"
                                        >
                                          <SettingsIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => deleteAd(ad.id)}
                                          className="p-2 bg-pink-50 hover:bg-pink-500 hover:text-white rounded-lg transition-all text-pink-500"
                                        >
                                          <X className="w-4 h-4" />
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
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">
                          {formatPrice(orders.reduce((acc, order) => acc + order.totalAmount, 0))}
                        </p>
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
                        <p className="text-xl font-black text-slate-900 font-mono tracking-tighter">
                          {productsList.reduce((acc, p) => acc + p.stock, 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                          <Check className="w-4 h-4 text-pink-500" /> Order Fulfillment Status
                        </h3>
                        <div className="space-y-4">
                          {[
                            { label: 'Pending Orders', count: orders.filter(o => o.status === 'Pending').length, color: 'bg-slate-100 text-slate-600' },
                            { label: 'Packing Completed', count: orders.filter(o => o.status === 'Packing done').length, color: 'bg-pink-100 text-pink-600' },
                            { label: 'Handed over to Courier', count: orders.filter(o => o.status === 'Hand over to the currier agent').length, color: 'bg-blue-100 text-blue-600' },
                            { label: 'Delivery Completed', count: orders.filter(o => o.status === 'delivery done').length, color: 'bg-green-100 text-green-600' }
                          ].map((stat) => (
                            <div key={stat.label} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 hover:border-slate-100 transition-colors">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                              <span className={`px-3 py-1 rounded-full text-[12px] font-black ${stat.color}`}>{stat.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-2xl p-8 text-white overflow-hidden relative flex flex-col justify-center">
                        <div className="relative z-10">
                          <h2 className="text-2xl font-black italic tracking-tighter mb-2">Operational Excellence</h2>
                          <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
                            All systems are performing within optimal parameters. Product catalogs and membership nodes are synchronized across the edge network.
                          </p>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      </div>
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
                              <th className="px-6 py-3 text-center">Stock</th>
                              <th className="px-6 py-3">Category</th>
                              <th className="px-6 py-3">Buying Price</th>
                              <th className="px-6 py-3">Selling Price</th>
                              <th className="px-6 py-3">Profit</th>
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
                                <td className="px-6 py-4 text-center">
                                  <span className={`font-black text-sm ${product.stock > 5 ? 'text-slate-900' : 'text-pink-600'}`}>
                                    {product.stock}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">
                                    {product.category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-black text-slate-400 font-mono">
                                  {formatPrice(product.buyingPrice || 0)}
                                </td>
                                <td className="px-6 py-4 font-black text-pink-600 font-mono">
                                  {formatPrice(product.price)}
                                </td>
                                <td className="px-6 py-4 font-black text-green-600 font-mono">
                                  {formatPrice(product.price - (product.buyingPrice || 0))}
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

                {adminSubTab === 'chat' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[600px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex">
                    {/* Sessions Sidebar */}
                    <div className="w-80 border-r border-slate-100 flex flex-col">
                      <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Conversations</h3>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {sessions.map((session) => (
                          <button 
                            key={session.id}
                            onClick={() => setActiveChatId(session.id)}
                            className={`w-full p-4 flex items-start gap-3 border-b border-slate-50 transition-all ${activeChatId === session.id ? 'bg-pink-50/50' : 'hover:bg-slate-50'}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex justify-between items-start mb-0.5">
                                <p className={`text-[12px] font-black uppercase tracking-tight truncate ${activeChatId === session.id ? 'text-pink-600' : 'text-slate-900'}`}>
                                  {session.customerName}
                                </p>
                                {session.unreadCount > 0 && (
                                  <span className="bg-pink-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {session.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate font-medium">{session.lastMessage}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-slate-50/30">
                      {activeChatId ? (
                        <>
                          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                <User className="w-4 h-4 text-pink-500" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                                  {sessions.find(s => s.id === activeChatId)?.customerName}
                                </p>
                                <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1 h-1 bg-green-500 rounded-full"></span> Online
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 overflow-auto p-6 space-y-4">
                            {messages[activeChatId]?.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm ${
                                  msg.isAdmin ? 'bg-pink-500 text-white shadow-pink-500/10' : 'bg-white text-slate-700 border border-slate-100'
                                }`}>
                                  {msg.text}
                                  <p className={`text-[9px] mt-1 ${msg.isAdmin ? 'text-pink-100' : 'text-slate-400'}`}>{formatTimestamp(msg.timestamp)}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <form onSubmit={handleSendAdminMessage} className="p-4 bg-white border-t border-slate-100">
                            <div className="flex gap-3">
                              <input 
                                type="text" 
                                placeholder="Start typing your response..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                              />
                              <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-pink-600 transition-all flex items-center gap-2">
                                <Send className="w-3.5 h-3.5" /> Send
                              </button>
                            </div>
                          </form>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select a Conversation</h3>
                          <p className="text-[11px] text-slate-500 max-w-xs mt-1 font-medium italic">
                            Choose a customer from the sidebar to view their message history and start a live session.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {adminSubTab === 'slips' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Digital Delivery Slips</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Automated record of all generated transaction slips.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <input 
                          type="date"
                          value={slipDate}
                          onChange={(e) => setSlipDate(e.target.value)}
                          className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                        />

                        <input 
                          type="text" 
                          placeholder="Search Slip ID / Customer..."
                          className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none min-w-[200px]"
                          onChange={(e) => setOrderSearchQuery(e.target.value)}
                        />

                        {(slipDate || orderSearchQuery) && (
                          <button 
                            onClick={() => {
                              setSlipDate('');
                              setOrderSearchQuery('');
                            }}
                            className="p-2 text-pink-500 hover:bg-pink-50 rounded-xl transition-all"
                            title="Clear Filters"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {orders.filter(o => {
                        const matchesSearch = o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                                             o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase());
                        
                        let matchesDate = true;
                        if (slipDate) {
                          const [y, m, d] = slipDate.split('-');
                          matchesDate = o.dateFields?.day === parseInt(d).toString() && 
                                        o.dateFields?.month === parseInt(m).toString() && 
                                        o.dateFields?.year === y;
                        }

                        return matchesSearch && matchesDate;
                      }).length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                          <Printer className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No slips found matching your filters</p>
                        </div>
                      ) : (
                        orders
                          .filter(o => {
                            const matchesSearch = o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                                                 o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase());
                            
                            let matchesDate = true;
                            if (slipDate) {
                              const [y, m, d] = slipDate.split('-');
                              matchesDate = o.dateFields?.day === parseInt(d).toString() && 
                                            o.dateFields?.month === parseInt(m).toString() && 
                                            o.dateFields?.year === y;
                            }
                            return matchesSearch && matchesDate;
                          })
                          .map((order) => (
                          <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-pink-200 transition-all group">
                            <div className="flex justify-between items-start mb-6">
                              <div className="bg-slate-900 p-2 rounded-lg">
                                <ShoppingBag className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{order.timestamp}</span>
                            </div>
                            
                            <div className="space-y-1 mb-6">
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.customerName}</h3>
                              <p className="text-[10px] text-pink-600 font-mono font-bold tracking-tighter">SLIP ID: {order.invoiceNumber}</p>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Amount</div>
                              <div className="text-sm font-black text-slate-900 font-mono tracking-tighter">{formatPrice(order.totalAmount)}</div>
                            </div>

                            <button 
                              onClick={() => handleOpenSlip(order)}
                              className="mt-6 w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-900 hover:text-white transition-all group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-500 flex items-center justify-center gap-2"
                            >
                              <Printer className="w-3.5 h-3.5" /> View Printed Slip
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {adminSubTab === 'accounts' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Accounts & Statistics</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Financial performance and inventory valuation reports.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                          <input 
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                          <input 
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
                          />
                        </div>
                        <div className="flex items-end">
                          <button 
                            onClick={() => {
                              const start = new Date(fromDate);
                              const end = new Date(fromDate);
                              end.setHours(23, 59, 59, 999);

                              const dayOrders = orders.filter(order => {
                                const orderDate = new Date(order.timestamp);
                                return orderDate >= start && orderDate <= end;
                              });

                              if (dayOrders.length === 0) return;

                              const headers = ['Order #', 'Timestamp', 'Customer', 'Items Count', 'Total', 'Invoice #'];
                              const rows = dayOrders.map(o => [
                                o.orderNumber,
                                o.timestamp,
                                o.customerName,
                                o.items.length,
                                o.totalAmount,
                                o.invoiceNumber
                              ]);

                              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `daily_sales_${fromDate}.csv`;
                              a.click();
                            }}
                            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" /> Download CSV
                          </button>

                          <button 
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (!printWindow) return;

                              const start = new Date(fromDate);
                              const end = new Date(fromDate);
                              end.setHours(23, 59, 59, 999);

                              const dayOrders = orders.filter(order => {
                                const orderDate = new Date(order.timestamp);
                                return orderDate >= start && orderDate <= end;
                              });

                              let totalSales = 0;
                              let totalCost = 0;
                              let itemsSold = 0;
                              
                              const categorySummary: Record<string, number> = {};

                              dayOrders.forEach(order => {
                                totalSales += order.totalAmount;
                                order.items.forEach(item => {
                                  itemsSold += item.quantity;
                                  totalCost += (item.buyingPrice || 0) * item.quantity;
                                  categorySummary[item.category] = (categorySummary[item.category] || 0) + item.totalPrice;
                                });
                              });

                              const html = `
                                <html>
                                  <head>
                                    <title>Daily Sales Closing - ${fromDate}</title>
                                    <style>
                                      body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; }
                                      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
                                      .title { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
                                      .date { font-size: 14px; margin-top: 5px; }
                                      .stats { margin-bottom: 20px; }
                                      .stat-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ccc; }
                                      .stat-label { font-weight: bold; text-transform: uppercase; }
                                      .table { w-full border-collapse: collapse; margin-top: 20px; width: 100%; }
                                      .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                                      .table th { background: #f0f0f0; text-transform: uppercase; }
                                      .footer { margin-top: 30px; text-align: center; font-size: 10px; border-top: 2px dashed #000; padding-top: 10px; }
                                      @media print { .no-print { display: none; } }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <div style="width: 200px; height: 200px; border-radius: 50%; overflow: hidden; margin: 0 auto 20px; border: 2px solid #0f172a; display: flex; align-items: center; justify-content: center;">
                                        <img src="${BRAND_LOGO}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover;" />
                                      </div>
                                      <h1 class="title">Daily Sales Closing Report</h1>
                                      <div class="date">DATE: ${new Date(fromDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>

                                    <div class="stats">
                                      <div class="stat-item">
                                        <span class="stat-label">Total Transactions</span>
                                        <span>${dayOrders.length} ORDERS</span>
                                      </div>
                                      <div class="stat-item">
                                        <span class="stat-label">Total Items Sold</span>
                                        <span>${itemsSold} PCS</span>
                                      </div>
                                      <div class="stat-item">
                                        <span class="stat-label">Gross Revenue</span>
                                        <span>৳ ${totalSales.toLocaleString()}</span>
                                      </div>
                                      <div class="stat-item">
                                        <span class="stat-label">Total COGS (Cost)</span>
                                        <span>৳ ${totalCost.toLocaleString()}</span>
                                      </div>
                                      <div class="stat-item" style="border-bottom: 2px solid #000; margin-top: 5px; padding-top: 10px;">
                                        <span class="stat-label">Net Daily Profit</span>
                                        <span style="font-size: 18px; font-weight: 900;">৳ ${(totalSales - totalCost).toLocaleString()}</span>
                                      </div>
                                    </div>

                                    <h3>ORDER DISPATCH LOG</h3>
                                    <table class="table">
                                      <thead>
                                        <tr>
                                          <th>Time</th>
                                          <th>Order #</th>
                                          <th>Customer</th>
                                          <th>Items</th>
                                          <th>Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${dayOrders.map(o => `
                                          <tr>
                                            <td>${new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>${o.orderNumber}</td>
                                            <td>${o.customerName}</td>
                                            <td>${o.items.length}</td>
                                            <td>৳ ${o.totalAmount.toLocaleString()}</td>
                                          </tr>
                                        `).join('')}
                                      </tbody>
                                    </table>

                                    <div class="footer">
                                      <p>GENERATED ON: ${new Date().toLocaleString()}</p>
                                      <p>*** END OF DAILY CLOSING RECORD ***</p>
                                    </div>
                                    <script>window.print();</script>
                                  </body>
                                </html>
                              `;
                              printWindow.document.write(html);
                              printWindow.document.close();
                            }}
                            className="bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-pink-500 hover:border-pink-500 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
                          >
                            <Printer className="w-3.5 h-3.5" /> Daily Sales Report
                          </button>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const data = (() => {
                        const start = new Date(fromDate);
                        const end = new Date(toDate);
                        end.setHours(23, 59, 59, 999);

                        const filteredOrders = orders.filter(order => {
                          const orderDate = new Date(order.timestamp);
                          return orderDate >= start && orderDate <= end;
                        });

                        let totalSales = 0;
                        let totalBuyingCost = 0;
                        let itemsSold = 0;

                        filteredOrders.forEach(order => {
                          totalSales += order.totalAmount;
                          order.items.forEach(item => {
                            itemsSold += item.quantity;
                            totalBuyingCost += (item.buyingPrice || 0) * item.quantity;
                          });
                        });

                        const currentStockCostValue = productsList.reduce((acc, p) => acc + (p.stock * (p.buyingPrice || 0)), 0);
                        const currentStockSalesValue = productsList.reduce((acc, p) => acc + (p.stock * p.price), 0);
                        const totalInventoryItems = productsList.reduce((acc, p) => acc + p.stock, 0);

                        return {
                          totalSales,
                          totalBuyingCost,
                          totalProfit: totalSales - totalBuyingCost,
                          itemsSold,
                          currentStockCostValue,
                          currentStockSalesValue,
                          totalInventoryItems,
                          orderCount: filteredOrders.length
                        };
                      })();

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                              <p className="text-2xl font-black text-slate-900 font-mono italic tracking-tighter">{formatPrice(data.totalSales)}</p>
                              <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">{data.orderCount} Orders Processed</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Buying Cost</p>
                              <p className="text-2xl font-black text-slate-400 font-mono italic tracking-tighter">{formatPrice(data.totalBuyingCost)}</p>
                              <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase">{data.itemsSold} Items Sold</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-pink-500 shadow-xl shadow-pink-500/5 ring-1 ring-pink-500/20">
                              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Estimated Profit</p>
                              <p className="text-2xl font-black text-pink-600 font-mono italic tracking-tighter">{formatPrice(data.totalProfit)}</p>
                              <p className="text-[9px] text-pink-400 mt-2 font-bold uppercase">Margin: {data.totalSales > 0 ? ((data.totalProfit / data.totalSales) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/10">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Stock Value</p>
                              <p className="text-2xl font-black text-white font-mono italic tracking-tighter">{formatPrice(data.currentStockCostValue)}</p>
                              <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase">{data.totalInventoryItems} Units in Inventory</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Inventory Health Report</h3>
                               </div>
                               <div className="p-6">
                                 <div className="space-y-4">
                                   <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold uppercase tracking-wider">Total Units Available</span>
                                     <span className="font-black text-slate-900">{data.totalInventoryItems} Pcs</span>
                                   </div>
                                   <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold uppercase tracking-wider">Inventory Cost Value (Buying)</span>
                                     <span className="font-black font-mono text-slate-600">{formatPrice(data.currentStockCostValue)}</span>
                                   </div>
                                   <div className="flex justify-between items-center text-xs">
                                     <span className="text-slate-500 font-bold uppercase tracking-wider">Potential Sales Value</span>
                                     <span className="font-black font-mono text-pink-600">{formatPrice(data.currentStockSalesValue)}</span>
                                   </div>
                                   <div className="pt-4 border-t border-slate-50">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 font-black uppercase tracking-widest">Unrealized Profit Margin</span>
                                        <span className="font-black font-mono text-green-600">{formatPrice(data.currentStockSalesValue - data.currentStockCostValue)}</span>
                                      </div>
                                   </div>
                                 </div>
                               </div>
                             </div>

                             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Performance Insights</h3>
                               </div>
                               <div className="p-6 flex flex-col justify-center h-full">
                                  {data.orderCount > 0 ? (
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-full border-4 border-pink-500 border-t-slate-100 flex items-center justify-center">
                                          <span className="text-[10px] font-black text-slate-900">{Math.round((data.totalProfit / (data.totalSales || 1)) * 100)}%</span>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Margin</p>
                                          <p className="text-sm font-bold text-slate-700 italic">Profit after cost of goods sold</p>
                                        </div>
                                      </div>
                                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-[11px] text-slate-500 font-medium">
                                        "You have cleared {data.itemsSold} items in this period. Your average basket value is {formatPrice(Math.round(data.totalSales / (data.orderCount || 1)))}."
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-10 text-slate-400">
                                      <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                      <p className="text-[10px] font-bold uppercase tracking-widest">Not enough data for this period</p>
                                    </div>
                                  )}
                               </div>
                             </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                              <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Itemized Stock Value Breakdown</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Detailed inventory levels and valuation per product.</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Cost:</span>
                                <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{formatPrice(data.currentStockCostValue)}</span>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/50">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic">Product Entity</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic">Category</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic text-right">Units in Stock</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic text-right">Buying Price</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic text-right">Selling Price</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 italic text-right bg-pink-50/30">Total Value</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {productsList.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="px-6 py-4">
                                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-pink-600 transition-colors">{product.name}</div>
                                      </td>
                                      <td className="px-6 py-4 text-nowrap">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-2 py-1 rounded-md border border-slate-100">{product.category}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className={`text-xs font-black font-mono flex flex-col items-end ${product.stock <= 5 ? 'text-pink-500' : 'text-slate-700'}`}>
                                          <span>{product.stock} PCS</span>
                                          {product.stock <= 5 && <span className="text-[8px] uppercase tracking-tighter opacity-70">Low Stock Alert</span>}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{formatPrice(product.buyingPrice || 0)}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-pink-500/60 font-mono tracking-tighter">{formatPrice(product.price)}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right bg-pink-50/10">
                                        <div className="flex flex-col items-end">
                                          <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">
                                            {formatPrice(product.stock * (product.buyingPrice || 0))}
                                          </span>
                                          <span className="text-[8px] font-black text-green-600 uppercase tracking-[0.1em]">
                                            Potential: {formatPrice(product.stock * product.price)}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
                </div>
              </motion.div>
            )}

            {/* Product Add/Edit Modal */}
            <AnimatePresence>
              {isAdModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsAdModalOpen(false)}
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
                        {editingAd ? 'Edit Advertisement' : 'Add Advertisement'}
                      </h2>
                      <button 
                        onClick={() => setIsAdModalOpen(false)}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleAdSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Title</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Summer Special Offer"
                          value={adForm.title}
                          onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description</label>
                        <textarea 
                          placeholder="e.g. Get 20% off on all eye care products..."
                          value={adForm.description}
                          onChange={(e) => setAdForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Display Order</label>
                          <input 
                            type="number" 
                            value={adForm.order}
                            onChange={(e) => setAdForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Link URL (Optional)</label>
                          <input 
                            type="text" 
                            placeholder="e.g. /offers"
                            value={adForm.linkUrl}
                            onChange={(e) => setAdForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="adActive"
                          checked={adForm.active}
                          onChange={(e) => setAdForm(prev => ({ ...prev, active: e.target.checked }))}
                          className="w-4 h-4 text-pink-500 border-slate-300 rounded focus:ring-pink-500"
                        />
                        <label htmlFor="adActive" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">Show on Home Page</label>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Advertisement Image</label>
                        <div className="flex gap-4">
                          <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-pink-300 transition-all cursor-pointer bg-slate-50 group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleAdImageFile}
                              className="hidden"
                            />
                            <Download className="w-6 h-6 text-slate-300 mb-2 group-hover:text-pink-400" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Click to Browse</p>
                          </label>
                          {adForm.imageUrl && (
                            <div className="w-32 h-20 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <img src={adForm.imageUrl} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-slate-900/10 mt-4"
                      >
                        {editingAd ? 'Save Changes' : 'Create Advertisement'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}

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

                    <form onSubmit={handleProductSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
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
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Stock Quantity</label>
                                <input 
                                  type="number" 
                                  required
                                  placeholder="0"
                                  value={productForm.stock || ''}
                                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Buying Price (TK)</label>
                          <input 
                            type="number" 
                            required
                            placeholder="0"
                            value={productForm.buyingPrice || ''}
                            onChange={(e) => setProductForm(prev => ({ ...prev, buyingPrice: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Selling Price (TK)</label>
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
              !user ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto py-12"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/50">
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-pink-50 shadow-xl mb-6 flex items-center justify-center bg-white">
                        <img 
                          src={BRAND_LOGO} 
                          alt="Natural Care Logo" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                        <LogIn className="w-8 h-8 text-pink-500" />
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic text-center">
                      {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-slate-500 font-medium mb-8 text-center text-xs">
                      {authMode === 'login' ? 'Login to continue your purchase' : 'Sign up to shop and track your orders'}
                    </p>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <input 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          required
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                        <input 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                          required
                        />
                      </div>

                      {authError && (
                        <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider bg-pink-50 p-2 rounded-lg text-center animate-shake">
                          {authError}
                        </p>
                      )}

                      <button 
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                      >
                        {authMode === 'login' ? 'Login' : 'Sign Up'}
                      </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                      <div className="h-px bg-slate-100 flex-1"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
                      <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <button 
                      onClick={login}
                      className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:border-pink-500 hover:text-pink-500 transition-all flex items-center justify-center gap-3"
                    >
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                      Google Login
                    </button>

                    <div className="mt-8 text-center">
                      <button 
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-pink-500 transition-all"
                      >
                        {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                      </button>
                    </div>

                    <button 
                      onClick={() => setActiveTab('store')}
                      className="w-full mt-4 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      Back to Shopping
                    </button>
                  </div>
                </motion.div>
              ) : (
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
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Location (Delivery Charge)</label>
                          <div className="relative">
                            <select 
                              value={checkoutForm.location}
                              onChange={(e) => setCheckoutForm(prev => ({ ...prev, location: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                            >
                              <option value="Inside Dhaka">Inside Dhaka City (80 TK)</option>
                              <option value="Outside Dhaka">Outside Dhaka (120 TK)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <Plus className="w-4 h-4 rotate-45" />
                            </div>
                          </div>
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
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <Plus className="w-4 h-4 rotate-45" />
                            </div>
                          </div>
                        </div>

                        {(checkoutForm.paymentMethod === 'Bkash' || checkoutForm.paymentMethod === 'Nagad') && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 p-4 rounded-xl border flex items-center gap-4 ${checkoutForm.paymentMethod === 'Bkash' ? 'bg-pink-50 border-pink-100' : 'bg-orange-50 border-orange-100'}`}
                          >
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                              <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-black text-[10px] ${checkoutForm.paymentMethod === 'Bkash' ? 'bg-pink-500' : 'bg-orange-500'}`}>
                                {checkoutForm.paymentMethod}
                              </div>
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${checkoutForm.paymentMethod === 'Bkash' ? 'text-pink-500' : 'text-orange-500'}`}>Send Money to</p>
                              <p className="text-sm font-black text-slate-900">Tanvir Hasan</p>
                              <p className={`text-sm font-black ${checkoutForm.paymentMethod === 'Bkash' ? 'text-pink-600' : 'text-orange-600'}`}>01670535171</p>
                            </div>
                          </motion.div>
                        )}

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
                        <div className="flex justify-between text-[11px] font-bold text-slate-900 border-t border-slate-50 pt-3">
                          <span className="text-slate-500 font-medium">Delivery ({checkoutForm.location})</span>
                          <span>{formatPrice(deliveryCharge)}</span>
                        </div>
                        <div className="flex justify-between pt-3 text-lg font-black text-slate-900 border-t border-slate-50">
                          <span className="text-[12px] uppercase">Total</span>
                          <span className="text-pink-600">{formatPrice(totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              )
            )}

            {activeTab === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-green-50 shadow-2xl mb-8 flex items-center justify-center bg-white">
                  <img 
                    src={BRAND_LOGO} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
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
                  <div className="flex justify-between text-[11px] font-bold pt-2 border-t border-slate-50">
                    <span className="text-slate-400 uppercase tracking-widest">Total Paid</span>
                    <span className="text-pink-600 font-black">{formatPrice(totalAmount)}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 w-full max-w-sm">
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
                    <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-50 shrink-0 shadow-inner">
                      <img 
                        src={BRAND_LOGO} 
                        alt="Logo" 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    </div>
                    <ShoppingBag className="w-5 h-5 text-pink-500" />
                    <h2 className="text-xl font-bold text-slate-900 border-l border-slate-100 pl-3 leading-none">Your Cart</h2>
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
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="font-black text-slate-900 uppercase text-[12px]">Total Amount</span>
                      <span className="font-black text-pink-600 text-lg">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                  <button 
                    disabled={cart.length === 0}
                    onClick={() => {
                      if (!user) {
                        login();
                      } else {
                        setIsCartOpen(false);
                        setActiveTab('checkout');
                      }
                    }}
                    className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-[0.3em] transition-all shadow-xl ${
                      !user 
                        ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/20' 
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10'
                    } disabled:bg-slate-200 disabled:cursor-not-allowed`}
                  >
                    {!user ? 'Login to Checkout' : 'Proceed to Checkout'}
                  </button>
                  {!user && cart.length > 0 && (
                    <p className="text-center text-[10px] text-pink-500 font-bold uppercase tracking-wider mt-3 animate-pulse">
                      Please login to place your order
                    </p>
                  )}
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
                  <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-slate-900 mb-4 flex items-center justify-center">
                      <img 
                        src={BRAND_LOGO} 
                        alt="Brand Logo" 
                        className="w-full h-full object-cover grayscale brightness-50"
                      />
                    </div>
                    <p className="font-black uppercase tracking-wider text-[12px]">Natural Care</p>
                    <p className="font-bold uppercase tracking-widest text-[8px] mb-1">of Beauty</p>
                    <p className="font-medium text-slate-500">DELIVERY SLIP</p>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between font-bold">
                      <span>ORDER #:</span>
                      <span>{selectedSlipOrder?.orderNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>INVOICE:</span>
                      <span className="font-mono">{selectedSlipOrder?.invoiceNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DATE:</span>
                      <span>{selectedSlipOrder?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="border-t border-dashed border-slate-300 pt-4 mb-4">
                    <p className="font-black uppercase mb-1">Deliver To:</p>
                    <p className="font-bold underline">{selectedSlipOrder?.customerName || 'N/A'}</p>
                    <p className="mt-1 leading-tight">{selectedSlipOrder?.customerAddress || 'N/A'}</p> 
                    <p className="mt-1 font-bold">PH: {selectedSlipOrder?.customerMobile || 'N/A'}</p>
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
                        {(selectedSlipOrder?.items || []).map(item => (
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
                    <div className="flex justify-between font-bold mb-1">
                      <span>SUBTOTAL:</span>
                      <span>{formatPrice((selectedSlipOrder?.items || []).reduce((s, i) => s + (i.price * i.quantity), 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>DELIVERY:</span>
                      <span>{formatPrice(selectedSlipOrder?.deliveryCharge || 0)}</span>
                    </div>
                    <div className="flex justify-between font-black text-[12px] border-t border-slate-200 pt-1 mt-1 mb-1">
                      <span>TOTAL:</span>
                      <span>{formatPrice(selectedSlipOrder?.totalAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between uppercase font-bold text-[8px] text-slate-500 italic mt-2">
                      <span>PAYMENT:</span>
                      <span>{selectedSlipOrder?.paymentMethod || 'N/A'}</span>
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

      {/* Floating Chat Widget for Customers */}
      <div className="fixed bottom-6 right-6 z-[150]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Live Support</h3>
                </div>
                <button onClick={() => setIsChatOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-50/50">
                {visitorMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ${
                      msg.isAdmin ? 'bg-white text-slate-700 border border-slate-100 shadow-sm' : 'bg-pink-500 text-white shadow-lg shadow-pink-500/10'
                    }`}>
                      {msg.text}
                      <p className={`text-[9px] mt-1 ${msg.isAdmin ? 'text-slate-400' : 'text-pink-100'}`}>{formatTimestamp(msg.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendVisitorMessage} className="p-3 border-t border-slate-100 bg-white">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                  />
                  <button type="submit" className="p-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/20">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-pink-500 transition-all group relative"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isChatOpen && visitorMessages.length > 0 && visitorMessages[visitorMessages.length - 1].isAdmin && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">1</span>
          )}
        </button>
      </div>

      {/* Authentication Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-pink-500" />
                  </div>
                  <button 
                    onClick={() => setIsAuthModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                    {authMode === 'login' ? 'Authorized Entry' : 'New Registration'}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-widest">
                    {authMode === 'login' ? 'Please provide your credentials' : 'Create a new account to continue'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address / User ID</label>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@naturalcare.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none"
                      required
                    />
                  </div>

                  {authError && (
                    <div className="p-3 bg-pink-50 border border-pink-100 rounded-xl animate-shake">
                      <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider text-center">
                        {authError}
                      </p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:bg-pink-600 transition-all shadow-xl shadow-slate-900/10"
                  >
                    {authMode === 'login' ? 'Login to Portal' : 'Sign Up'}
                  </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                  <div className="h-px bg-slate-100 flex-1"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </div>

                <button 
                  onClick={login}
                  className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-xl font-bold text-xs uppercase tracking-[0.3em] hover:border-pink-500 hover:text-pink-500 transition-all flex items-center justify-center gap-3"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Google Identity
                </button>

                <div className="mt-8 text-center bg-slate-50 p-4 rounded-xl">
                  <button 
                    onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-pink-500 transition-all"
                  >
                    {authMode === 'login' ? "Need a member account? Sign Up" : "Already have an account? Login"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

