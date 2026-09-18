import { Request, Response } from "express";
import Product from "../models/Products.js";
import cloudinary from "../config/cloudinary.js";

// Get all products -> Get /api/products?page=1&limit=10
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 50, category, search } = req.query;
        const query: any = { isActive: true };

        if (category && category !== 'All' && category !== 'all') {
            query.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }

        if (search) {
            query.$or = [
                { name: { $regex: search as string, $options: 'i' } },
                { description: { $regex: search as string, $options: 'i' } }
            ];
        }

        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(50, Math.max(1, Number(limit) || 50));
        const skip = (pageNumber - 1) * limitNumber;

        // Run count and data query in parallel. lean() avoids the overhead of
        // creating full Mongoose documents for a read-only product listing.
        const [total, products] = await Promise.all([
            Product.countDocuments(query),
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .lean(),
        ]);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: { total, page: pageNumber, pages: Math.ceil(total / limitNumber) }
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

        // Handle file uploads with Cloudinary
        if (req.files && (req.files as any).length > 0) {
            try {
                const uploadPromises = (req.files as any).map((file: any) => {
                    return new Promise<string>((resolve, reject) => {
                        const timer = setTimeout(() => {
                            reject(new Error("Cloudinary upload timed out after 25s"));
                        }, 25000);

                        try {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'ecommerce/products' },
                                (error: any, result: any) => {
                                    clearTimeout(timer);
                                    if (error || !result?.secure_url) {
                                        console.error("Cloudinary upload error:", error);
                                        reject(error || new Error("Failed to get image secure_url"));
                                    } else {
                                        resolve(result.secure_url);
                                    }
                                }
                            );
                            uploadStream.end(file.buffer);
                        } catch (streamErr) {
                            clearTimeout(timer);
                            reject(streamErr);
                        }
                    });
                });
                images = await Promise.all(uploadPromises);
            } catch (cloudErr: any) {
                console.error("Cloudinary upload failed:", cloudErr.message);
                return res.status(502).json({
                    success: false,
                    message: "Failed to upload product images to cloud storage. Please check Cloudinary configuration or use image URLs."
                });
            }
        }

        if (images.length === 0 && req.body.images) {
            const rawImages = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
            images = rawImages.filter((img: any) => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://') || (img.startsWith('data:') && img.length < 20000)));
        }

        let sizes = req.body.sizes || [];
        if (typeof sizes === 'string') {
            sizes = sizes.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        }
        if (!Array.isArray(sizes)) sizes = [sizes];

        const validCategories = ['Men', 'Women', 'Kids', 'Shoes', 'Bags', 'Bag', 'Other'];
        let category = req.body.category || 'Other';
        const matchedCat = validCategories.find(c => c.toLowerCase() === String(category).toLowerCase());
        category = matchedCat || 'Other';

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
                        const timer = setTimeout(() => {
                            reject(new Error("Cloudinary update upload timed out after 25s"));
                        }, 25000);

                        try {
                            const uploadStream = cloudinary.uploader.upload_stream(
                                { folder: 'ecommerce/products' },
                                (error: any, result: any) => {
                                    clearTimeout(timer);
                                    if (error || !result?.secure_url) {
                                        console.error("Cloudinary upload error in update:", error);
                                        reject(error || new Error("Failed to get image secure_url"));
                                    } else {
                                        resolve(result.secure_url);
                                    }
                                }
                            );
                            uploadStream.end(file.buffer);
                        } catch (streamErr) {
                            clearTimeout(timer);
                            reject(streamErr);
                        }
                    });
                });
                const newImages = await Promise.all(uploadPromises);
                images = [...images, ...newImages];
            } catch (cloudErr: any) {
                console.error("Cloudinary upload error in updateProduct:", cloudErr.message);
                return res.status(502).json({
                    success: false,
                    message: "Failed to upload product images to cloud storage. Please check Cloudinary configuration or use image URLs."
                });
            }
        }

        const updates: any = { ...req.body };

        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
        if (req.body.isFeatured !== undefined) updates.isFeatured = req.body.isFeatured === 'true' || req.body.isFeatured === true;

        if (req.body.category) {
            const validCategories = ['Men', 'Women', 'Kids', 'Shoes', 'Bags', 'Bag', 'Other'];
            const matchedCat = validCategories.find(c => c.toLowerCase() === String(req.body.category).toLowerCase());
            updates.category = matchedCat || 'Other';
        }

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
