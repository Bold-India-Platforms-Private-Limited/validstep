'use strict';

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Reference data for Master Accounting: brands, gateways, the one bank account,
 * and the chart of accounts + classification rules seeded from the real
 * narration patterns already in use on Bold India's HDFC statement. Everything
 * here is designed to be extended via the admin UI later (new brands, banks,
 * gateways, categories, rules) — this script only needs to run once to bootstrap.
 */
async function main() {
  console.log('Seeding Master Accounting reference data...');

  const validstep = await prisma.brand.upsert({
    where: { code: 'VALIDSTEP' },
    update: {},
    create: { code: 'VALIDSTEP', name: 'Validstep', description: 'Certificate/credentialing platform (validstep.com)' },
  });

  const riseflake = await prisma.brand.upsert({
    where: { code: 'RISEFLAKE' },
    update: {},
    create: { code: 'RISEFLAKE', name: 'RiseFlake.com / Resume', description: 'Resume/career platform (riseflake.com)' },
  });

  await prisma.paymentGatewayAccount.upsert({
    where: { code: 'PAYU' },
    update: {},
    create: { code: 'PAYU', name: 'PayU', brand_id: validstep.id },
  });

  await prisma.paymentGatewayAccount.upsert({
    where: { code: 'RAZORPAY' },
    update: {},
    create: { code: 'RAZORPAY', name: 'Razorpay', brand_id: riseflake.id },
  });

  await prisma.bankAccount.upsert({
    where: { id: 'hdfc-main-seeded' },
    update: {},
    create: {
      id: 'hdfc-main-seeded',
      bank_name: 'HDFC Bank',
      account_no_masked: 'XXXXXXXX7854',
      ifsc: 'HDFC0001794',
      nickname: 'HDFC Main',
    },
  });

  const categories = [
    { name: 'Validstep - Platform Profit', type: 'REVENUE', brand_id: validstep.id, is_system: true },
    { name: 'RiseFlake - Platform Profit', type: 'REVENUE', brand_id: riseflake.id, is_system: true },
    { name: 'Cloud Computing - AWS', type: 'EXPENSE', is_system: true },
    { name: 'Cloud Computing - GCP', type: 'EXPENSE', is_system: true },
    { name: 'Software Subscriptions', type: 'EXPENSE', is_system: true },
    { name: 'International Card Charges', type: 'EXPENSE', is_system: true },
    { name: 'Internship Stipend', type: 'EXPENSE', is_system: true },
    { name: 'Director Salary', type: 'EXPENSE', is_system: true },
    { name: 'Director Pre-incorporation Reimbursement', type: 'EXPENSE', is_system: true },
    { name: 'Business Expenses - General', type: 'EXPENSE', is_system: true },
    { name: 'Bank Charges', type: 'EXPENSE', is_system: true },
    { name: 'Refunds Paid', type: 'REFUND', is_system: true },
  ];

  const categoryByName = {};
  for (const cat of categories) {
    const row = await prisma.ledgerCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryByName[cat.name] = row;
  }

  const rules = [
    { pattern: 'PAYU PAYMENTS', category: 'Validstep - Platform Profit', priority: 100 },
    { pattern: 'RAZORPAY PAYMENTS', category: 'RiseFlake - Platform Profit', priority: 100 },
    { pattern: 'ANTHROPIC', category: 'Software Subscriptions', priority: 100 },
    { pattern: 'GOOGLE CLOUD', category: 'Cloud Computing - GCP', priority: 100 },
    { pattern: 'PAYUAMAZON', category: 'Cloud Computing - AWS', priority: 100 },
    { pattern: 'STIPEND', category: 'Internship Stipend', priority: 100 },
    { pattern: 'DC INTL POS TXN', category: 'International Card Charges', priority: 100 },
    { pattern: 'DIRECTOR SALARY', category: 'Director Salary', priority: 90 },
    { pattern: 'PRE-INCOPORATION', category: 'Director Pre-incorporation Reimbursement', priority: 90 },
    { pattern: 'PRE-INCORPORATION', category: 'Director Pre-incorporation Reimbursement', priority: 90 },
  ];

  for (const rule of rules) {
    const category = categoryByName[rule.category];
    const existing = await prisma.ledgerClassificationRule.findFirst({
      where: { pattern: rule.pattern, category_id: category.id },
    });
    if (!existing) {
      await prisma.ledgerClassificationRule.create({
        data: {
          category_id: category.id,
          match_type: 'CONTAINS',
          pattern: rule.pattern,
          priority: rule.priority,
        },
      });
    }
  }

  console.log('Master Accounting reference data seeded: 2 brands, 2 gateways, 1 bank account, %d categories, %d rules', categories.length, rules.length);
}

main()
  .catch((err) => {
    console.error('Master Accounting seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
