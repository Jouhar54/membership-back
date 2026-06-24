import * as membershipService from '../services/membership.service.js';
import { successResponse } from '../utils/response.js';

const register = async (req, res, next) => {
  try {
    const membership = await membershipService.registerMembership(req.user._id, req.body.batchId);
    successResponse(res, 201, 'Registered for membership successfully', { membership });
  } catch (error) {
    next(error);
  }
};

const getMyMemberships = async (req, res, next) => {
  try {
    const memberships = await membershipService.getMyMemberships(req.user._id);
    successResponse(res, 200, 'Memberships retrieved', { memberships });
  } catch (error) {
    next(error);
  }
};

const getMembershipById = async (req, res, next) => {
  try {
    const membership = await membershipService.getMembershipById(req.params.id);
    successResponse(res, 200, 'Membership retrieved', { membership });
  } catch (error) {
    next(error);
  }
};

const getMembershipsByBatch = async (req, res, next) => {
  try {
    const memberships = await membershipService.getMembershipsByBatch(req.params.batchId);
    successResponse(res, 200, 'Batch memberships retrieved', { memberships });
  } catch (error) {
    next(error);
  }
};

const markAsPaid = async (req, res, next) => {
  try {
    const membership = await membershipService.markAsPaid(req.params.id, req.user._id);
    successResponse(res, 200, 'Payment marked as paid', { membership });
  } catch (error) {
    next(error);
  }
};

const approveMembership = async (req, res, next) => {
  try {
    const membership = await membershipService.approveMembership(req.params.id, req.user._id);
    successResponse(res, 200, 'Membership approved', { membership });
  } catch (error) {
    next(error);
  }
};

const rejectMembership = async (req, res, next) => {
  try {
    const membership = await membershipService.rejectMembership(req.params.id, req.user._id);
    successResponse(res, 200, 'Membership rejected', { membership });
  } catch (error) {
    next(error);
  }
};

export { 
  register,
  getMyMemberships,
  getMembershipById,
  getMembershipsByBatch,
  markAsPaid,
  approveMembership,
  rejectMembership,
 };
