
import express from 'express'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/ProductController.js';
import { authorize, protect } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';


const productRoutes = express.Router();

productRoutes.get('/', getProducts)

productRoutes.get('/:id', getProduct);

productRoutes.post('/', upload.array('images', 5), protect, authorize('admin'), createProduct)

productRoutes.put('/:id', upload.array('images', 5), protect, authorize('admin'), updateProduct)

productRoutes.delete('/:id', protect, authorize('admin'), deleteProduct)


export default productRoutes;