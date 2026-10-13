import multer from 'multer';

// Store files in memory buffer before sending to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Ignore signature field if still sent by client/cached frontend
  if (file.fieldname === 'signature') {
    return cb(null, false);
  }

  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default upload;
