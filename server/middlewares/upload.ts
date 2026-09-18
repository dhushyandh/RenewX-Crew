import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5,
        fields: 20,
        fieldSize: 100 * 1024,
        parts: 30,
    },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
        }
        callback(null, true);
    },
});

export default upload;