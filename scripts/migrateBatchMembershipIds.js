import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import MembershipApplication from '../src/models/MembershipApplication.js';
import Batch from '../src/models/Batch.js';
import { getBatchConfig } from '../src/utils/generateMembershipId.js';

async function migrate() {
  await connectDB();
  console.log('====================================================');
  console.log('   AALIA MEMBERSHIP ID MIGRATION - BATCH SEQUENCING  ');
  console.log('====================================================\n');

  const batches = await Batch.find().sort({ batchName: 1 });
  let totalUpdated = 0;
  const allAssignedIds = new Set();
  const summary = [];

  for (const batch of batches) {
    const config = getBatchConfig(batch);

    // Fetch all approved members of this batch ordered by date & time of approval
    const applications = await MembershipApplication.find({
      batch: batch._id,
      membershipStatus: 'approved',
    })
      .select('_id fullName membershipId approvedAt createdAt')
      .sort({ approvedAt: 1, createdAt: 1, _id: 1 });

    if (applications.length === 0) {
      continue;
    }

    const bulkOps = applications.map((app, index) => {
      const seqNumber = config.startSeq + index;
      const formattedSeq = String(seqNumber).padStart(config.padLength, '0');
      const newMembershipId = `${config.prefix}/${formattedSeq}`;

      if (allAssignedIds.has(newMembershipId)) {
        throw new Error(`CRITICAL: Collision detected on ID "${newMembershipId}" in batch "${batch.batchName}" for member "${app.fullName}"`);
      }
      allAssignedIds.add(newMembershipId);

      return {
        updateOne: {
          filter: { _id: app._id },
          update: { $set: { membershipId: newMembershipId } },
        },
      };
    });

    const result = await MembershipApplication.bulkWrite(bulkOps);
    totalUpdated += (result.modifiedCount || applications.length);

    const firstId = `${config.prefix}/${String(config.startSeq).padStart(config.padLength, '0')}`;
    const lastId = `${config.prefix}/${String(config.startSeq + applications.length - 1).padStart(config.padLength, '0')}`;

    console.log(`[DONE] ${batch.batchName.padEnd(25)} [${batch.batchCode.padEnd(8)}] -> ${applications.length} members (${firstId} to ${lastId})`);

    summary.push({
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      prefix: config.prefix,
      padLength: config.padLength,
      count: applications.length,
      range: `${firstId} - ${lastId}`,
    });
  }

  console.log('\n====================================================');
  console.log(` MIGRATION SUCCESSFUL!`);
  console.log(` Total Batches Processed : ${summary.length}`);
  console.log(` Total Members Updated   : ${totalUpdated}`);
  console.log(` Total Unique IDs        : ${allAssignedIds.size}`);
  console.log('====================================================\n');

  process.exit(0);
}

migrate().catch((err) => {
  console.error('\n Migration Failed:', err);
  process.exit(1);
});

