import { createCanvas, loadImage } from 'canvas';
import cloudinary from '../config/cloudinary.js';

const generatePoster = async (user, membershipId) => {
  try {
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles
    ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(78, 205, 196, 0.05)';
    ctx.beginPath();
    ctx.arc(700, 900, 250, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Title / Header
    ctx.font = 'bold 45px sans-serif';
    ctx.fillStyle = '#e94560';
    ctx.textAlign = 'center';
    ctx.fillText('AALIA MEMBERSHIP', width / 2, 100);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#8f94fb';
    ctx.fillText('Official Member Card', width / 2, 135);

    // 3. Draw Profile Picture
    const imgSize = 220;
    const imgX = (width - imgSize) / 2;
    const imgY = 180;

    if (user.profilePhoto) {
      try {
        const img = await loadImage(user.profilePhoto);
        
        ctx.save();
        ctx.beginPath();
        // Circular clipping
        ctx.arc(width / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();

        // Border around photo
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(width / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error('Failed to load profile photo on canvas:', err.message);
        // Draw placeholder if image fails to load
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(width / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw placeholder circle
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(width / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Card / Details Box
    const boxX = 100;
    const boxY = 470;
    const boxWidth = 600;
    const boxHeight = 400;
    const cornerRadius = 20;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius) : ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    // 5. Draw Details
    ctx.textAlign = 'left';
    
    // Member Name
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(user.fullName.toUpperCase(), boxX + 50, boxY + 80);

    // Membership ID
    ctx.font = 'normal 22px sans-serif';
    ctx.fillStyle = '#8f94fb';
    ctx.fillText('MEMBERSHIP ID', boxX + 50, boxY + 150);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#e94560';
    ctx.fillText(membershipId, boxX + 50, boxY + 190);

    // District
    ctx.font = 'normal 22px sans-serif';
    ctx.fillStyle = '#8f94fb';
    ctx.fillText('DISTRICT', boxX + 350, boxY + 150);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(user.district || 'NOT SPECIFIED', boxX + 350, boxY + 190);

    // Batch Details (if provided)
    if (user.batchName) {
      ctx.font = 'normal 22px sans-serif';
      ctx.fillStyle = '#8f94fb';
      ctx.fillText('BATCH', boxX + 50, boxY + 270);
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(user.batchName, boxX + 50, boxY + 310);
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Upload to Cloudinary
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
