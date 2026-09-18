import express from 'express'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/ProductController.js';
import { authorize, protect } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';

const productRoutes = express.Router();

productRoutes.get('/', getProducts);
productRoutes.get('/:id', getProduct);

// Authenticate and authorize before accepting multipart data into memory.
productRoutes.post('/', protect, authorize('admin'), upload.array('images', 5), createProduct);
productRoutes.put('/:id', protect, authorize('admin'), upload.array('images', 5), updateProduct);
productRoutes.delete('/:id', protect, authorize('admin'), deleteProduct);

export default productRoutes;
