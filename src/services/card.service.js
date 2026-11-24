import { createCanvas, loadImage, registerFont } from 'canvas';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import MembershipApplication from '../models/MembershipApplication.js';
import Batch from '../models/Batch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target QR URL specified by user
const CARD_QR_URL = process.env.CARD_QR_URL || 'https://www.youtube.com/@aaliavision6927';
const CARD_VALIDITY_TEXT = process.env.CARD_VALIDITY_TEXT || 'Valid Upto 31st Dec 2029';

// Locate template paths
const getCardTemplatePaths = () => {
  const frontCandidates = [
    path.resolve(__dirname, '../assets/card-front-template.png'),
    path.resolve(process.cwd(), 'src/assets/card-front-template.png'),
  ];
  const backCandidates = [
    path.resolve(__dirname, '../assets/card-back-template.png'),
    path.resolve(process.cwd(), 'src/assets/card-back-template.png'),
  ];

  let front = null;
  let back = null;

  for (const p of frontCandidates) {
    if (fs.existsSync(p)) {
      front = p;
      break;
    }
  }
  for (const p of backCandidates) {
    if (fs.existsSync(p)) {
      back = p;
      break;
    }
  }

  return { front, back };
};

// Date formatter to DD/MM/YYYY
const formatDob = (dobStr) => {
  if (!dobStr) return '—';
  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {}
  return String(dobStr).trim();
};

// Extract completed year from batch
const extractCompletedYear = (batch) => {
  if (!batch) return '2024';
  const name = typeof batch === 'string' ? batch : (batch.batchName || batch.batchCode || '');
  const match = name.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return match[1];
  return '2024';
};

// Safe phone format
const formatMobile = (phone) => {
  if (!phone) return '—';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return String(phone).trim();
};

// Generate Card Front PNG Buffer
export const generateCardFrontBuffer = async (application) => {
  const { front: frontPath } = getCardTemplatePaths();
  if (!frontPath) {
    throw new Error('Card front template image not found.');
  }

  const template = await loadImage(frontPath);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Template Base
  ctx.drawImage(template, 0, 0, template.width, template.height);

  // 2. Draw Member Photo inside the circular frame
  // Circle frame center: cx = 197.5, cy = 333.5, inner radius = 132
  const cx = 197.5;
  const cy = 333.5;
  const radius = 132;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let photoDrawn = false;
  if (application?.profilePhoto) {
    try {
      const photo = await loadImage(application.profilePhoto);
      // Cover scaling math
      const d = radius * 2;
      const scale = Math.max(d / photo.width, d / photo.height);
      const sw = d / scale;
      const sh = d / scale;
      const sx = (photo.width - sw) / 2;
      const sy = (photo.height - sh) / 2;

      ctx.fillStyle = '#0f3460';
      ctx.fillRect(cx - radius, cy - radius, d, d);
      ctx.drawImage(photo, sx, sy, sw, sh, cx - radius, cy - radius, d, d);
      photoDrawn = true;
    } catch (err) {
      console.warn('Failed to load profile photo for card, using fallback initials:', err.message);
    }
  }

  if (!photoDrawn) {
    // Fallback initials avatar
    ctx.fillStyle = '#16213e';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = (application?.fullName || 'M')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    ctx.fillText(initials || 'A', cx, cy);
  }
  ctx.restore();

  // 3. Crisp Concentric Rings around photo for clean aesthetics
  // Cyan inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#32a4e4';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Green outer border ring
  ctx.beginPath();
  ctx.arc(cx, cy, 153.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#00bc43';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 4. Render Dynamic Details
  const startX = 405;
  const maxW = 510;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';

  // Helper with auto font scaling so long values never overflow
  const drawRow = (label, value, y, baseSize = 18, isMain = false) => {
    const text = `${label} : ${String(value || '—').toUpperCase()}`;
    let size = baseSize;
    ctx.font = (isMain ? '900 ' : 'bold ') + size + 'px Arial';
    let measuredWidth = ctx.measureText(text).width;
    while (measuredWidth > maxW && size > 11) {
      size -= 1;
      ctx.font = (isMain ? '900 ' : 'bold ') + size + 'px Arial';
      measuredWidth = ctx.measureText(text).width;
    }
    ctx.fillText(text, startX, y);
  };

  // Row 0: Full Name
  drawRow('NAME', application?.fullName || '—', 105, 23, true);

  // Row 1: Father Name
  drawRow('FATHER NAME', application?.fatherName || '—', 152, 18);

  // Row 2: House Name
  drawRow('HOUSE', application?.houseName || '—', 196, 18);

  // Row 3: Place
  drawRow('PLACE', application?.place || '—', 241, 18);

  // Row 4: District
  drawRow('DISTRICT', application?.district || '—', 285, 18);

  // Row 5: Date of Birth
  drawRow('D.O.B', formatDob(application?.dob), 330, 18);

  // Row 6: Mobile Number
  drawRow('MOBILE NUMBER', formatMobile(application?.phone), 375, 18);

  // Row 7: Completed Year
  const completedYear = extractCompletedYear(application?.batch);
  drawRow('COMPLETED YEAR', completedYear, 419, 18);

  // Row 8: Membership Number
  const memId = application?.membershipId || '2026/0001';
  drawRow('MEMBERSHIP NUMBER', memId, 463, 23, true);

  return canvas.toBuffer('image/png');
};

// Generate Card Back PNG Buffer
export const generateCardBackBuffer = async (application = null) => {
  const { back: backPath } = getCardTemplatePaths();
  if (!backPath) {
    throw new Error('Card back template image not found.');
  }

  const template = await loadImage(backPath);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  // 1. Draw Template Base
  ctx.drawImage(template, 0, 0, template.width, template.height);

  // 2. Generate and draw custom QR Code
  // The QR code links to https://www.youtube.com/@aaliavision6927 as specified
  const qrX = 763;
  const qrY = 270;
  const qrSize = 140;

  const qrBuffer = await QRCode.toBuffer(CARD_QR_URL, {
    margin: 0,
    width: qrSize,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const qrImg = await loadImage(qrBuffer);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // 3. Render clean labels below QR code (left-aligned with QR code)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // MEMBER
  ctx.fillStyle = '#262626';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('MEMBER', qrX, qrY + qrSize + 16);

  // IDENTITY CARD
  ctx.fillText('IDENTITY CARD', qrX, qrY + qrSize + 42);

  // Validity Date: "Valid Upto 31st Dec 2029"
  ctx.fillStyle = '#3f3f46';
  ctx.font = '500 15.5px Arial';
  ctx.fillText(CARD_VALIDITY_TEXT, qrX, qrY + qrSize + 72);

  return canvas.toBuffer('image/png');
};

/**
 * Generate Printable Membership Card PDF
 * @param {Object} application - MembershipApplication document
 * @param {WritableStream} outputStream - HTTP response or file stream
 * @param {String} format - 'cr80' (Plastic card size: 85.6mm x 54mm, 2 pages) or 'a4' (A4 printable sheet side-by-side)
 */
export const generateCardPdf = async (application, outputStream, format = 'cr80') => {
  const [frontBuffer, backBuffer] = await Promise.all([
    generateCardFrontBuffer(application),
    generateCardBackBuffer(application),
  ]);

  return new Promise((resolve, reject) => {
    try {
      if (format === 'a4') {
        // A4 Printable Sheet (Portrait: 595.28 x 841.89 pt)
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36,
          autoFirstPage: true,
        });

        doc.pipe(outputStream);
        doc.on('error', reject);
        outputStream.on('error', reject);
        outputStream.on('finish', resolve);
        doc.on('end', resolve);

        // Header Title
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
        doc.text("ANWARI'S ASSOCIATION FOR LOYAL ISLAMIC ACTIVITIES - AALIA", { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#15803d');
        doc.text('OFFICIAL MEMBERSHIP IDENTITY CARD', { align: 'center' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b');
        doc.text('Print at 100% scale (Actual Size / No scaling). Cut along the border guidelines to fold or laminate.', { align: 'center' });
        doc.moveDown(1.5);

        // Standard CR80 Card Dimensions in points: 242.64 pt x 153 pt (85.6mm x 53.98mm)
        const cardW = 242.64;
        const cardH = 153;
        const startY = doc.y + 15;
        const spacing = 28;
        const startX1 = (595.28 - (cardW * 2 + spacing)) / 2;
        const startX2 = startX1 + cardW + spacing;

        // Front Card Box & Image
        doc.roundedRect(startX1 - 1, startY - 1, cardW + 2, cardH + 2, 4).strokeColor('#cbd5e1').stroke();
        doc.image(frontBuffer, startX1, startY, { width: cardW, height: cardH });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
        doc.text('FRONT SIDE', startX1, startY + cardH + 7, { width: cardW, align: 'center' });

        // Back Card Box & Image
        doc.roundedRect(startX2 - 1, startY - 1, cardW + 2, cardH + 2, 4).strokeColor('#cbd5e1').stroke();
        doc.image(backBuffer, startX2, startY, { width: cardW, height: cardH });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
        doc.text('BACK SIDE', startX2, startY + cardH + 7, { width: cardW, align: 'center' });

        // Member Summary Info Box below cards
        const infoY = startY + cardH + 40;
        const infoW = cardW * 2 + spacing;
        doc.roundedRect(startX1, infoY, infoW, 75, 6).fill('#f8fafc').strokeColor('#e2e8f0').stroke();

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
        doc.text(`MEMBER: ${application?.fullName || '—'}`, startX1 + 14, infoY + 12);
        doc.font('Helvetica').fontSize(8).fillColor('#475569');
        doc.text(`Membership ID: ${application?.membershipId || '—'}   |   Batch: ${application?.batch?.batchName || '—'}`, startX1 + 14, infoY + 28);
        doc.text(`Mobile: ${application?.phone || '—'}   |   District: ${application?.district || '—'}`, startX1 + 14, infoY + 42);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
        doc.text(`Official Channel: ${CARD_QR_URL}`, startX1 + 14, infoY + 56);

        // Footer
        doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
        doc.text('AALIA Membership Campaign • Generated officially via AALIA Portal', startX1, 800, { width: infoW, align: 'center' });

        doc.end();
      } else {
        // CR80 Plastic Card Format (Page size: 242.64 x 153 pt / 85.6mm x 54mm, 2 pages)
        const doc = new PDFDocument({
          size: [242.64, 153],
          margin: 0,
          autoFirstPage: true,
        });

        doc.pipe(outputStream);
        doc.on('error', reject);
        outputStream.on('error', reject);
        outputStream.on('finish', resolve);
        doc.on('end', resolve);

        // Page 1: Front
        doc.image(frontBuffer, 0, 0, { width: 242.64, height: 153 });

        // Page 2: Back
        doc.addPage({ size: [242.64, 153], margin: 0 });
        doc.image(backBuffer, 0, 0, { width: 242.64, height: 153 });

        doc.end();
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate Batch Cards PDF for multiple members (A4 Sheet layout)
 */
export const generateBatchCardsPdf = async (applications, outputStream) => {
  const cardW = 242.64;
  const cardH = 153;
  const spacing = 28;
  const startX1 = (595.28 - (cardW * 2 + spacing)) / 2;
  const startX2 = startX1 + cardW + spacing;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        autoFirstPage: true,
      });

      doc.pipe(outputStream);
      doc.on('error', reject);
      outputStream.on('error', reject);
      outputStream.on('finish', resolve);
      doc.on('end', resolve);

      // Pre-render common back buffer
      const backBuffer = await generateCardBackBuffer();

      let isFirstPage = true;

      for (const app of applications) {
        if (!isFirstPage) {
          doc.addPage({ size: 'A4', margin: 36 });
        }
        isFirstPage = false;

        const frontBuffer = await generateCardFrontBuffer(app);

        // Title
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a');
        doc.text("ANWARI'S ASSOCIATION FOR LOYAL ISLAMIC ACTIVITIES - AALIA", { align: 'center' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#15803d');
        doc.text('OFFICIAL MEMBERSHIP IDENTITY CARD', { align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor('#64748b');
        doc.text('Print at 100% scale (Actual Size / No scaling). Cut along the border guidelines.', { align: 'center' });
        doc.moveDown(1.5);

        const startY = doc.y + 15;

        // Front Card
        doc.roundedRect(startX1 - 1, startY - 1, cardW + 2, cardH + 2, 4).strokeColor('#cbd5e1').stroke();
        doc.image(frontBuffer, startX1, startY, { width: cardW, height: cardH });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
        doc.text('FRONT SIDE', startX1, startY + cardH + 7, { width: cardW, align: 'center' });

        // Back Card
        doc.roundedRect(startX2 - 1, startY - 1, cardW + 2, cardH + 2, 4).strokeColor('#cbd5e1').stroke();
        doc.image(backBuffer, startX2, startY, { width: cardW, height: cardH });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
        doc.text('BACK SIDE', startX2, startY + cardH + 7, { width: cardW, align: 'center' });

        // Member Summary Info
        const infoY = startY + cardH + 35;
        const infoW = cardW * 2 + spacing;
        doc.roundedRect(startX1, infoY, infoW, 70, 6).fill('#f8fafc').strokeColor('#e2e8f0').stroke();

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
        doc.text(`MEMBER: ${app?.fullName || '—'}`, startX1 + 14, infoY + 12);
        doc.font('Helvetica').fontSize(8).fillColor('#475569');
        doc.text(`Membership ID: ${app?.membershipId || '—'}   |   Batch: ${app?.batch?.batchName || '—'}`, startX1 + 14, infoY + 28);
        doc.text(`Mobile: ${app?.phone || '—'}   |   District: ${app?.district || '—'}`, startX1 + 14, infoY + 42);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
        doc.text(`Official Channel: ${CARD_QR_URL}`, startX1 + 14, infoY + 54);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
