import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

// Use memory storage instead of disk storage - uploads directly to Cloudinary
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// Single image upload
export const uploadSingle = upload.single('image');

// Multiple images upload (for gallery) - accepts both 'image' (cover) and 'images' (gallery)
export const uploadMultiple = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

