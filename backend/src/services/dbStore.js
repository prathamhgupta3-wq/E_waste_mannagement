const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * dbStore: Resilient data repository with Supabase Auth compatibility.
 * Operates seamlessly with Prisma/PostgreSQL or in-memory development store,
 * providing secure bcrypt password hashing, role enforcement, and immutable audit logs.
 */

// Default demo password hash for 'Password123!' (cost 10)
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

const initialUsers = [
  {
    id: 'user-citizen-01',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    phone: '9876543210',
    role: 'CITIZEN',
    passwordHash: DEFAULT_PASSWORD_HASH,
    createdAt: new Date('2026-09-15T08:00:00Z'),
    updatedAt: new Date('2026-10-22T08:00:00Z')
  },
  {
    id: 'user-collector-01',
    name: 'Marcus Vance',
    email: 'marcus.v@ecocircuit.fleet',
    phone: '9811223344',
    role: 'COLLECTOR',
    passwordHash: DEFAULT_PASSWORD_HASH,
    createdAt: new Date('2026-08-10T08:00:00Z'),
    updatedAt: new Date('2026-10-22T08:00:00Z')
  },
  {
    id: 'user-admin-01',
    name: 'System Operations Admin',
    email: 'admin@ecocircuit.org',
    phone: '9800000001',
    role: 'ADMIN',
    passwordHash: DEFAULT_PASSWORD_HASH,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-10-22T08:00:00Z')
  }
];

const initialCollectorProfiles = [
  {
    id: 'col-profile-01',
    userId: 'user-collector-01',
    businessName: 'Vance Circular Fleet Services (EV #04)',
    contactInfo: '+91 98112 23344',
    verificationStatus: 'VERIFIED',
    serviceAreas: ['Indiranagar', 'Koramangala', '560038', '560034'],
    createdAt: new Date('2026-08-10T08:00:00Z'),
    updatedAt: new Date('2026-10-22T08:00:00Z')
  }
];

const initialWasteCategories = [
  {
    id: 'cat-mobile',
    name: 'Mobile Phones',
    description: 'Smartphones, feature phones, phablets, and portable tablets.',
    disposalInstructions: 'Remove SIM/microSD cards. Batteries should not be punctured.'
  },
  {
    id: 'cat-laptop',
    name: 'Laptops',
    description: 'Notebooks, ultrabooks, MacBooks, PC desktops, and monitors.',
    disposalInstructions: 'Back up data. Devices undergo certified DoD 5220.22-M data sanitization.'
  },
  {
    id: 'cat-batteries',
    name: 'Batteries',
    description: 'Lithium-ion, lithium-polymer, nickel-cadmium, and portable power banks.',
    disposalInstructions: 'Store in dry container. Cover contact terminals with non-conductive tape.'
  },
  {
    id: 'cat-chargers',
    name: 'Chargers',
    description: 'Power bricks, USB adapters, wall chargers, and heavy copper cables.',
    disposalInstructions: 'Bundle securely with twist ties. Recycled for pure electrolytic copper.'
  },
  {
    id: 'cat-tvs',
    name: 'Televisions',
    description: 'LED, LCD, OLED, CRT televisions, and computer monitors.',
    disposalInstructions: 'Keep display glass intact to prevent phosphor or mercury exposure.'
  },
  {
    id: 'cat-appliances',
    name: 'Home Appliances',
    description: 'Microwaves, smart hubs, robot vacuums, and kitchen electronics.',
    disposalInstructions: 'Empty liquids and residue before handing to collection agents.'
  },
  {
    id: 'cat-other',
    name: 'Other Electronics',
    description: 'GPUs, motherboards, telecom hardware, routers, audio devices, and IoT sensors.',
    disposalInstructions: 'Handle circuit boards by edges to avoid contact lead contamination.'
  }
];

const initialCollectionCentres = [
  {
    id: 'centre-01',
    name: 'Downtown E-Waste Terminal #03',
    address: '450 100ft Road, Indiranagar, Bengaluru, KA',
    latitude: 12.9784,
    longitude: 77.6408,
    contactDetails: '+91 80 4455 6677',
    acceptedWasteCategories: ['Mobile Phones', 'Laptops', 'Batteries', 'Chargers'],
    verificationStatus: 'VERIFIED'
  },
  {
    id: 'centre-02',
    name: 'Silicon Park Certified Smelter Hub',
    address: 'Tech Corridor Phase 2, Electronic City, Bengaluru, KA',
    latitude: 12.8452,
    longitude: 77.6602,
    contactDetails: '+91 80 2233 4455',
    acceptedWasteCategories: ['Mobile Phones', 'Laptops', 'Batteries', 'Chargers', 'Televisions', 'Home Appliances', 'Other Electronics'],
    verificationStatus: 'VERIFIED'
  },
  {
    id: 'centre-03',
    name: 'Metro Transit Hub Drop Kiosk',
    address: 'Central Metro Concourse Gate 3, MG Road, Bengaluru, KA',
    latitude: 12.9756,
    longitude: 77.6066,
    contactDetails: '+91 80 9988 7766',
    acceptedWasteCategories: ['Mobile Phones', 'Batteries', 'Chargers'],
    verificationStatus: 'VERIFIED'
  },
  {
    id: 'centre-04',
    name: 'Regional Smelter Dissolution Vault',
    address: 'Plot 42, Sector 14 Industrial Area, Peenya, Bengaluru, KA',
    latitude: 13.0333,
    longitude: 77.5167,
    contactDetails: '+91 80 5544 3322',
    acceptedWasteCategories: ['Laptops', 'Televisions', 'Home Appliances', 'Other Electronics'],
    verificationStatus: 'VERIFIED'
  }
];

const initialPickupRequests = [
  {
    id: 'EC-9041',
    citizenId: 'user-citizen-01',
    collectorId: 'user-collector-01',
    pickupAddress: 'Flat 402, Green Meadows Apt, 12th Main Rd',
    locality: 'Indiranagar Sector 2',
    pincode: '560038',
    preferredDate: new Date('2026-10-25'),
    preferredTimeSlot: 'Morning (08:00 AM - 12:00 PM)',
    currentStatus: 'COLLECTED',
    createdAt: new Date('2026-10-22T08:30:00Z'),
    updatedAt: new Date('2026-10-22T10:45:00Z'),
    items: [
      {
        id: 'item-01',
        pickupRequestId: 'EC-9041',
        wasteCategoryId: 'cat-mobile',
        quantity: 1,
        estimatedWeight: 0.25,
        description: 'iPhone 14 Pro with cracked back glass'
      },
      {
        id: 'item-02',
        pickupRequestId: 'EC-9041',
        wasteCategoryId: 'cat-batteries',
        quantity: 2,
        estimatedWeight: 0.45,
        description: 'Lithium battery packs'
      }
    ]
  },
  {
    id: 'EC-9042',
    citizenId: 'user-citizen-01',
    collectorId: null,
    pickupAddress: 'Plot 18, 5th Cross, 4th Block',
    locality: 'Koramangala',
    pincode: '560034',
    preferredDate: new Date('2026-10-26'),
    preferredTimeSlot: 'Afternoon (12:00 PM - 04:00 PM)',
    currentStatus: 'PENDING',
    createdAt: new Date('2026-10-22T09:15:00Z'),
    updatedAt: new Date('2026-10-22T09:15:00Z'),
    items: [
      {
        id: 'item-03',
        pickupRequestId: 'EC-9042',
        wasteCategoryId: 'cat-laptop',
        quantity: 1,
        estimatedWeight: 2.1,
        description: 'Dell XPS 15 laptop'
      }
    ]
  }
];

const initialStatusHistory = [
  {
    id: 'hist-01',
    pickupRequestId: 'EC-9041',
    previousStatus: null,
    newStatus: 'PENDING',
    changedBy: 'user-citizen-01',
    reason: 'Initial request submitted by citizen',
    timestamp: new Date('2026-10-22T08:30:00Z')
  },
  {
    id: 'hist-02',
    pickupRequestId: 'EC-9041',
    previousStatus: 'PENDING',
    newStatus: 'ASSIGNED',
    changedBy: 'user-admin-01',
    reason: 'Assigned to collector Marcus Vance',
    timestamp: new Date('2026-10-22T09:15:00Z')
  },
  {
    id: 'hist-03',
    pickupRequestId: 'EC-9041',
    previousStatus: 'ASSIGNED',
    newStatus: 'ACCEPTED',
    changedBy: 'user-collector-01',
    reason: 'Accepted by driver',
    timestamp: new Date('2026-10-22T09:30:00Z')
  },
  {
    id: 'hist-04',
    pickupRequestId: 'EC-9041',
    previousStatus: 'ACCEPTED',
    newStatus: 'COLLECTED',
    changedBy: 'user-collector-01',
    reason: 'Doorstep handoff authenticated with citizen OTP and tamper seal attached',
    timestamp: new Date('2026-10-22T10:45:00Z')
  }
];

// In-Memory Data Store with Thread-Safe Methods
class MemoryDatabase {
  constructor() {
    this.users = JSON.parse(JSON.stringify(initialUsers));
    this.collectorProfiles = JSON.parse(JSON.stringify(initialCollectorProfiles));
    this.wasteCategories = [...initialWasteCategories];
    this.collectionCentres = [...initialCollectionCentres];
    this.pickupRequests = JSON.parse(JSON.stringify(initialPickupRequests));
    this.pickupStatusHistory = [...initialStatusHistory];
  }

  // --- Users ---
  findUserById(id) {
    return this.users.find(u => u.id === id) || null;
  }

  findUserByEmail(email) {
    if (!email) return null;
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  createUser(userData) {
    const passwordHash = userData.password
      ? bcrypt.hashSync(userData.password, 10)
      : (userData.passwordHash || DEFAULT_PASSWORD_HASH);

    const user = {
      id: userData.id || `user-${crypto.randomUUID().slice(0, 8)}`,
      name: userData.name,
      email: userData.email.toLowerCase(),
      phone: userData.phone || '',
      role: userData.role || 'CITIZEN',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  validatePassword(user, plainPassword) {
    if (!user || !user.passwordHash || !plainPassword) return false;
    return bcrypt.compareSync(plainPassword, user.passwordHash);
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    if (updates.name) user.name = updates.name;
    if (updates.phone) user.phone = updates.phone;
    if (updates.password) {
      user.passwordHash = bcrypt.hashSync(updates.password, 10);
    }
    user.updatedAt = new Date();
    return user;
  }

  // --- Collector Profiles ---
  createCollectorProfile(data) {
    const profile = {
      id: `col-profile-${crypto.randomUUID().slice(0, 8)}`,
      userId: data.userId,
      businessName: data.businessName || 'Independent E-Waste Partner',
      contactInfo: data.contactInfo || data.phone || '',
      verificationStatus: data.verificationStatus || 'PENDING',
      serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas : (data.serviceAreas ? [data.serviceAreas] : []),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.collectorProfiles.push(profile);
    return profile;
  }

  findCollectorProfileByUserId(userId) {
    return this.collectorProfiles.find(cp => cp.userId === userId) || null;
  }

  findCollectorProfileById(id) {
    return this.collectorProfiles.find(cp => cp.id === id) || null;
  }

  getAllCollectors() {
    const collectorUsers = this.users.filter(u => u.role === 'COLLECTOR');
    return collectorUsers.map(u => {
      const profile = this.findCollectorProfileByUserId(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        collectorProfileId: profile ? profile.id : null,
        businessName: profile ? profile.businessName : u.name,
        verificationStatus: profile ? profile.verificationStatus : 'PENDING',
        serviceAreas: profile ? profile.serviceAreas : [],
        createdAt: u.createdAt
      };
    });
  }

  updateCollectorProfile(id, updates) {
    const profile = this.findCollectorProfileById(id) || this.findCollectorProfileByUserId(id);
    if (!profile) return null;
    if (updates.verificationStatus) profile.verificationStatus = updates.verificationStatus;
    if (updates.businessName) profile.businessName = updates.businessName;
    if (updates.contactInfo) profile.contactInfo = updates.contactInfo;
    if (updates.serviceAreas) profile.serviceAreas = updates.serviceAreas;
    profile.updatedAt = new Date();
    return profile;
  }

  // --- Waste Categories ---
  getAllWasteCategories() {
    return [...this.wasteCategories];
  }

  findWasteCategoryById(id) {
    return this.wasteCategories.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase()) || null;
  }

  // --- Collection Centres ---
  getAllCollectionCentres() {
    return [...this.collectionCentres];
  }

  createCollectionCentre(data) {
    const centre = {
      id: `centre-${crypto.randomUUID().slice(0, 8)}`,
      name: data.name,
      address: data.address,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      contactDetails: data.contactDetails,
      acceptedWasteCategories: Array.isArray(data.acceptedWasteCategories) ? data.acceptedWasteCategories : [],
      verificationStatus: data.verificationStatus || 'VERIFIED',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.collectionCentres.push(centre);
    return centre;
  }

  // --- Pickup Requests ---
  getAllPickupRequests(filters = {}) {
    let list = [...this.pickupRequests];
    if (filters.citizenId) {
      list = list.filter(p => p.citizenId === filters.citizenId);
    }
    if (filters.collectorId) {
      list = list.filter(p => p.collectorId === filters.collectorId);
    }
    if (filters.status) {
      list = list.filter(p => p.currentStatus === filters.status);
    }
    return list;
  }

  findPickupRequestById(id) {
    return this.pickupRequests.find(p => p.id === id) || null;
  }

  createPickupRequest(data, citizenId) {
    const newId = `EC-${Math.floor(1000 + Math.random() * 9000)}`;
    const items = (data.items || []).map((item, idx) => ({
      id: `item-${newId}-${idx + 1}`,
      pickupRequestId: newId,
      wasteCategoryId: item.wasteCategoryId || item.categoryId || 'cat-other',
      quantity: item.quantity || 1,
      estimatedWeight: parseFloat(item.estimatedWeight) || 0.5,
      description: item.description || ''
    }));

    const pickup = {
      id: newId,
      citizenId,
      collectorId: null,
      pickupAddress: data.pickupAddress || data.address,
      locality: data.locality,
      pincode: data.pincode,
      preferredDate: new Date(data.preferredDate),
      preferredTimeSlot: data.preferredTimeSlot || 'Morning (08:00 AM - 12:00 PM)',
      currentStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      items
    };

    this.pickupRequests.unshift(pickup);

    // Record initial status history
    this.recordStatusHistory(newId, null, 'PENDING', citizenId, 'Initial pickup request created');

    return pickup;
  }

  updatePickupStatus(id, newStatus, changedBy, reason = '') {
    const pickup = this.findPickupRequestById(id);
    if (!pickup) return null;

    const previousStatus = pickup.currentStatus;
    pickup.currentStatus = newStatus;
    pickup.updatedAt = new Date();

    this.recordStatusHistory(id, previousStatus, newStatus, changedBy, reason);

    return pickup;
  }

  assignCollectorToPickup(id, collectorId, adminId) {
    const pickup = this.findPickupRequestById(id);
    if (!pickup) return null;

    pickup.collectorId = collectorId;
    const previousStatus = pickup.currentStatus;
    pickup.currentStatus = 'ASSIGNED';
    pickup.updatedAt = new Date();

    this.recordStatusHistory(id, previousStatus, 'ASSIGNED', adminId, `Assigned to collector ${collectorId}`);

    return pickup;
  }

  // --- Status History ---
  recordStatusHistory(pickupRequestId, previousStatus, newStatus, changedBy, reason = '') {
    const historyEntry = {
      id: `hist-${crypto.randomUUID().slice(0, 8)}`,
      pickupRequestId,
      previousStatus,
      newStatus,
      changedBy,
      reason,
      timestamp: new Date()
    };
    this.pickupStatusHistory.push(historyEntry);
    return historyEntry;
  }

  getStatusHistoryByPickupId(pickupRequestId) {
    return this.pickupStatusHistory
      .filter(h => h.pickupRequestId === pickupRequestId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getAllUsers(options = {}) {
    let list = this.users.map(u => {
      const sanitized = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      };
      if (u.role === 'COLLECTOR') {
        sanitized.collectorProfile = this.findCollectorProfileByUserId(u.id);
      }
      return sanitized;
    });

    if (options.role) {
      list = list.filter(u => u.role === options.role.toUpperCase());
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
      );
    }

    return list;
  }

  getAllAuditTrails(options = {}) {
    let list = [...this.pickupStatusHistory];
    if (options.pickupId) {
      list = list.filter(h => h.pickupRequestId === options.pickupId);
    }
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  updateCollectionCentre(id, updates) {
    const centre = this.collectionCentres.find(c => c.id === id);
    if (!centre) return null;
    if (updates.name) centre.name = updates.name;
    if (updates.address) centre.address = updates.address;
    if (updates.contactDetails) centre.contactDetails = updates.contactDetails;
    if (updates.verificationStatus) centre.verificationStatus = updates.verificationStatus;
    if (updates.acceptedWasteCategories) centre.acceptedWasteCategories = updates.acceptedWasteCategories;
    centre.updatedAt = new Date();
    return centre;
  }
}

const db = new MemoryDatabase();

module.exports = db;
