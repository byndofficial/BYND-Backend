import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// Memory storage — files are held as a Buffer on req.file(s) and streamed
// straight to Cloudinary from services/cloudinary.service.js. Nothing is
// ever written to local disk, which matters on most PaaS hosts (e.g.
// Render) where the filesystem is ephemeral/read-only.
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB per file — re-checked here, not just client-side

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    cb(ApiError.badRequest('Only JPG, PNG, or WEBP images are allowed.'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_BYTES },
});

// Usage:
//   router.post('/products', upload.array('images', 8), controller)
//   router.post('/hero-slides', upload.single('image'), controller)
export default upload;
