import { createCanvas, loadImage } from 'canvas';
import cloudinary from '../config/cloudinary.js';

const generatePoster = async (user, membershipId) => {
  try {
    // Basic canvas setup (Mock placeholder until template is provided)
    const width = 800;
    const height = 1000;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw Title
    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.fillText('AALIA MEMBERSHIP', width / 2, 100);

    // Draw User Info
    ctx.font = '30px Arial';
    ctx.fillText(`Name: ${user.fullName}`, width / 2, 300);
    ctx.fillText(`ID: ${membershipId}`, width / 2, 350);
    ctx.fillText(`District: ${user.district || 'N/A'}`, width / 2, 400);

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

export {  generatePoster  };
