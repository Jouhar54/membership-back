import * as applicationService from '../services/application.service.js';
import { successResponse } from '../utils/response.js';

const createApplication = async (req, res, next) => {
  try {
    let profilePhotoBuffer = null;
    if (req.file) {
      profilePhotoBuffer = req.file.buffer;
    } else if (Array.isArray(req.files) && req.files.length > 0) {
      const photoFile =
        req.files.find(
          (f) => f.fieldname === 'profilePhoto' || f.fieldname === 'photo' || f.fieldname === 'image'
        ) || req.files.find((f) => f.fieldname !== 'signature') || req.files[0];
      if (photoFile) {
        profilePhotoBuffer = photoFile.buffer;
      }
    } else if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
      profilePhotoBuffer = req.files.profilePhoto[0].buffer;
    }

    const application = await applicationService.createApplication(req.body, profilePhotoBuffer);
    successResponse(res, 201, 'Application submitted successfully', { application });
  } catch (error) {
    next(error);
  }
};

const checkStatus = async (req, res, next) => {
  try {
    const { email, phone, identifier } = req.body;
    const searchKey = email || phone || identifier;
    const statusData = await applicationService.checkApplicationStatus(searchKey);
    successResponse(res, 200, 'Status retrieved successfully', statusData);
  } catch (error) {
    next(error);
  }
};

const getPoster = async (req, res, next) => {
  try {
    const posterUrl = await applicationService.getPosterById(req.params.id);
    // Redirect to the Cloudinary URL so the image loads directly
    res.redirect(posterUrl);
  } catch (error) {
    next(error);
  }
};

const listBatchApplications = async (req, res, next) => {
  try {
    let batchId = req.params.batchId;
    if (req.user && req.user.role === 'batch_admin' && req.user.batch) {
      batchId = req.user.batch.toString();
    }
    const applications = await applicationService.getApplicationsByBatch(batchId, req.query);
    successResponse(res, 200, 'Applications retrieved successfully', { applications });
  } catch (error) {
    next(error);
  }
};

const markPaid = async (req, res, next) => {
  try {
    const application = await applicationService.markAsPaid(req.params.id, req.user._id);
    successResponse(res, 200, 'Payment status updated to paid', { application });
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const application = await applicationService.approveApplication(req.params.id, req.user._id);
    successResponse(res, 200, 'Application approved and poster generated', { application });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const { reason, rejectionReason } = req.body || {};
    const reasonText = reason || rejectionReason || '';
    const application = await applicationService.rejectApplication(req.params.id, req.user._id, reasonText);
    successResponse(res, 200, 'Application rejected successfully', { application });
  } catch (error) {
    next(error);
  }
};

const getApplicationById = async (req, res, next) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    successResponse(res, 200, 'Application details retrieved successfully', { application });
  } catch (error) {
    next(error);
  }
};

export {
  createApplication,
  checkStatus,
  getPoster,
  getApplicationById,
  listBatchApplications,
  markPaid,
  approve,
  reject,
};
