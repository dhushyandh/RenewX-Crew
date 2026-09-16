import { Request, Response } from "express";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";

// Get all products -> Get /api/v1/product?page=1&limit=10
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const query: any = { isActive: true }

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        return res.status(200).json({
            success: true,
            data: products,
            pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

// Get single product -> Get /api/v1/product/:id
export const getProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id)

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }
        return res.status(200).json({
            success: true,
            data: product,
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
// Create product -> POST /api/v1/product
export const createProduct = async (req: Request, res: Response) => {
    try {
        let images = [];

        // Handle file uploads
        if (req.files && (req.files as any).length > 0) {
            const uploadPromises = (req.files as any).map((file: any) => {
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'ecommerce/products' },
                        (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result!.secure_url);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            });
            images = await Promise.all(uploadPromises);
        }
        let sizes = req.body.sizes || [];
        if (typeof sizes === 'string') {
            sizes = sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        }
        // Ensure thery are arrays
        if (!Array.isArray(sizes)) sizes = [sizes];

        const productData = {
            ...req.body,
            images: images,
            sizes
        }
        if (images.length === 0) {
            return res.status(400).json({ success: false, message: 'please upload one image atleast' })
        }
        const product = await Product.create(productData)
        return res.status(201).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Update product -> PUT /api/v1/product/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        if (req.body.existingImages) {
            if (Array.isArray(req.body.existingImages)) {
                images = [...req.body.existingImages]
            }
            else {
                images = [req.body.existingImages]
            }
        }

        // Handle file uploads
        if (req.files && (req.files as any).length > 0) {
            const uploadPromises = (req.files as any).map((file: any) => {
                return new Promise<string>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'ecommerce/products' },
                        (error: any, result: any) => {
                            if (error) reject(error);
                            else resolve(result!.secure_url);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
            });
            const newImages = await Promise.all(uploadPromises);
            images = [...images, ...newImages];
        }

        const updates = { ...req.body }
        if (req.body.size) {
            let sizes = req.body.sizes
            if (typeof sizes === 'string') {
                try {
                    sizes = JSON.parse(sizes)
                } catch (error: any) {
                    sizes = sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== "")
                }
            }
            if (!Array.isArray(sizes)) {
                return res.status(400).json({ success: false, message: 'Invalid sizes format' })
                updates.sizes = sizes
            }
            if (req.body.existingImages || (req.files as any).length > 0) {
                updates.images = images;
            }
            delete updates.existingImages
        }
        const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'product not found'
            })
        }
        return res.status(200).json({
            success: true,
            data: product
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// Delete product -> DELETE /api/v1/product/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'product not found'
            })
        }
        // Delete images from cloudinary
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map((imageUrl) => {
                const publicIdMatch = imageUrl.match(/\/v\d+\/([^/]+)\.\w+$/);
                const publicId = publicIdMatch ? publicIdMatch[1] : null;
                if (publicId) {
                    return cloudinary.uploader.destroy(publicId);
                }
                return Promise.resolve();
            })
            await Promise.all(deletePromises);
        }
        await Product.findByIdAndDelete(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'product deleted successfully'
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
