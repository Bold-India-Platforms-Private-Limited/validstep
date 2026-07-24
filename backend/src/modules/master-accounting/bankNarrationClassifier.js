'use strict';

const { db } = require('../../config/database');

/** All active classification rules, highest priority first, with their category joined. */
async function loadActiveRules() {
  return db.ledgerClassificationRule.findMany({
    where: { is_active: true },
    include: { category: true },
    orderBy: { priority: 'desc' },
  });
}

function ruleMatches(rule, narration) {
  const text = narration || '';
  switch (rule.match_type) {
    case 'CONTAINS':
      return text.toUpperCase().includes(rule.pattern.toUpperCase());
    case 'STARTS_WITH':
      return text.toUpperCase().startsWith(rule.pattern.toUpperCase());
    case 'REGEX':
      try {
        return new RegExp(rule.pattern, 'i').test(text);
      } catch {
        return false; // a malformed admin-entered regex must never crash classification
      }
    default:
      return false;
  }
}

/**
 * Classify one narration against a preloaded rule list (pass the same list when
 * classifying a whole statement import so rules are fetched once, not per row).
 * First matching rule wins (rules are priority-ordered).
 */
function classifyNarration(narration, rules) {
  for (const rule of rules) {
    if (ruleMatches(rule, narration)) {
      return { category_id: rule.category_id, matched_rule_id: rule.id, brand_id: rule.category.brand_id };
    }
  }
  return null;
}

/**
 * Reclassify every currently-unclassified, non-manual MasterBankTransaction — run
 * this after adding/editing a rule so historical rows benefit without re-uploading
 * anything. Never touches rows a human has already manually tagged.
 */
async function reclassifyUnmatched() {
  const rules = await loadActiveRules();
  const unmatched = await db.masterBankTransaction.findMany({
    where: { category_id: null, is_manual_entry: false },
  });

  let matched = 0;
  for (const txn of unmatched) {
    const result = classifyNarration(txn.narration, rules);
    if (result) {
      await db.masterBankTransaction.update({
        where: { id: txn.id },
        data: { category_id: result.category_id, matched_rule_id: result.matched_rule_id, brand_id: result.brand_id },
      });
      matched += 1;
    }
  }
  return { checked: unmatched.length, matched };
}

module.exports = { loadActiveRules, classifyNarration, reclassifyUnmatched };
