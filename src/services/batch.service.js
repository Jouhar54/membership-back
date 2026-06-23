const Batch = require('../models/Batch');

const createBatch = async (batchData) => {
  const { batchName, batchCode, joinLink, coordinators } = batchData;

  const batchExists = await Batch.findOne({ batchCode });
  if (batchExists) {
    throw new Error('Batch code already exists');
  }

  const batch = await Batch.create({
    batchName,
    batchCode,
    joinLink,
    coordinators,
  });

  return batch;
};

const getBatches = async () => {
  return await Batch.find().populate('coordinators', 'fullName email phone');
};

const getBatchById = async (id) => {
  const batch = await Batch.findById(id).populate('coordinators', 'fullName email phone');
  if (!batch) throw new Error('Batch not found');
  return batch;
};

const updateBatch = async (id, updateData) => {
  const batch = await Batch.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!batch) throw new Error('Batch not found');
  return batch;
};

const deleteBatch = async (id) => {
  const batch = await Batch.findByIdAndDelete(id);
  if (!batch) throw new Error('Batch not found');
  return batch;
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
};
