import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to locate the campaign poster template
const getTemplatePath = () => {
  const candidates = [
    path.resolve(__dirname, '../assets/poster-template.png'),
    path.resolve(process.cwd(), 'src/assets/poster-template.png'),
    path.resolve(__dirname, '../../../membership-front/src/assets/image.png'),
    path.resolve(process.cwd(), '../membership-front/src/assets/image.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return candidates[0];
};

const drawFallbackPhoto = (ctx, user, bx, by, bw, bh) => {
  ctx.fillStyle = '#16213e';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px sans-serif';
  const initials = (user?.fullName || 'M')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  ctx.fillText(initials || 'A', bx + bw / 2, by + bh / 2 + 25);
};

const generatePoster = async (user, membershipId) => {
  try {
    const templatePath = getTemplatePath();
    const template = await loadImage(templatePath);

    const width = template.width;
    const height = template.height;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw Template Base Poster
    ctx.drawImage(template, 0, 0, width, height);

    // 2. White space rounded rectangle bounds
    // Coordinates matching the white placeholder in the template:
    // x: 199, y: 284, width: 300, height: 379, corner radius: 45
    const bx = 199;
    const by = 284;
    const bw = 300;
    const bh = 379;
    const radius = 45;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bw, bh, radius);
    } else {
      ctx.moveTo(bx + radius, by);
      ctx.lineTo(bx + bw - radius, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
      ctx.lineTo(bx + bw, by + bh - radius);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
      ctx.lineTo(bx + radius, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
      ctx.lineTo(bx, by + radius);
      ctx.quadraticCurveTo(bx, by, bx + radius, by);
      ctx.closePath();
    }
    ctx.clip();

    // 3. Draw Member Profile Photo (with object-fit cover scaling)
    if (user?.profilePhoto) {
      try {
        const photo = await loadImage(user.profilePhoto);
        const scale = Math.max(bw / photo.width, bh / photo.height);
        const sw = bw / scale;
        const sh = bh / scale;
        const sx = (photo.width - sw) / 2;
        const sy = (photo.height - sh) / 2;

        ctx.fillStyle = '#0f3460';
        ctx.fillRect(bx, by, bw, bh);
        ctx.drawImage(photo, sx, sy, sw, sh, bx, by, bw, bh);
      } catch (err) {
        console.error('Failed to load profile photo on canvas:', err.message);
        drawFallbackPhoto(ctx, user, bx, by, bw, bh);
      }
    } else {
      drawFallbackPhoto(ctx, user, bx, by, bw, bh);
    }

    ctx.restore();

    // 4. Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // 5. Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'aalia_posters' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Error generating poster:', error);
    throw new Error('Failed to generate poster');
  }
};

export { generatePoster };
