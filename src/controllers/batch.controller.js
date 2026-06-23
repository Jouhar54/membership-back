const batchService = require('../services/batch.service');
const { successResponse } = require('../utils/response');

const createBatch = async (req, res, next) => {
  try {
    const batch = await batchService.createBatch(req.body);
    successResponse(res, 201, 'Batch created successfully', { batch });
  } catch (error) {
    next(error);
  }
};

const getBatches = async (req, res, next) => {
  try {
    const batches = await batchService.getBatches();
    successResponse(res, 200, 'Batches retrieved', { batches });
  } catch (error) {
    next(error);
  }
};

const getBatchById = async (req, res, next) => {
  try {
    const batch = await batchService.getBatchById(req.params.id);
    successResponse(res, 200, 'Batch retrieved', { batch });
  } catch (error) {
    next(error);
  }
};

const updateBatch = async (req, res, next) => {
  try {
    const batch = await batchService.updateBatch(req.params.id, req.body);
    successResponse(res, 200, 'Batch updated', { batch });
  } catch (error) {
    next(error);
  }
};

const deleteBatch = async (req, res, next) => {
  try {
    await batchService.deleteBatch(req.params.id);
    successResponse(res, 200, 'Batch deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
};
