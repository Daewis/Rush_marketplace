import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  Plus,
  TrendingUp,
  DollarSign,
  Eye,
  EyeOff,
  Copy,
  Check,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Phone,
  Tag,
  Loader2,
  Sparkles,
  Search,
  Upload,
  Image as ImageIcon,
  Link2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { vendorApi, orderApi, handleApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { useAuthContext } from '@/context/AuthContext';

// Helper to normalize Unsplash and web image URLs
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // If user pasted an Unsplash photo page URL like unsplash.com/photos/xyz-McxsrN3WW48 or unsplash.com/photos/McxsrN3WW48
  const unsplashMatch = trimmed.match(/unsplash\.com\/photos\/(?:[a-zA-Z0-9_-]+-)?([a-zA-Z0-9_-]+)(?:\?.*)?$/i);
  if (unsplashMatch && unsplashMatch[1]) {
    return `https://images.unsplash.com/photo-${unsplashMatch[1]}?w=600&auto=format&fit=crop&q=80`;
  }

  // Prepend https:// if protocol missing for standard domains
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('data:image/')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

// Compress and read image file to compact data URL
async function processImageFile(file: File): Promise<{ dataUrl: string; name: string; size: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const sizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          resolve({
            dataUrl: compressedDataUrl,
            name: file.name,
            size: `${sizeKb} KB`,
          });
        } else {
          resolve({
            dataUrl: result,
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
          });
        }
      };
      img.onerror = () => {
        resolve({
          dataUrl: result,
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
        });
      };
      img.src = result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export const VendorDashboard: React.FC = () => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'settings'>('overview');

  // Product modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageUploadMode, setImageUploadMode] = useState<'file' | 'url'>('file');
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: 'General',
    description: '',
    stockQuantity: '10',
    imageUrl: '',
  });
  const [urlInputValue, setUrlInputValue] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageValid, setImageValid] = useState<boolean | null>(null);
  const [imageMeta, setImageMeta] = useState<{ name?: string; size?: string; dimensions?: string }>({});
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [savingProduct, setSavingProduct] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price: '', category: 'General', description: '', stockQuantity: '10', imageUrl: '' });
    setUrlInputValue('');
    setImageUploadMode('file');
    setImageValid(null);
    setImageMeta({});
    setImageLoading(false);
    setIsAddProductOpen(true);
  };

  const openEditProductModal = (prod: any) => {
    setEditingProduct(prod);
    const existingImg = prod.images?.[0] || '';
    setProductForm({
      name: prod.name,
      price: String(prod.price),
      category: prod.category || 'General',
      description: prod.description || '',
      stockQuantity: String(prod.stockQuantity || 10),
      imageUrl: existingImg,
    });
    setUrlInputValue(existingImg.startsWith('data:image') ? '' : existingImg);
    setImageUploadMode(existingImg.startsWith('data:image') || !existingImg ? 'file' : 'url');
    setImageValid(existingImg ? true : null);
    setImageMeta(existingImg.startsWith('data:image') ? { name: 'Uploaded Image' } : {});
    setImageLoading(false);
    setIsAddProductOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }
    setImageLoading(true);
    setImageValid(null);
    try {
      const { dataUrl, name, size } = await processImageFile(file);
      setProductForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      setImageMeta({ name, size });
      setImageValid(true);
      toast.success(`Image "${name}" uploaded and optimized!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process image');
      setImageValid(false);
    } finally {
      setImageLoading(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInputValue(value);
    const normalized = normalizeImageUrl(value);
    setProductForm((prev) => ({ ...prev, imageUrl: normalized }));

    if (!normalized.trim()) {
      setImageValid(null);
      setImageMeta({});
      setImageLoading(false);
      return;
    }

    setImageLoading(true);
    setImageValid(null);

    const testImg = new Image();
    testImg.onload = () => {
      setImageValid(true);
      setImageLoading(false);
      setImageMeta({
        dimensions: `${testImg.naturalWidth} × ${testImg.naturalHeight}px`,
      });
    };
    testImg.onerror = () => {
      setImageValid(false);
      setImageLoading(false);
    };
    testImg.src = normalized;
  };

  const clearImage = () => {
    setProductForm((prev) => ({ ...prev, imageUrl: '' }));
    setUrlInputValue('');
    setImageValid(null);
    setImageMeta({});
    setImageLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      const [profRes, prodRes, ordRes] = await Promise.allSettled([
        vendorApi.getProfile(),
        vendorApi.listProducts(),
        vendorApi.listOrders(),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value.data?.data) {
        setProfile(profRes.value.data.data.vendor_profile);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value.data?.data) {
        setProducts(prodRes.value.data.data.products || []);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value.data?.data) {
        setOrders(ordRes.value.data.data.orders || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!profile) return;
    const newVisibility = profile.storeVisibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    try {
      const res = await vendorApi.updateStore({ storeVisibility: newVisibility });
      if (res.data?.success) {
        setProfile((prev: any) => ({ ...prev, storeVisibility: newVisibility }));
        toast.success(`Storefront is now ${newVisibility === 'PUBLIC' ? 'Live & Public' : 'Private'}`);
      }
    } catch (err) {
      toast.error('Could not update store visibility');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      toast.error('Please provide a product title and price');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = {
        name: productForm.name.trim(),
        price: Number(productForm.price),
        category: productForm.category,
        description: productForm.description.trim(),
        stockQuantity: Number(productForm.stockQuantity) || 0,
        images: productForm.imageUrl.trim() ? [productForm.imageUrl.trim()] : [],
        isAvailable: true,
      };

      if (editingProduct) {
        const res = await vendorApi.updateProduct(editingProduct._id || editingProduct.id, payload);
        if (res.data?.success) {
          toast.success('Product updated successfully');
        }
      } else {
        const res = await vendorApi.createProduct(payload);
        if (res.data?.success) {
          toast.success('Product created and listed in store');
        }
      }

      setIsAddProductOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', price: '', category: 'General', description: '', stockQuantity: '10', imageUrl: '' });
      fetchVendorData();
    } catch (err: any) {
      toast.error(handleApiError(err));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await vendorApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== id));
      toast.success('Product removed');
    } catch (err) {
      toast.error('Failed to remove product');
    }
  };

  const handleOrderStatus = async (orderId: string, action: 'confirm' | 'ready') => {
    try {
      if (action === 'confirm') {
        await orderApi.confirm(orderId);
        toast.success('Order confirmed and moved to processing');
      } else if (action === 'ready') {
        await orderApi.markReady(orderId);
        toast.success('Order marked ready! Logistics handoff created for riders.');
      }
      fetchVendorData();
    } catch (err: any) {
      toast.error(handleApiError(err));
    }
  };

  const copyStoreLink = () => {
    if (!profile?.slug) return;
    const url = `${window.location.origin}/store/${profile.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Storefront link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner text="Loading your merchant dashboard..." />
      </div>
    );
  }

  const totalRevenue = orders
    .filter((o) => ['CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'DELIVERED'].includes(o.status))
    .reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

  const activeOrdersCount = orders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY'].includes(o.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Store Header Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-inner">
              <Store className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black">{profile?.businessName || 'Your Campus Store'}</h1>
                <Badge
                  className={`${
                    profile?.storeVisibility === 'PUBLIC'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-300'
                  } border-none text-[10px] font-bold`}
                >
                  {profile?.storeVisibility === 'PUBLIC' ? 'LIVE & PUBLIC' : 'PRIVATE / DRAFT'}
                </Badge>
              </div>
              <p className="text-xs text-orange-100 mt-1 flex items-center gap-2">
                <span>Category: {profile?.category || 'General Store'}</span>
                <span>•</span>
                <span>Slug: /{profile?.slug || 'my-store'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggleVisibility}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer"
            >
              {profile?.storeVisibility === 'PUBLIC' ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Set Private
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Publish Store
                </>
              )}
            </button>
            <button
              onClick={copyStoreLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Store Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50/40">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Sales</p>
                <p className="text-2xl font-black mt-1 text-slate-900">₦{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100 text-orange-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Orders</p>
                <p className="text-2xl font-black mt-1 text-blue-700">{activeOrdersCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Catalog Items</p>
                <p className="text-2xl font-black mt-1 text-emerald-700">{products.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Store Rating</p>
                <p className="text-2xl font-black mt-1 text-purple-700">{profile?.rating || '5.0'} ⭐</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview & Live Orders
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Product Catalog ({products.length})
        </button>
      </div>

      {/* Tab 1: Overview & Orders */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Truck className="h-5 w-5 text-orange-600" />
                Store Customer Orders & Logistics Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {orders.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Share your store link with students on WhatsApp or Campus Hubs to start receiving orders!
                  </p>
                  <button
                    onClick={copyStoreLink}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Store Link
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord: any) => (
                    <div
                      key={ord._id || ord.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900">
                            Order #{ord.orderNumber || ord._id?.slice(-6) || 'RUSH'}
                          </span>
                          <Badge
                            className={`text-[10px] font-bold ${
                              ord.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-700'
                                : ord.status === 'READY_FOR_DELIVERY'
                                ? 'bg-blue-100 text-blue-700'
                                : ord.status === 'PROCESSING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          Buyer: <span className="font-semibold">{ord.customerName || ord.customerId?.fullName || 'Customer'}</span> ({ord.customerPhone || ord.deliveryAddress?.phone || 'N/A'})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Destination: {ord.deliveryAddress?.address || ord.deliveryAddress?.city || 'Campus Delivery'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-medium">Total Amount</p>
                          <p className="text-base font-black text-slate-900">₦{(ord.totalAmount || ord.total || 0).toLocaleString()}</p>
                        </div>

                        {ord.status === 'PENDING' && (
                          <button
                            onClick={() => handleOrderStatus(ord._id || ord.id, 'confirm')}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Confirm Order
                          </button>
                        )}
                        {ord.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleOrderStatus(ord._id || ord.id, 'ready')}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" /> Dispatch Rider
                          </button>
                        )}
                        {ord.status === 'READY_FOR_DELIVERY' && (
                          <span className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" /> Rider Dispatched
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Store Catalog & Inventory
            </h3>
            <button
              onClick={openAddProductModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Product
            </button>
          </div>

          {products.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200">
              <CardContent className="text-center py-12 space-y-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Products Listed</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Add items to your catalog so buyers on campus can order directly.
                </p>
                <button
                  onClick={openAddProductModal}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create First Product
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((prod) => (
                <Card key={prod._id || prod.id} className="border-slate-200 hover:border-orange-300 transition-all overflow-hidden">
                  {prod.images?.[0] && (
                    <div className="h-36 w-full bg-slate-100 overflow-hidden relative">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                      <span className="text-sm font-black text-orange-600 shrink-0">
                        ₦{(prod.price || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{prod.description || 'No description provided.'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Stock: {prod.stockQuantity ?? 10} pcs</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditProductModal(prod)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod._id || prod.id)}
                          className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingProduct ? 'Edit Store Item' : 'Add New Store Item'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editingProduct ? 'Update product details and photo' : 'List a product with photo and pricing'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Mango fruit, Type-C Fast Charger, Casio Calculator"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="500"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.stockQuantity}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                    placeholder="20"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Product Image Section: Device Upload + URL with Live Preview */}
              <div className="space-y-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Product Image
                  </label>
                  {/* Mode Toggle: Device Upload vs URL */}
                  <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('file')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        imageUploadMode === 'file'
                          ? 'bg-white text-orange-700 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Device Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadMode('url')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        imageUploadMode === 'url'
                          ? 'bg-white text-orange-700 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Web Link</span>
                    </button>
                  </div>
                </div>

                {/* Device Upload Mode */}
                {imageUploadMode === 'file' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDraggingFile
                          ? 'border-orange-500 bg-orange-50/50'
                          : 'border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/20'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to select image or drag & drop here
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Supports phone camera, gallery, PNG, JPG, WEBP (auto-optimized)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Web Link Mode */}
                {imageUploadMode === 'url' && (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={urlInputValue}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="Paste image link e.g. https://images.unsplash.com/..."
                        className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                      {urlInputValue && (
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      💡 Paste any direct image link or Unsplash URL. We automatically verify it below.
                    </p>
                  </div>
                )}

                {/* Live Image Preview & Verification Status */}
                {productForm.imageUrl && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                        Live Image Preview
                      </span>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Photo
                      </button>
                    </div>

                    <div className="relative rounded-xl border border-slate-200 bg-slate-900/5 overflow-hidden flex items-center justify-center min-h-[140px] max-h-[220px]">
                      {imageLoading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10">
                          <div className="flex items-center gap-2 text-xs font-semibold text-orange-700">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying image...</span>
                          </div>
                        </div>
                      )}

                      <img
                        src={productForm.imageUrl}
                        alt="Product preview"
                        referrerPolicy="no-referrer"
                        onLoad={() => {
                          setImageValid(true);
                          setImageLoading(false);
                        }}
                        onError={() => {
                          setImageValid(false);
                          setImageLoading(false);
                        }}
                        className="w-full h-full max-h-[200px] object-contain p-1"
                      />

                      {/* Status Tag Overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {imageValid === true && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Photo Verified
                            {imageMeta.size && ` • ${imageMeta.size}`}
                            {imageMeta.dimensions && ` • ${imageMeta.dimensions}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Warning if Image fails to load */}
                    {imageValid === false && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Could not preview this image link</span>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          This URL may be an HTML webpage rather than a direct image, or has restricted access. Try uploading the image file directly using the <strong>Device Upload</strong> tab above.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Fresh, brand, quality, condition, or package size..."
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Update Product' : 'List Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
