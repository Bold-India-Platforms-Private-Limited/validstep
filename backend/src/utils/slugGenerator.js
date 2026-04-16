'use strict';

const slugify = require('slugify');
const crypto = require('crypto');

/**
 * Generate a unique batch slug from company name, program type, and random suffix
 * Format: {company_name_slug}-{program_type}-{random_8chars}
 * Example: "bluestock-internship-a3b4c5d6"
 */
function generateBatchSlug(companyName, programType) {
  const companySlug = slugify(companyName, {
    lower: true,
    strict: true,
    replacement: '-',
    trim: true,
  }).slice(0, 30); // Limit length

  const typeSlug = programType.toLowerCase();
  const randomSuffix = crypto.randomBytes(4).toString('hex'); // 8 hex chars

  return `${companySlug}-${typeSlug}-${randomSuffix}`;
}

/**
 * Slugify any string for URL usage
 */
function toSlug(text) {
  return slugify(text, {
    lower: true,
    strict: true,
    replacement: '-',
    trim: true,
  });
}

module.exports = { generateBatchSlug, toSlug };
