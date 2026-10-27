import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import MembershipApplication from '../models/MembershipApplication.js';
import Batch from '../models/Batch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to locate logo
const getLogoPath = () => {
  const candidates = [
    path.resolve(__dirname, '../assets/logo.png'),
    path.resolve(process.cwd(), 'src/assets/logo.png'),
    path.resolve(__dirname, '../../../membership-front/public/aalia-logo.png'),
    path.resolve(process.cwd(), '../membership-front/public/aalia-logo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

// Formatting helpers
const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
};

const formatDateTime = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return String(dateVal);
  }
};

const formatPhone = (phone) => {
  if (!phone) return '—';
  const clean = String(phone).trim();
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean;
};

// Safe image fetch with timeout
const fetchImageBuffer = async (url) => {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
};

/**
 * Build MongoDB filter query based on user role and query parameters
 */
export const buildExportQuery = async (user, filters = {}) => {
  const query = {};

  // Enforce Batch Admin role isolation
  if (user?.role === 'batch_admin') {
    if (!user.batch) {
      const err = new Error('Batch admin has no assigned batch.');
      err.statusCode = 403;
      throw err;
    }
    query.batch = user.batch;
  } else if (filters.batch && filters.batch !== 'all') {
    query.batch = filters.batch;
  } else if (filters.batchId && filters.batchId !== 'all') {
    query.batch = filters.batchId;
  }

  // Membership status filter
  if (filters.status && filters.status !== 'all') {
    query.membershipStatus = filters.status;
  } else if (filters.membershipStatus && filters.membershipStatus !== 'all') {
    query.membershipStatus = filters.membershipStatus;
  }

  // Payment status filter
  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    query.paymentStatus = filters.paymentStatus;
  }

  // District filter
  if (filters.district && filters.district !== 'all') {
    query.district = filters.district;
  }

  // Date range filter
  const start = filters.startDate || filters.fromDate;
  const end = filters.endDate || filters.toDate;
  if (start || end) {
    query.createdAt = {};
    if (start) {
      const startDate = new Date(start);
      if (!isNaN(startDate.getTime())) {
        query.createdAt.$gte = startDate;
      }
    }
    if (end) {
      const endDate = new Date(end);
      if (!isNaN(endDate.getTime())) {
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }
  }

  // Search keyword filter
  if (filters.search && filters.search.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [
      { fullName: regex },
      { email: regex },
      { phone: regex },
      { membershipId: regex },
    ];
  }

  return query;
};

/**
 * Generate Members List Tabular PDF (A4 Landscape)
 */
export const generateMembersListPdf = async (stream, { user, filters = {} }) => {
  const query = await buildExportQuery(user, filters);

  // Sorting
  const sort = {};
  if (filters.sortBy) {
    const order = filters.sortOrder === 'asc' || filters.sortOrder === '1' ? 1 : -1;
    sort[filters.sortBy] = order;
  } else {
    sort.createdAt = -1;
  }

  // Pre-load batches for fast O(1) lookup without slow per-record network populate
  const [totalCount, allBatches] = await Promise.all([
    MembershipApplication.countDocuments(query),
    Batch.find({}).select('batchName batchCode').lean(),
  ]);

  const batchMap = new Map();
  for (const b of allBatches) {
    batchMap.set(b._id.toString(), b.batchName);
  }

  // Resolve batch name for filter summary
  let batchNameLabel = 'All Batches';
  if (user?.role === 'batch_admin') {
    batchNameLabel = batchMap.get(user.batch.toString()) || 'Assigned Batch';
  } else if (query.batch) {
    batchNameLabel = batchMap.get(query.batch.toString()) || 'Specific Batch';
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Initialize PDF Document (A4 Landscape: 841.89 x 595.28 pt)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 28, bottom: 34, left: 28, right: 28 },
        bufferPages: true,
        autoFirstPage: true,
      });

      let completed = false;
      const onDone = () => {
        if (!completed) {
          completed = true;
          resolve();
        }
      };

      doc.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', onDone);
      doc.on('end', onDone);

      doc.pipe(stream);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const marginLeft = 28;
      const marginRight = 28;
      const contentWidth = pageWidth - marginLeft - marginRight; // 785.89 pt
      const marginBottom = 34;
      const maxContentY = pageHeight - marginBottom - 18;

      // Table Column Definitions (Sum = 785 pt)
      const columns = [
        { id: 'sl', label: '#', width: 24, align: 'center' },
        { id: 'id', label: 'Membership ID', width: 72, align: 'center' },
        { id: 'name', label: 'Full Name', width: 125, align: 'left' },
        { id: 'phone', label: 'Phone', width: 82, align: 'left' },
        { id: 'email', label: 'Email', width: 132, align: 'left' },
        { id: 'district', label: 'District', width: 75, align: 'left' },
        { id: 'batch', label: 'Batch', width: 80, align: 'left' },
        { id: 'payment', label: 'Payment', width: 60, align: 'center' },
        { id: 'status', label: 'Status', width: 68, align: 'center' },
        { id: 'approved', label: 'Approval Date', width: 67, align: 'center' },
      ];

      // Helper to draw document header on Page 1
      const drawPage1Header = () => {
        const logoPath = getLogoPath();
        let titleStartX = marginLeft;

        if (logoPath) {
          try {
            doc.image(logoPath, marginLeft, 28, { width: 44, height: 44 });
            titleStartX = marginLeft + 52;
          } catch {
            titleStartX = marginLeft;
          }
        }

        // Organization & Campaign title
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a');
        doc.text('AALIA & ANVARIYYA ALUMNI ASSOCIATION', titleStartX, 28);

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#2563eb');
        doc.text('IKSA MEMBERSHIP CAMPAIGN 2026', titleStartX, 44);

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569');
        doc.text('OFFICIAL MEMBERSHIP APPLICATIONS REPORT', titleStartX, 58);

        // Meta Box right-aligned
        const metaBoxX = 515;
        const metaBoxY = 28;
        const metaBoxWidth = contentWidth - (metaBoxX - marginLeft);

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
        doc.text(`Generated: ${formatDateTime(new Date())}`, metaBoxX, metaBoxY, { width: metaBoxWidth, align: 'right' });

        // Filter summary line
        const filterParts = [];
        filterParts.push(`Batch: ${batchNameLabel}`);
        if (query.district) filterParts.push(`District: ${query.district}`);
        if (query.membershipStatus) filterParts.push(`Status: ${query.membershipStatus.toUpperCase()}`);
        if (query.paymentStatus) filterParts.push(`Payment: ${query.paymentStatus.toUpperCase()}`);
        if (filters.search) filterParts.push(`Search: "${filters.search}"`);
        if (filters.startDate || filters.endDate) {
          filterParts.push(`Dates: ${filters.startDate || 'Any'} to ${filters.endDate || 'Any'}`);
        }

        doc.text(`Filters: ${filterParts.join(' | ')}`, metaBoxX, metaBoxY + 13, { width: metaBoxWidth, align: 'right' });

        // Total records pill
        const countText = `Total Records: ${totalCount}`;
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
        doc.text(countText, metaBoxX, metaBoxY + 27, { width: metaBoxWidth, align: 'right' });

        // Decorative separator bar
        doc.rect(marginLeft, 76, contentWidth, 1.5).fill('#e2e8f0');
      };

      // Helper to draw continuation header on subsequent pages
      const drawContinuationHeader = () => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b');
        doc.text('IKSA Membership Campaign 2026 — Members Report (Continued)', marginLeft, 24);
        doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
        doc.text(`Batch: ${batchNameLabel} • Total Records: ${totalCount}`, marginLeft + 350, 24, { width: contentWidth - 350, align: 'right' });
        doc.rect(marginLeft, 34, contentWidth, 0.75).fill('#e2e8f0');
      };

      // Helper to draw table header row
      const drawTableHeader = (startY) => {
        const rowHeight = 20;

        // Header background fill
        doc.rect(marginLeft, startY, contentWidth, rowHeight).fill('#1e293b');

        // Column titles
        let currX = marginLeft;
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');

        for (const col of columns) {
          doc.text(col.label, currX + 3, startY + 5.5, {
            width: col.width - 6,
            align: col.align,
            lineBreak: false,
            ellipsis: true,
          });
          currX += col.width;
        }

        return startY + rowHeight;
      };

      // 1. Draw Page 1 Top Banner & Initial Table Header
      drawPage1Header();
      let currentY = drawTableHeader(83);

      // If no records found
      if (totalCount === 0) {
        currentY += 15;
        doc.rect(marginLeft, currentY, contentWidth, 60).fill('#f8fafc').strokeColor('#cbd5e1').stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569');
        doc.text('No Membership Applications Found', marginLeft, currentY + 18, { width: contentWidth, align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
        doc.text('There are no member records matching your specified filter criteria.', marginLeft, currentY + 33, { width: contentWidth, align: 'center' });
      } else {
        // Stream records from MongoDB cursor with optimized batchSize
        const cursor = MembershipApplication.find(query)
          .select('fullName phone email district batch paymentStatus membershipStatus membershipId approvedAt createdAt')
          .sort(sort)
          .lean()
          .cursor({ batchSize: 500 });

        let rowIndex = 0;
        const rowHeight = 19;

        for await (const docRecord of cursor) {
          rowIndex += 1;

          // Check if page overflow
          if (currentY + rowHeight > maxContentY) {
            doc.addPage();
            drawContinuationHeader();
            currentY = drawTableHeader(40);
          }

          // Alternating row background
          const bgColor = rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff';
          doc.rect(marginLeft, currentY, contentWidth, rowHeight).fill(bgColor);

          // Cell border bottom
          doc.rect(marginLeft, currentY + rowHeight - 0.5, contentWidth, 0.5).fill('#e2e8f0');

          let colX = marginLeft;

          // 1. Sl No
          doc.font('Helvetica').fontSize(7).fillColor('#64748b');
          doc.text(String(rowIndex), colX + 2, currentY + 5, { width: columns[0].width - 4, align: 'center' });
          colX += columns[0].width;

          // 2. Membership ID
          const memId = docRecord.membershipId || '—';
          doc.font(docRecord.membershipId ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor(docRecord.membershipId ? '#15803d' : '#94a3b8');
          doc.text(memId, colX + 2, currentY + 5, { width: columns[1].width - 4, align: 'center', lineBreak: false, ellipsis: true });
          colX += columns[1].width;

          // 3. Full Name
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a');
          doc.text(docRecord.fullName || '—', colX + 4, currentY + 5, { width: columns[2].width - 8, align: 'left', lineBreak: false, ellipsis: true });
          colX += columns[2].width;

          // 4. Phone
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          doc.text(formatPhone(docRecord.phone), colX + 3, currentY + 5, { width: columns[3].width - 6, align: 'left', lineBreak: false, ellipsis: true });
          colX += columns[3].width;

          // 5. Email
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          doc.text(docRecord.email || '—', colX + 3, currentY + 5, { width: columns[4].width - 6, align: 'left', lineBreak: false, ellipsis: true });
          colX += columns[4].width;

          // 6. District
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          doc.text(docRecord.district || '—', colX + 3, currentY + 5, { width: columns[5].width - 6, align: 'left', lineBreak: false, ellipsis: true });
          colX += columns[5].width;

          // 7. Batch (O(1) resolution from batchMap)
          const bId = docRecord.batch?._id ? docRecord.batch._id.toString() : (docRecord.batch ? docRecord.batch.toString() : null);
          const batchTitle = (bId && batchMap.get(bId)) || docRecord.batch?.batchName || '—';
          doc.font('Helvetica').fontSize(7).fillColor('#334155');
          doc.text(batchTitle, colX + 3, currentY + 5, { width: columns[6].width - 6, align: 'left', lineBreak: false, ellipsis: true });
          colX += columns[6].width;

          // 8. Payment Status Badge
          const isPaid = docRecord.paymentStatus === 'paid';
          const payBg = isPaid ? '#dcfce7' : '#fef3c7';
          const payText = isPaid ? '#166534' : '#92400e';
          const payLabel = isPaid ? 'PAID' : 'PENDING';
          const badgeW = columns[7].width - 12;
          const badgeX = colX + 6;
          doc.roundedRect(badgeX, currentY + 3.5, badgeW, 12, 3).fill(payBg);
          doc.font('Helvetica-Bold').fontSize(6).fillColor(payText);
          doc.text(payLabel, badgeX, currentY + 5.5, { width: badgeW, align: 'center', lineBreak: false });
          colX += columns[7].width;

          // 9. Membership Status Badge
          const mStatus = docRecord.membershipStatus || 'pending';
          let statusBg = '#fef3c7';
          let statusText = '#92400e';
          let statusLabel = 'PENDING';
          if (mStatus === 'approved') {
            statusBg = '#dcfce7';
            statusText = '#166534';
            statusLabel = 'APPROVED';
          } else if (mStatus === 'rejected') {
            statusBg = '#fee2e2';
            statusText = '#991b1b';
            statusLabel = 'REJECTED';
          }
          const sBadgeW = columns[8].width - 12;
          const sBadgeX = colX + 6;
          doc.roundedRect(sBadgeX, currentY + 3.5, sBadgeW, 12, 3).fill(statusBg);
          doc.font('Helvetica-Bold').fontSize(6).fillColor(statusText);
          doc.text(statusLabel, sBadgeX, currentY + 5.5, { width: sBadgeW, align: 'center', lineBreak: false });
          colX += columns[8].width;

          // 10. Approval Date
          const appDate = docRecord.approvedAt ? formatDate(docRecord.approvedAt) : '—';
          doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
          doc.text(appDate, colX + 2, currentY + 5.5, { width: columns[9].width - 4, align: 'center', lineBreak: false });

          currentY += rowHeight;
        }
      }

      // Draw Footer with Page Numbers on all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Footer divider line
        doc.rect(marginLeft, pageHeight - marginBottom, contentWidth, 0.75).fill('#cbd5e1');

        // Footer text
        doc.font('Helvetica').fontSize(7).fillColor('#64748b');
        doc.text('IKSA Membership Campaign 2026 • Confidential Administrative Document', marginLeft, pageHeight - marginBottom + 6);

        const pageNumText = `Page ${i + 1} of ${range.count}`;
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569');
        doc.text(pageNumText, marginLeft + contentWidth - 100, pageHeight - marginBottom + 6, { width: 100, align: 'right' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Individual Member Dossier PDF (A4 Portrait)
 */
export const generateIndividualMemberPdf = async (stream, { memberId, user }) => {
  const member = await MembershipApplication.findById(memberId).populate('batch');
  if (!member) {
    const error = new Error('Membership record not found');
    error.statusCode = 404;
    throw error;
  }

  // Enforce Batch Admin authorization
  if (user?.role === 'batch_admin') {
    const memberBatchId = member.batch?._id?.toString() || member.batch?.toString();
    const userBatchId = user.batch?.toString();
    if (memberBatchId !== userBatchId) {
      const error = new Error('You are not authorized to export member records belonging to another batch.');
      error.statusCode = 403;
      throw error;
    }
  }

  return new Promise(async (resolve, reject) => {
    try {
      // A4 Portrait: 595.28 x 841.89 pt
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 32, bottom: 34, left: 36, right: 36 },
        bufferPages: true,
        autoFirstPage: true,
      });

      let completed = false;
      const onDone = () => {
        if (!completed) {
          completed = true;
          resolve();
        }
      };

      doc.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', onDone);
      doc.on('end', onDone);

      doc.pipe(stream);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const marginLeft = 36;
      const marginRight = 36;
      const contentWidth = pageWidth - marginLeft - marginRight; // 523.28 pt

      // Try fetching member photo safely
      const photoBuffer = await fetchImageBuffer(member.profilePhoto);

      // 1. Header Banner Box
      const headerHeight = 64;
      doc.roundedRect(marginLeft, 32, contentWidth, headerHeight, 6).fill('#0f172a');

      // Draw logo if exists
      const logoPath = getLogoPath();
      let headerTextX = marginLeft + 14;

      if (logoPath) {
        try {
          doc.image(logoPath, marginLeft + 12, 38, { width: 44, height: 44 });
          headerTextX = marginLeft + 66;
        } catch {
          headerTextX = marginLeft + 14;
        }
      }

      // Header Typography
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
      doc.text('AALIA & ANVARIYYA ALUMNI ASSOCIATION', headerTextX, 41);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#60a5fa');
      doc.text('IKSA MEMBERSHIP CAMPAIGN 2026', headerTextX, 56);

      doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1');
      doc.text('OFFICIAL MEMBERSHIP RECORD DOSSIER', headerTextX, 69);

      // 2. Profile Identification Card (Y: 106)
      const profileCardY = 106;
      const profileCardH = 110;
      doc.roundedRect(marginLeft, profileCardY, contentWidth, profileCardH, 6).fill('#f8fafc').strokeColor('#e2e8f0').stroke();

      // Draw Profile Photo / Avatar (x: 48, y: 116, w: 75, h: 90)
      const photoX = marginLeft + 12;
      const photoY = profileCardY + 10;
      const photoW = 75;
      const photoH = 90;

      if (photoBuffer) {
        try {
          doc.rect(photoX, photoY, photoW, photoH).fill('#e2e8f0');
          doc.image(photoBuffer, photoX, photoY, {
            fit: [photoW, photoH],
            align: 'center',
            valign: 'center',
          });
          doc.rect(photoX, photoY, photoW, photoH).strokeColor('#cbd5e1').stroke();
        } catch {
          drawAvatarFallback(doc, member.fullName, photoX, photoY, photoW, photoH);
        }
      } else {
        drawAvatarFallback(doc, member.fullName, photoX, photoY, photoW, photoH);
      }

      // Member Identity Block (next to photo)
      const infoX = photoX + photoW + 16;
      const infoW = contentWidth - (infoX - marginLeft) - 12;

      // Name
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
      doc.text(member.fullName || '—', infoX, photoY + 2, { width: infoW, lineBreak: false, ellipsis: true });

      // Batch
      const batchName = member.batch?.batchName || 'Unassigned Batch';
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Batch: ${batchName}`, infoX, photoY + 20);

      // Badges row (Membership ID + Membership Status + Payment Status)
      const badgeY = photoY + 37;

      // Membership ID Pill
      const hasId = Boolean(member.membershipId);
      const idLabel = hasId ? `ID: ${member.membershipId}` : 'ID: Pending Assignment';
      const idBg = hasId ? '#dcfce7' : '#f1f5f9';
      const idColor = hasId ? '#15803d' : '#64748b';
      doc.roundedRect(infoX, badgeY, 130, 16, 4).fill(idBg);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(idColor);
      doc.text(idLabel, infoX, badgeY + 4, { width: 130, align: 'center', lineBreak: false });

      // Membership Status Pill
      const mStatus = member.membershipStatus || 'pending';
      let mBg = '#fef3c7';
      let mColor = '#92400e';
      let mText = 'STATUS: PENDING';
      if (mStatus === 'approved') {
        mBg = '#dcfce7';
        mColor = '#15803d';
        mText = 'STATUS: APPROVED';
      } else if (mStatus === 'rejected') {
        mBg = '#fee2e2';
        mColor = '#b91c1c';
        mText = 'STATUS: REJECTED';
      }
      doc.roundedRect(infoX + 138, badgeY, 105, 16, 4).fill(mBg);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(mColor);
      doc.text(mText, infoX + 138, badgeY + 4.5, { width: 105, align: 'center', lineBreak: false });

      // Payment Status Pill
      const isPaid = member.paymentStatus === 'paid';
      const pBg = isPaid ? '#dcfce7' : '#fef3c7';
      const pColor = isPaid ? '#15803d' : '#92400e';
      const pText = isPaid ? 'PAYMENT: PAID' : 'PAYMENT: PENDING';
      doc.roundedRect(infoX + 250, badgeY, 105, 16, 4).fill(pBg);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(pColor);
      doc.text(pText, infoX + 250, badgeY + 4.5, { width: 105, align: 'center', lineBreak: false });

      // Registration & Approval timestamps
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
      const regDate = `Registered: ${formatDateTime(member.createdAt)}`;
      const appDate = member.approvedAt ? `Approved: ${formatDateTime(member.approvedAt)}` : null;
      const timeStr = appDate ? `${regDate}  |  ${appDate}` : regDate;
      doc.text(timeStr, infoX, badgeY + 24);

      // Rejection Reason banner if rejected
      let currentCardY = profileCardY + profileCardH + 12;
      if (member.membershipStatus === 'rejected') {
        doc.roundedRect(marginLeft, currentCardY, contentWidth, 32, 4).fill('#fee2e2').strokeColor('#fca5a5').stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#991b1b');
        doc.text('APPLICATION REJECTED', marginLeft + 10, currentCardY + 6);
        doc.font('Helvetica').fontSize(7.5).fillColor('#7f1d1d');
        const rejReason = member.rejectionReason || 'No specific reason recorded.';
        const rejDate = member.rejectedAt ? ` (on ${formatDate(member.rejectedAt)})` : '';
        doc.text(`Reason: ${rejReason}${rejDate}`, marginLeft + 10, currentCardY + 18, { width: contentWidth - 20, lineBreak: false, ellipsis: true });
        currentCardY += 40;
      }

      // Section Cards Helper
      const drawSectionCard = (title, fields, startY, height) => {
        // Card outer container
        doc.roundedRect(marginLeft, startY, contentWidth, height, 5).fill('#ffffff').strokeColor('#e2e8f0').stroke();

        // Section title header bar
        doc.roundedRect(marginLeft, startY, contentWidth, 20, 5).fill('#f1f5f9');
        doc.rect(marginLeft, startY + 15, contentWidth, 5).fill('#f1f5f9');
        doc.rect(marginLeft, startY + 20, contentWidth, 0.5).fill('#e2e8f0');

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
        doc.text(title.toUpperCase(), marginLeft + 10, startY + 5.5);

        // Render Fields in 2 columns
        const col1X = marginLeft + 12;
        const col2X = marginLeft + (contentWidth / 2) + 6;
        const colWidth = (contentWidth / 2) - 18;

        let fieldY = startY + 27;

        for (let i = 0; i < fields.length; i += 2) {
          const f1 = fields[i];
          const f2 = fields[i + 1];

          // Field 1
          if (f1) {
            doc.font('Helvetica').fontSize(7).fillColor('#64748b');
            doc.text(f1.label, col1X, fieldY);
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
            doc.text(String(f1.value || '—'), col1X, fieldY + 9, { width: colWidth, lineBreak: false, ellipsis: true });
          }

          // Field 2
          if (f2) {
            doc.font('Helvetica').fontSize(7).fillColor('#64748b');
            doc.text(f2.label, col2X, fieldY);
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
            doc.text(String(f2.value || '—'), col2X, fieldY + 9, { width: colWidth, lineBreak: false, ellipsis: true });
          }

          fieldY += 27;
        }

        return startY + height + 10;
      };

      // Section 1: Personal & Academic Info
      const jobDisplay = member.jobType === 'Others' && member.jobTypeOther ? `Other (${member.jobTypeOther})` : member.jobType || '—';
      currentCardY = drawSectionCard(
        'Personal Information',
        [
          { label: "Father's Name", value: member.fatherName },
          { label: 'Date of Birth', value: formatDate(member.dob) },
          { label: 'Blood Group', value: member.bloodGroup },
          { label: 'Job Type / Profession', value: jobDisplay },
        ],
        currentCardY,
        88
      );

      // Section 2: Contact Information
      currentCardY = drawSectionCard(
        'Contact Information',
        [
          { label: 'Mobile Number', value: formatPhone(member.phone) },
          { label: 'WhatsApp Number', value: formatPhone(member.whatsapp) },
          { label: 'Email Address', value: member.email },
          { label: 'State', value: member.state || 'Kerala' },
        ],
        currentCardY,
        88
      );

      // Section 3: Address & Administrative Jurisdiction
      currentCardY = drawSectionCard(
        'Address & Administrative Jurisdiction',
        [
          { label: 'House Name', value: member.houseName },
          { label: 'Place', value: member.place },
          { label: 'Post Office', value: member.post },
          { label: 'PIN Code', value: member.pin },
          { label: 'Panchayath', value: member.panchayath },
          { label: 'Mandalam', value: member.mandalam },
          { label: 'Thaluk (Taluk)', value: member.thaluk },
          { label: 'District', value: member.district },
        ],
        currentCardY,
        142
      );

      // Section 4: Membership & Verification Details
      currentCardY = drawSectionCard(
        'Membership & Verification Details',
        [
          { label: 'Assigned Batch', value: `${batchName} (${member.batch?.batchCode || '—'})` },
          { label: 'ANWARI Certificate No.', value: member.anwariCertificateNo || '—' },
          { label: 'Payment Status', value: isPaid ? 'Paid' : 'Pending' },
          { label: 'Payment Proof Uploaded', value: (member.paymentScreenshot || member.paymentProof) ? 'Yes (Verified Attached)' : 'No' },
          { label: 'Membership Status', value: (member.membershipStatus || 'pending').toUpperCase() },
          { label: 'Official Membership ID', value: member.membershipId || 'Not Yet Assigned' },
        ],
        currentCardY,
        115
      );

      // Section 5: Declaration & Signature
      doc.roundedRect(marginLeft, currentCardY, contentWidth, 54, 5).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b');
      doc.text('APPLICANT DECLARATION', marginLeft + 10, currentCardY + 6);
      doc.font('Helvetica-Oblique').fontSize(7).fillColor('#475569');
      doc.text('"I accept and agree to be bound by the bylaw of AALIA and Anvariyya."', marginLeft + 10, currentCardY + 18);
      doc.font('Helvetica').fontSize(7).fillColor('#64748b');
      const declDate = member.declarationDate ? formatDate(member.declarationDate) : formatDate(member.createdAt);
      doc.text(`Accepted: Yes  |  Declaration Date: ${declDate}`, marginLeft + 10, currentCardY + 34);

      // Footer & Page Numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        doc.rect(marginLeft, pageHeight - 34, contentWidth, 0.75).fill('#cbd5e1');

        doc.font('Helvetica').fontSize(7).fillColor('#64748b');
        doc.text(`IKSA Membership Campaign 2026 • Confidential Member Dossier • Generated: ${formatDateTime(new Date())}`, marginLeft, pageHeight - 27);

        doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569');
        doc.text(`Page ${i + 1} of ${range.count}`, marginLeft + contentWidth - 100, pageHeight - 27, { width: 100, align: 'right' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const drawAvatarFallback = (doc, name, x, y, w, h) => {
  doc.rect(x, y, w, h).fill('#e2e8f0').strokeColor('#cbd5e1').stroke();
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#475569');
  const initials = (name || 'M')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  doc.text(initials || 'IK', x, y + (h / 2) - 10, { width: w, align: 'center' });
};
