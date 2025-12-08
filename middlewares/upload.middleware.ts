import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

// Use memory storage instead of disk storage - uploads directly to Cloudinary
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// File filter for videos
const videoFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = /mp4|mov|avi|wmv|flv|webm|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /video\//.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'));
  }
};

// Combined filter for images and videos
const mediaFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const isImage = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase()) && /image\//.test(file.mimetype);
  const isVideo = /mp4|mov|avi|wmv|flv|webm|mkv/.test(path.extname(file.originalname).toLowerCase()) && /video\//.test(file.mimetype);

  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
  fileFilter: imageFilter,
});

export const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
  },
  fileFilter: videoFilter,
});

export const uploadMedia = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (for videos)
  },
  fileFilter: mediaFilter,
});

// Single image upload
export const uploadSingle = upload.single('image');

// Multiple images and videos upload - accepts 'image' (cover), 'images' (gallery), and 'videos'
export const uploadMultiple = uploadMedia.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 20 },
  { name: 'videos', maxCount: 10 }
]);

