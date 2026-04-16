'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // ─── Create Super Admin ──────────────────────────────────────────────────
  const adminEmail = process.env.SUPERADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || 'Admin@123';
  const adminName = process.env.SUPERADMIN_NAME || 'Super Admin';

  const existingAdmin = await prisma.superAdmin.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const password_hash = await bcrypt.hash(adminPassword, 12);
    await prisma.superAdmin.create({
      data: {
        email: adminEmail,
        password_hash,
        name: adminName,
      },
    });
    console.log(`Super admin created: ${adminEmail}`);
  } else {
    console.log(`Super admin already exists: ${adminEmail}`);
  }

  // ─── Create Default Pricing Configurations ───────────────────────────────
  const pricingConfigs = [
    { program_type: 'INTERNSHIP', default_price: 499.00 },
    { program_type: 'COURSE', default_price: 299.00 },
    { program_type: 'PARTICIPATION', default_price: 199.00 },
    { program_type: 'HACKATHON', default_price: 299.00 },
    { program_type: 'OTHER', default_price: 199.00 },
  ];

  for (const config of pricingConfigs) {
    await prisma.pricingConfig.upsert({
      where: { program_type: config.program_type },
      update: { default_price: config.default_price },
      create: {
        program_type: config.program_type,
        default_price: config.default_price,
      },
    });
    console.log(`Pricing config upserted for ${config.program_type}: ₹${config.default_price}`);
  }

  // ─── (Optional) Demo Company ─────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true') {
    const demoCompanyEmail = 'demo@company.com';
    const existingCompany = await prisma.company.findUnique({
      where: { email: demoCompanyEmail },
    });

    if (!existingCompany) {
      const companyPasswordHash = await bcrypt.hash('Demo@123', 12);
      const company = await prisma.company.create({
        data: {
          name: 'Demo Tech Company',
          email: demoCompanyEmail,
          password_hash: companyPasswordHash,
          phone: '+91 9876543210',
          website: 'https://demo-tech.example.com',
          description: 'A demo tech company for testing purposes',
          is_active: true,
          is_verified: true,
        },
      });
      console.log(`Demo company created: ${demoCompanyEmail}`);

      // Create a demo program
      const program = await prisma.program.create({
        data: {
          company_id: company.id,
          type: 'INTERNSHIP',
          name: 'Summer Internship 2024',
          description: 'Demo internship program',
        },
      });
      console.log('Demo program created');

      // Create a demo batch
      const slugify = require('slugify');
      const crypto = require('crypto');
      const slug = `demo-tech-company-internship-${crypto.randomBytes(4).toString('hex')}`;

      const batch = await prisma.batch.create({
        data: {
          program_id: program.id,
          company_id: company.id,
          name: 'Batch 1 - June 2024',
          start_date: new Date('2024-06-01'),
          end_date: new Date('2024-08-31'),
          role: 'Software Development Intern',
          id_prefix: 'DEMO',
          certificate_price: 499.00,
          currency: 'INR',
          unique_slug: slug,
          status: 'ACTIVE',
          is_active: true,
        },
      });
      console.log(`Demo batch created with slug: ${slug}`);

      // Create a demo certificate template
      await prisma.certificateTemplate.create({
        data: {
          batch_id: batch.id,
          company_id: company.id,
          template_name: 'Default Classic Template',
          template_type: 'CLASSIC',
          background_color: '#FFFFFF',
          accent_color: '#1a237e',
          font_family: 'Helvetica',
          show_logo: true,
          show_signature: false,
          is_active: true,
        },
      });
      console.log('Demo certificate template created');
    } else {
      console.log('Demo company already exists, skipping demo data creation');
    }
  }

  console.log('\nSeeding completed successfully!');
  console.log('\nCredentials:');
  console.log(`  Super Admin - Email: ${adminEmail} | Password: ${adminPassword}`);
  if (process.env.NODE_ENV === 'development' && process.env.SEED_DEMO_DATA === 'true') {
    console.log('  Demo Company - Email: demo@company.com | Password: Demo@123');
  }
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
