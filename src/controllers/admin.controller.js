import * as adminService from '../services/admin.service.js';
import { successResponse } from '../utils/response.js';

const createBatchAdmin = async (req, res, next) => {
  try {
    const user = await adminService.createBatchAdmin(req.body, req.user._id);
    successResponse(res, 201, 'Batch admin created successfully', { user });
  } catch (error) {
    next(error);
  }
};

const getBatchAdmins = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await adminService.getBatchAdmins({ search }, { page, limit });
    successResponse(res, 200, 'Batch admins retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

const getBatchAdminById = async (req, res, next) => {
  try {
    const admin = await adminService.getBatchAdminById(req.params.id);
    successResponse(res, 200, 'Batch admin retrieved successfully', { admin });
  } catch (error) {
    next(error);
  }
};

const updateBatchAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.updateBatchAdmin(req.params.id, req.body, req.user._id);
    successResponse(res, 200, 'Batch admin updated successfully', { admin });
  } catch (error) {
    next(error);
  }
};

const deleteBatchAdmin = async (req, res, next) => {
  try {
    await adminService.deleteBatchAdmin(req.params.id, req.user._id);
    successResponse(res, 200, 'Batch admin deleted successfully');
  } catch (error) {
    next(error);
  }
};

export {
  createBatchAdmin,
  getBatchAdmins,
  getBatchAdminById,
  updateBatchAdmin,
  deleteBatchAdmin,
};
