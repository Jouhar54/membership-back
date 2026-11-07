import mongoose from 'mongoose';

/**
 * Returns configuration for a batch:
 *  - prefix: String (e.g. "1999", "2018", "2020", "2021", "BE1998")
 *  - padLength: Number (2 for BE1998, 3 for others)
 *  - startSeq: Number (30 for normal BATCH 2018, 1 for all others)
 */
export const getBatchConfig = (batch) => {
  if (!batch) {
    return {
      prefix: new Date().getFullYear().toString(),
      padLength: 3,
      startSeq: 1,
    };
  }

  const code = (batch.batchCode || '').toUpperCase();
  const name = (batch.batchName || '').trim();

  // 1. Before 1999 -> BE1998/01
  if (code === 'BE1998' || name.toLowerCase().includes('before 1999')) {
    return {
      prefix: 'BE1998',
      padLength: 2,
      startSeq: 1,
    };
  }

  // 2. DA'WA BATCH 2018 -> 2018/001 ... 2018/029
  if (code === 'DA2018' || name.toLowerCase().includes("da'wa")) {
    return {
      prefix: '2018',
      padLength: 3,
      startSeq: 1,
    };
  }

  // 3. Normal BATCH 2018 -> 2018/030, 2018/031 ...
  if (code === 'BA2018' || name === 'BATCH 2018') {
    return {
      prefix: '2018',
      padLength: 3,
      startSeq: 30,
    };
  }

  // 4. SWAFAA BATCH 2020 -> 2020/001 ...
  if (code === 'SW2020' || name.toLowerCase().includes('swafaa')) {
    return {
      prefix: '2020',
      padLength: 3,
      startSeq: 1,
    };
  }

  // 5. AL-IZDHIHAR BATCH 2021 -> 2021/001 ...
  if (code === 'AL2021' || name.toLowerCase().includes('al-izdhihar')) {
    return {
      prefix: '2021',
      padLength: 3,
      startSeq: 1,
    };
  }

  // 6. Explicit override on batch document if present
  if (batch.membershipPrefix) {
    return {
      prefix: batch.membershipPrefix,
      padLength: 3,
      startSeq: 1,
    };
  }

  // 7. Standard Year Batches (e.g. BA1999 -> 1999, BATCH 1999 -> 1999)
  if (/^BA(\d{4})$/i.test(code)) {
    return {
      prefix: code.substring(2),
      padLength: 3,
      startSeq: 1,
    };
  }

  const match = name.match(/^BATCH\s+(\d{4})$/i);
  if (match) {
    return {
      prefix: match[1],
      padLength: 3,
      startSeq: 1,
    };
  }

  return {
    prefix: code || 'MEM',
    padLength: 3,
    startSeq: 1,
  };
};

export const getBatchPrefix = (batch) => {
  return getBatchConfig(batch).prefix;
};

/**
 * Generates the next sequential membership ID for a batch.
 * Format: {BATCH_PREFIX}/{001} (or BE1998/01 for Before 1999)
 *
 * @param {Object|String} batchOrId - Batch document, batch object, or batch ObjectId
 * @returns {Promise<String>} Generated membership ID (e.g. "1999/003")
 */
export const generateMembershipId = async (batchOrId) => {
  if (!batchOrId) {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `AALIA-${year}-${randomNum}`;
  }

  let batch = batchOrId;
  const Batch = (await import('../models/Batch.js')).default;
  if (mongoose.isValidObjectId(batchOrId) && (!batch.batchCode && !batch.batchName)) {
    batch = await Batch.findById(batchOrId);
  }

  const config = getBatchConfig(batch);
  const batchId = batch?._id || batchOrId;

  const MembershipApplication = (await import('../models/MembershipApplication.js')).default;

  // Find all approved applications in this batch with a membership ID
  const existingMembers = await MembershipApplication.find({
    batch: batchId,
    membershipStatus: 'approved',
    membershipId: { $exists: true, $ne: null },
  }).select('membershipId');

  let maxSeq = config.startSeq - 1;
  const prefixRegex = new RegExp(`^${config.prefix}/(\\d+)`);

  for (const m of existingMembers) {
    if (!m.membershipId) continue;
    const match = m.membershipId.match(prefixRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextNum = maxSeq + 1;
  let candidateId = `${config.prefix}/${String(nextNum).padStart(config.padLength, '0')}`;

  // Collision guard to ensure uniqueness
  while (await MembershipApplication.exists({ membershipId: candidateId })) {
    nextNum++;
    candidateId = `${config.prefix}/${String(nextNum).padStart(config.padLength, '0')}`;
  }

  return candidateId;
};

export default generateMembershipId;
