import * as adminService from '../services/admin.service.js';
import * as pdfExportService from '../services/pdfExportService.js';
import * as cardService from '../services/card.service.js';
import MembershipApplication from '../models/MembershipApplication.js';
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
    const { password } = req.body;
    await adminService.deleteBatchAdmin(req.params.id, req.user._id, password);
    successResponse(res, 200, 'Batch admin deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Export filtered members list as a downloadable A4 Landscape PDF
 * GET /api/v1/admin/members/export/pdf
 */
const exportMembersPdf = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const filename = `aalia-members-report-${today}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    await pdfExportService.generateMembersListPdf(res, {
      user: req.user,
      filters: req.query,
    });
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    next(error);
  }
};

/**
 * Export individual member record dossier as a downloadable A4 Portrait PDF
 * GET /api/v1/admin/members/:id/export/pdf
 */
const exportMemberDetailPdf = async (req, res, next) => {
  try {
    const memberId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    const filename = `aalia-member-${memberId}-${today}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    await pdfExportService.generateIndividualMemberPdf(res, {
      memberId,
      user: req.user,
    });
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    next(error);
  }
};

const exportMemberCardPdf = async (req, res, next) => {
  try {
    const application = await MembershipApplication.findById(req.params.id).populate('batch');
    if (!application) {
      const err = new Error('Member record not found');
      err.statusCode = 404;
      throw err;
    }
    if (req.user?.role === 'batch_admin') {
      const memberBatchId = application.batch?._id?.toString() || application.batch?.toString();
      if (memberBatchId !== req.user.batch?.toString()) {
        const err = new Error('You are not authorized to export member records belonging to another batch.');
        err.statusCode = 403;
        throw err;
      }
    }
    if (application.membershipStatus !== 'approved') {
      const err = new Error('Membership card is available only for approved applications.');
      err.statusCode = 400;
      throw err;
    }

    const format = req.query.format === 'cr80' ? 'cr80' : 'a4';
    const safeId = (application.membershipId || application._id.toString()).replace(/[/\\?%*:|"<>]/g, '-');
    const filename = `aalia-card-${safeId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    await cardService.generateCardPdf(application, res, format);
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    next(error);
  }
};

const exportBatchCardsPdf = async (req, res, next) => {
  try {
    const query = await pdfExportService.buildExportQuery(req.user, req.query);
    query.membershipStatus = 'approved';

    const applications = await MembershipApplication.find(query).populate('batch').sort({ createdAt: -1 });
    if (!applications || applications.length === 0) {
      const err = new Error('No approved applications found matching the selected filters.');
      err.statusCode = 404;
      throw err;
    }

    const today = new Date().toISOString().split('T')[0];
    const filename = `aalia-membership-cards-${today}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    await cardService.generateBatchCardsPdf(applications, res);
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    next(error);
  }
};

export {
  createBatchAdmin,
  getBatchAdmins,
  getBatchAdminById,
  updateBatchAdmin,
  deleteBatchAdmin,
  exportMembersPdf,
  exportMemberDetailPdf,
  exportMemberCardPdf,
  exportBatchCardsPdf,
};
