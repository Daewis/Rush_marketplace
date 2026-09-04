import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Capability, CapabilityStatus, SystemRole } from '../models/User.js';
import { Provider } from '../models/Provider.js';
import { VendorProfile, StoreVisibility } from '../models/VendorProfile.js';
import { Product, ProductStatus } from '../models/Product.js';
import { Job, JobStatus, JobCategory } from '../models/Job.js';
import { Payment, PaymentStatus, PaymentProviderEnum } from '../models/Payment.js';
import { Violation, ViolationType, ViolationSeverity, ViolationStatus } from '../models/Violation.js';
import { Driver, MobilityCapability } from '../models/logistics/Driver.js';
import { Vehicle, VehicleType, VehicleVerificationStatus } from '../models/logistics/Vehicle.js';

/**
 * Fresh-schema seed — creates demo users with multiple capabilities,
 * matching the new architecture (one account, multiple capabilities).
 *
 * Per the user's choice ("Fresh schema only"), this is the only
 * migration path: existing DB records are NOT migrated, they're
 * replaced by this seed on a fresh database.
 */
export async function seedInitialData() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  // Purge any previously seeded mock jobs and mock providers so campus marketplace starts clean
  try {
    await Job.deleteMany({
      title: {
        $in: [
          'Fix AC Unit & Sockets in Faculty of Engineering',
          'Weekly Laundry Pickup & Express Ironing',
          'Leaking Tap and Basin Drainage Unclogging',
          'AC Leakage & Gas Top-up in Jaja Hall 304',
          'Burnt Circuit Breaker & Socket Repair',
          'Main Water Tank Valve Leaking Replacement',
        ],
      },
    });

    // Clean up any orphaned provider profiles
    const allUsers = await User.find({}, '_id');
    const validUserIds = allUsers.map((u) => u._id);
    await Provider.deleteMany({
      $or: [
        { userId: { $nin: validUserIds } },
        { displayName: { $in: ['Ade — Tech & Electronics Repair', 'Fatima — Laundry & Errands', 'Emeka Nwosu (Tech & Electronics Repair)', 'Fatima Bello (Laundry & Errands)'] } },
        { bio: { $in: ['Five years repairing phones, laptops, and small appliances on campus.', 'Express laundry, ironing, and campus errands.'] } },
      ],
    });

    await User.deleteMany({
      email: { $in: ['emeka.tech@rushng.com', 'fatima.laundry@rushng.com'] },
    });
  } catch (err) {
    console.warn('Cleanup of mock marketplace entities notice:', err);
  }

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return;
  }

  console.log('🌱 Seeding fresh multi-capability Rush data...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ─────────────────────────────────────────────────────────────
  // 1. Customer (CUSTOMER-only)
  // ─────────────────────────────────────────────────────────────
  const customer = await User.create({
    email: 'customer@rushng.com',
    phone: '+2348012345678',
    passwordHash,
    fullName: 'Chidi Okonkwo',
    capabilities: [Capability.CUSTOMER],
    systemRoles: [],
    capabilityStatus: {},
    activeWorkspace: Capability.CUSTOMER,
    isVerified: true,
    nin: '12345678901',
    bvn: '22233344455',
    address: 'Moremi Hall, UNILAG, Akoka, Yaba',
    city: 'Lagos',
    state: 'Lagos',
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Multi-capability user — Ade (CUSTOMER + VENDOR + SERVICE_PROVIDER)
  //    Demonstrates the whole point of the redesign.
  // ─────────────────────────────────────────────────────────────
  const adeUser = await User.create({
    email: 'ade@rushng.com',
    phone: '+2348099887766',
    passwordHash,
    fullName: 'Ade Okafor',
    capabilities: [Capability.CUSTOMER, Capability.VENDOR, Capability.SERVICE_PROVIDER],
    systemRoles: [],
    capabilityStatus: {
      [Capability.VENDOR]: CapabilityStatus.ACTIVE,
      [Capability.SERVICE_PROVIDER]: CapabilityStatus.ACTIVE,
    },
    activeWorkspace: Capability.VENDOR,
    isVerified: true,
    nin: '11122233344',
    bvn: '55566677788',
    address: 'Yaba Tech Hub, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });

  const adeVendor = await VendorProfile.create({
    userId: adeUser._id,
    businessName: 'Campus Gadgets',
    slug: 'campus-gadgets',
    description: 'Student-owned gadget store serving UNILAG. Phones, accessories, and fast repairs.',
    logo: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=200',
    coverImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    category: 'Electronics',
    phone: '+2348099887766',
    whatsapp: '+2348099887766',
    instagram: '@campusgadgets',
    location: { country: 'Nigeria', state: 'Lagos', city: 'Lagos', address: 'Yaba Tech Hub' },
    storeTheme: 'orange',
    storeCoverColor: '#f97316',
    storeVisibility: StoreVisibility.PUBLIC,
    deliveryEnabled: true,
    deliveryFee: 1500,
    deliveryRadiusKm: 15,
    estimatedDeliveryHours: 24,
    storeViews: 342,
    totalProducts: 3,
    totalOrders: 18,
    totalRevenue: 285000,
    rating: 4.8,
  });

  await Product.create([
    {
      vendorId: adeVendor._id,
      userId: adeUser._id,
      name: 'iPhone 13 (128GB)',
      slug: 'iphone-13-128gb',
      description: 'Barely used, original box + accessories. Battery health 92%.',
      images: ['https://images.unsplash.com/photo-1632661674596-127dec6c34ad?w=600'],
      category: 'Electronics',
      tags: ['phone', 'apple', 'iphone'],
      price: 425000,
      compareAtPrice: 480000,
      stock: 3,
      status: ProductStatus.ACTIVE,
      views: 87,
      totalSold: 2,
      rating: 4.9,
    },
    {
      vendorId: adeVendor._id,
      userId: adeUser._id,
      name: 'AirPods Pro (2nd Gen)',
      slug: 'airpods-pro-2nd-gen',
      description: 'Sealed. USB-C charging case.',
      images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600'],
      category: 'Electronics',
      tags: ['audio', 'apple', 'airpods'],
      price: 110000,
      compareAtPrice: 130000,
      stock: 5,
      status: ProductStatus.ACTIVE,
      views: 52,
      totalSold: 4,
      rating: 4.7,
    },
    {
      vendorId: adeVendor._id,
      userId: adeUser._id,
      name: 'Anker 20W USB-C Charger',
      slug: 'anker-20w-usb-c-charger',
      description: 'Fast charging for iPhone 12 and later. Compact.',
      images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600'],
      category: 'Accessories',
      tags: ['charger', 'anker', 'fast-charging'],
      price: 12500,
      stock: 12,
      status: ProductStatus.ACTIVE,
      views: 31,
      totalSold: 8,
      rating: 4.6,
    },
  ]);

  // ─────────────────────────────────────────────────────────────
  // 3. Vendor only — Amaka Fashion (CUSTOMER + VENDOR)
  // ─────────────────────────────────────────────────────────────
  const amakaUser = await User.create({
    email: 'amaka@rushng.com',
    phone: '+2348077665544',
    passwordHash,
    fullName: 'Amaka Eze',
    capabilities: [Capability.CUSTOMER, Capability.VENDOR],
    systemRoles: [],
    capabilityStatus: {
      [Capability.VENDOR]: CapabilityStatus.ACTIVE,
    },
    activeWorkspace: Capability.VENDOR,
    isVerified: true,
    address: 'Surulere, Lagos',
    city: 'Lagos',
    state: 'Lagos',
  });

  const amakaVendor = await VendorProfile.create({
    userId: amakaUser._id,
    businessName: 'Amaka Fashion',
    slug: 'amaka-fashion',
    description: 'Trendy campus-ready outfits. Custom tailoring available.',
    logo: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200',
    coverImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    category: 'Fashion',
    phone: '+2348077665544',
    whatsapp: '+2348077665544',
    instagram: '@amakafashion',
    location: { country: 'Nigeria', state: 'Lagos', city: 'Lagos', address: 'Surulere' },
    storeTheme: 'rose',
    storeCoverColor: '#e11d48',
    storeVisibility: StoreVisibility.PUBLIC,
    deliveryEnabled: true,
    deliveryFee: 2000,
    deliveryRadiusKm: 20,
    estimatedDeliveryHours: 48,
    storeViews: 198,
    totalProducts: 2,
    totalOrders: 7,
    totalRevenue: 95000,
    rating: 4.9,
  });

  await Product.create([
    {
      vendorId: amakaVendor._id,
      userId: amakaUser._id,
      name: 'Ankara Two-Piece Set',
      slug: 'ankara-two-piece-set',
      description: 'Custom-fitted Ankara two-piece. Specify size on order.',
      images: ['https://images.unsplash.com/photo-1485518882345-15568b007407?w=600'],
      category: 'Fashion',
      tags: ['ankara', 'african', 'two-piece'],
      price: 28000,
      stock: 8,
      status: ProductStatus.ACTIVE,
      views: 41,
      rating: 4.9,
    },
    {
      vendorId: amakaVendor._id,
      userId: amakaUser._id,
      name: 'Plain White T-Shirt (Cotton)',
      slug: 'plain-white-t-shirt-cotton',
      description: 'Heavyweight 100% cotton. Sizes S–XXL.',
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'],
      category: 'Fashion',
      tags: ['tshirt', 'basics', 'cotton'],
      price: 7500,
      stock: 20,
      status: ProductStatus.ACTIVE,
      views: 28,
      rating: 4.5,
    },
  ]);

  // ─────────────────────────────────────────────────────────────
  // 5. Rider — Tunde (CUSTOMER + RIDER, ACTIVE)
  //    Demonstrates the full rider verification path.
  // ─────────────────────────────────────────────────────────────
  const tundeUser = await User.create({
    email: 'tunde.rider@rushng.com',
    phone: '+2348055443322',
    passwordHash,
    fullName: 'Tunde Bello',
    capabilities: [Capability.CUSTOMER, Capability.RIDER],
    systemRoles: [],
    capabilityStatus: {
      [Capability.RIDER]: CapabilityStatus.ACTIVE,
    },
    activeWorkspace: Capability.RIDER,
    isVerified: true,
    nin: '99887766554',
    bvn: '11223344556',
    address: 'Surulere, Lagos',
    city: 'Lagos',
    state: 'Lagos',
    profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  });

  const tundeVehicle = await Vehicle.create({
    ownerId: tundeUser._id,
    type: VehicleType.MOTORCYCLE,
    make: 'Bajaj',
    model: 'Boxer',
    year: 2022,
    plateNumber: 'LND-234-XA',
    verificationStatus: VehicleVerificationStatus.APPROVED,
    documents: [],
  });

  await Driver.create({
    userId: tundeUser._id,
    vehicleType: 'bike',
    vehiclePlateNumber: 'LND-234-XA',
    licenseNumber: 'LAG-0123456789',
    licenseVerified: true,
    mobilityCapabilities: [MobilityCapability.DELIVERY, MobilityCapability.PASSENGER_RIDES],
    approvedVehicleIds: [tundeVehicle._id],
    status: 'available',
    rating: 4.8,
    totalTrips: 156,
    totalDeliveries: 132,
    totalPassengerRides: 24,
    totalEarnings: 98000,
    isActive: true,
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Pending rider — Sarah (applied, awaiting admin approval)
  // ─────────────────────────────────────────────────────────────
  const sarahUser = await User.create({
    email: 'sarah.rider@rushng.com',
    phone: '+2348022334455',
    passwordHash,
    fullName: 'Sarah Okon',
    capabilities: [Capability.CUSTOMER, Capability.RIDER],
    systemRoles: [],
    capabilityStatus: {
      [Capability.RIDER]: CapabilityStatus.PENDING_VERIFICATION,
    },
    activeWorkspace: Capability.RIDER,
    isVerified: true,
    address: 'Ikeja, Lagos',
    city: 'Lagos',
    state: 'Lagos',
  });

  const sarahVehicle = await Vehicle.create({
    ownerId: sarahUser._id,
    type: VehicleType.CAR,
    make: 'Toyota',
    model: 'Corolla',
    year: 2019,
    plateNumber: 'LAG-5566-GT',
    verificationStatus: VehicleVerificationStatus.PENDING,
    documents: [],
  });

  await Driver.create({
    userId: sarahUser._id,
    vehicleType: 'car',
    vehiclePlateNumber: 'LAG-5566-GT',
    licenseNumber: 'LAG-9876543210',
    licenseVerified: false,
    mobilityCapabilities: [MobilityCapability.DELIVERY],
    approvedVehicleIds: [sarahVehicle._id],
    status: 'offline',
    rating: 0,
    totalTrips: 0,
    totalDeliveries: 0,
    totalPassengerRides: 0,
    totalEarnings: 0,
    isActive: true,
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Admin
  // ─────────────────────────────────────────────────────────────
  await User.create({
    email: 'admin@rushng.com',
    phone: '+2348000000000',
    passwordHash,
    fullName: 'Rush Admin',
    capabilities: [Capability.CUSTOMER],
    systemRoles: [SystemRole.ADMIN],
    capabilityStatus: {},
    activeWorkspace: Capability.CUSTOMER,
    isVerified: true,
  });

  console.log('✅ Multi-capability seed complete! Users:');
  console.log('   • customer@rushng.com / Password123!  (CUSTOMER)');
  console.log('   • ade@rushng.com / Password123!        (CUSTOMER + VENDOR + SERVICE_PROVIDER)');
  console.log('   • fatima.laundry@rushng.com / Password123!  (CUSTOMER + SERVICE_PROVIDER)');
  console.log('   • amaka@rushng.com / Password123!      (CUSTOMER + VENDOR)');
  console.log('   • tunde.rider@rushng.com / Password123!  (CUSTOMER + RIDER, ACTIVE)');
  console.log('   • sarah.rider@rushng.com / Password123!  (CUSTOMER + RIDER, PENDING_VERIFICATION)');
  console.log('   • admin@rushng.com / Password123!      (ADMIN system role)');
}
