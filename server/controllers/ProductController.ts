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
        let images: string[] = [];

        // Handle file uploads
        if (req.files && (req.files as any).length > 0) {
            try {
                const uploadPromises = (req.files as any).map((file: any) => {
                    return new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'ecommerce/products' },
                            (error: any, result: any) => {
                                if (error) {
                                    console.error("Cloudinary upload error:", error);
                                    reject(error);
                                } else {
                                    resolve(result!.secure_url);
                                }
                            }
                        );
                        uploadStream.end(file.buffer);
                    });
                });
                images = await Promise.all(uploadPromises);
            } catch (cloudErr: any) {
                console.error("Cloudinary upload failed, using fallback:", cloudErr.message);
                images = [
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"
                ];
            }
        }

        if (images.length === 0 && req.body.images) {
            if (Array.isArray(req.body.images)) {
                images = req.body.images;
            } else if (typeof req.body.images === 'string') {
                images = [req.body.images];
            }
        }

        if (images.length === 0) {
            images = [
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"
            ];
        }

        let sizes = req.body.sizes || [];
        if (typeof sizes === 'string') {
            sizes = sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        }
        if (!Array.isArray(sizes)) sizes = [sizes];

        const category = req.body.category || 'Other';

        const productData = {
            ...req.body,
            category,
            price: Number(req.body.price),
            stock: Number(req.body.stock || 0),
            isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
            images: images,
            sizes
        };

        const product = await Product.create(productData);
        return res.status(201).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        console.error("Error creating product in ProductController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create product"
        });
    }
};

// Update product -> PUT /api/v1/product/:id
export const updateProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        if (req.body.existingImages) {
            if (Array.isArray(req.body.existingImages)) {
                images = [...req.body.existingImages];
            } else {
                images = [req.body.existingImages];
            }
        }

        // Handle file uploads
        if (req.files && (req.files as any).length > 0) {
            try {
                const uploadPromises = (req.files as any).map((file: any) => {
                    return new Promise<string>((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            { folder: 'ecommerce/products' },
                            (error: any, result: any) => {
                                if (error) {
                                    console.error("Cloudinary upload error in update:", error);
                                    reject(error);
                                } else {
                                    resolve(result!.secure_url);
                                }
                            }
                        );
                        uploadStream.end(file.buffer);
                    });
                });
                const newImages = await Promise.all(uploadPromises);
                images = [...images, ...newImages];
            } catch (cloudErr: any) {
                console.error("Cloudinary upload error in updateProduct:", cloudErr.message);
            }
        }

        const updates: any = { ...req.body };

        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
        if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

        let sizes = req.body.sizes || req.body.size;
        if (sizes) {
            if (typeof sizes === 'string') {
                try {
                    sizes = JSON.parse(sizes);
                } catch (error: any) {
                    sizes = sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== "");
                }
            }
            if (!Array.isArray(sizes)) {
                sizes = [sizes];
            }
            updates.sizes = sizes;
        }

        if (images.length > 0 || req.body.existingImages !== undefined) {
            updates.images = images;
        }
        delete updates.existingImages;
        delete updates.size;

        const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'product not found'
            });
        }
        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error: any) {
        console.error("Error updating product in ProductController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update product"
        });
    }
};

// Delete product -> DELETE /api/v1/product/:id
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'product not found'
            });
        }
        // Delete images from cloudinary
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map((imageUrl) => {
                const publicIdMatch = imageUrl.match(/\/v\d+\/([^/]+)\.\w+$/);
                const publicId = publicIdMatch ? publicIdMatch[1] : null;
                if (publicId) {
                    return cloudinary.uploader.destroy(publicId).catch(() => {});
                }
                return Promise.resolve();
            });
            await Promise.all(deletePromises);
        }
        await Product.findByIdAndDelete(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'product deleted successfully'
        });
    } catch (error: any) {
        console.error("Error deleting product in ProductController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete product"
        });
    }
};
