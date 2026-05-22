const HealthcareRecord = require('../models/healthcare/HealthcareRecord');
const { deleteFromS3 } = require('../utils/s3Storage');

const purgeExpiredHealthcareRecords = async ({ limit = 200 } = {}) => {
  const now = new Date();
  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 200));

  const candidates = await HealthcareRecord.find({
    isDeleted: true,
    purgeAfter: { $lte: now },
  })
    .sort({ purgeAfter: 1 })
    .limit(safeLimit)
    .lean();

  if (!candidates.length) {
    return {
      scanned: 0,
      purged: 0,
      s3Deleted: 0,
      s3DeleteFailed: 0,
    };
  }

  let s3Deleted = 0;
  let s3DeleteFailed = 0;
  const idsToDelete = [];

  for (const record of candidates) {
    idsToDelete.push(record._id);
    if (record.storageKey) {
      try {
        await deleteFromS3(record.storageKey);
        s3Deleted += 1;
      } catch (_error) {
        // Purge should continue even when object deletion fails.
        s3DeleteFailed += 1;
      }
    }
  }

  const deleteResult = await HealthcareRecord.deleteMany({ _id: { $in: idsToDelete } });
  return {
    scanned: candidates.length,
    purged: Number(deleteResult?.deletedCount || 0),
    s3Deleted,
    s3DeleteFailed,
  };
};

module.exports = {
  purgeExpiredHealthcareRecords,
};
