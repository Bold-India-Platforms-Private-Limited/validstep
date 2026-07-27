'use strict';

// One-off, idempotent: creates (or resets) the restricted PayU-review demo admin account.
// Usage: node scripts/createReviewAdmin.js
const { db } = require('../src/config/database');
const { hashPassword } = require('../src/utils/hash');

const EMAIL = process.env.REVIEW_ADMIN_EMAIL || 'payu.review@validstep.com';
const PASSWORD = process.env.REVIEW_ADMIN_PASSWORD || 'Payu@2026';
const NAME = process.env.REVIEW_ADMIN_NAME || 'PayU Review (Demo Account)';

async function main() {
  const password_hash = await hashPassword(PASSWORD);

  const admin = await db.superAdmin.upsert({
    where: { email: EMAIL },
    update: { password_hash, access_level: 'review', name: NAME },
    create: { email: EMAIL, password_hash, name: NAME, access_level: 'review' },
    select: { id: true, email: true, access_level: true },
  });

  console.log('Review admin ready:', admin);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => process.exit(0));
