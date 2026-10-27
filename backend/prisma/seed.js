/**
 * Prisma Database Seed Script for EcoCircuit Smart E-Waste Management Platform
 * Populates Demo Users, Collector Profiles, Waste Categories, and Collection Centres.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding EcoCircuit database...');

  // 1. Seed Demo Users
  const citizen = await prisma.user.upsert({
    where: { email: 'sarah.chen@example.com' },
    update: {},
    create: {
      id: 'user-citizen-01',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      phone: '9876543210',
      role: 'CITIZEN'
    }
  });

  const collector = await prisma.user.upsert({
    where: { email: 'marcus.v@ecocircuit.fleet' },
    update: {},
    create: {
      id: 'user-collector-01',
      name: 'Marcus Vance',
      email: 'marcus.v@ecocircuit.fleet',
      phone: '9811223344',
      role: 'COLLECTOR',
      collectorProfile: {
        create: {
          businessName: 'Vance Circular Fleet Services (EV #04)',
          contactInfo: '+91 98112 23344',
          verificationStatus: 'VERIFIED',
          serviceAreas: ['Indiranagar', 'Koramangala', '560038', '560034']
        }
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecocircuit.org' },
    update: {},
    create: {
      id: 'user-admin-01',
      name: 'System Operations Admin',
      email: 'admin@ecocircuit.org',
      phone: '9800000001',
      role: 'ADMIN'
    }
  });

  console.log('Demo Users seeded:', { citizen: citizen.email, collector: collector.email, admin: admin.email });

  // 2. Seed Waste Categories
  const categories = [
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

  for (const cat of categories) {
    await prisma.wasteCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }
  console.log(`Seeded ${categories.length} waste categories.`);

  // 3. Seed Collection Centres
  const centres = [
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
    }
  ];

  for (const c of centres) {
    await prisma.collectionCentre.upsert({
      where: { id: c.id },
      update: {},
      create: c
    });
  }
  console.log(`Seeded ${centres.length} collection centres.`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
