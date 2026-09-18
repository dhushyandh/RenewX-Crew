import { Request, Response } from "express";
import Product from "../models/Products.js";
import axios from "axios";

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
            Product.countDocuments(query).maxTimeMS(8000),
            Product.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber)
                .maxTimeMS(8000)
                .lean(),
        ]);

        return res.status(200).json({
            success: true,
            data: products,
            pagination: { total, page: pageNumber, pages: Math.ceil(total / limitNumber) }
        })
    } catch (error: any) {
        console.error("Error fetching products:", error);
        return res.status(error?.code === 50 ? 503 : 500).json({
            success: false,
            message: error?.code === 50
                ? "Product service is temporarily busy. Please try again shortly."
                : "Failed to fetch products"
        })
    }
}

// Get single product -> Get /api/v1/product/:id
export const getProduct = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id).maxTimeMS(8000)

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
const VERCEL_BLOB_API = "https://blob.vercel-storage.com";
const VERCEL_BLOB_API_VERSION = "7";

const getBlobToken = () => {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        const error: any = new Error("BLOB_READ_WRITE_TOKEN is not configured");
        error.code = "BLOB_NOT_CONFIGURED";
        throw error;
    }
    return token;
};

const sanitizeFileName = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "image";

// Store product images in Vercel Blob. MongoDB stores only the returned URL.
const uploadImageToBlob = async (file: any): Promise<string> => {
    const token = getBlobToken();
    const fileName = sanitizeFileName(file.originalname || "image");
    const pathname = "products/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + fileName;

    try {
        const response = await axios.put(VERCEL_BLOB_API + "/" + pathname, file.buffer, {
            timeout: 30000,
            maxBodyLength: Infinity,
            headers: {
                authorization: "Bearer " + token,
                "x-api-version": VERCEL_BLOB_API_VERSION,
                "x-content-type": file.mimetype || "application/octet-stream",
                access: "public",
                "x-add-random-suffix": "0",
                "x-cache-control-max-age": "31536000",
            },
        });

        const url = response.data?.url;
        if (!url || typeof url !== "string") {
            const error: any = new Error("Vercel Blob upload completed without a URL");
            error.code = "BLOB_INVALID_RESPONSE";
            throw error;
        }
        return url;
    } catch (error: any) {
        const normalized: any = new Error(
            error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            error?.message ||
            "Vercel Blob upload failed"
        );
        normalized.code = error?.code === "ECONNABORTED" ? "BLOB_TIMEOUT" : error?.code;
        normalized.status = error?.response?.status;
        throw normalized;
    }
};

const deleteBlobByUrl = async (url: string) => {
    if (!url || !url.includes(".blob.vercel-storage.com/")) return;
    try {
        await axios.post(VERCEL_BLOB_API + "/delete", { urls: [url] }, {
            timeout: 10000,
            headers: {
                authorization: "Bearer " + getBlobToken(),
                "x-api-version": VERCEL_BLOB_API_VERSION,
                "content-type": "application/json",
            },
        });
    } catch (error: any) {
        console.warn("Vercel Blob delete failed:", error?.response?.data || error?.message);
    }
};

// Create product -> POST /api/products
export const createProduct = async (req: Request, res: Response) => {
    try {
        let images: string[] = [];

        if (req.files && (req.files as any).length > 0) {
            try {
                images = await Promise.all(
                    (req.files as any).map((file: any) => uploadImageToBlob(file))
                );
            } catch (error: any) {
                console.error("Vercel Blob upload failed during product creation:", { message: error?.message, status: error?.status, code: error?.code });
                return res.status(error?.code === "BLOB_TIMEOUT" ? 504 : 503).json({
                    success: false,
                    message: "Image storage is temporarily unavailable. Please try again.",
                });
            }
        }

        if (images.length === 0 && req.body.images) {
            if (Array.isArray(req.body.images)) {
                images = req.body.images;
            } else if (typeof req.body.images === "string") {
                images = [req.body.images];
            }
        }

        let sizes = req.body.sizes || [];
        if (typeof sizes === "string") {
            sizes = sizes.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
        }
        if (!Array.isArray(sizes)) sizes = [sizes];

        const validCategories = ["Men", "Women", "Kids", "Shoes", "Bags", "Bag", "Other"];
        let category = req.body.category || "Other";
        const matchedCat = validCategories.find(c => c.toLowerCase() === String(category).toLowerCase());
        category = matchedCat || "Other";

        const productData = {
            ...req.body,
            category,
            price: Number(req.body.price),
            stock: Number(req.body.stock || 0),
            isFeatured: req.body.isFeatured === "true" || req.body.isFeatured === true,
            images,
            sizes,
        };

        const product = await Product.create(productData);
        return res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        console.error("Error creating product in ProductController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create product",
        });
    }
};

// Update product -> PUT /api/products/:id
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

        if (req.files && (req.files as any).length > 0) {
            try {
                const newImages = await Promise.all(\n                    (req.files as any).map((file: any) => uploadImageToBlob(file))\n                );
                images = [...images, ...newImages];
            } catch (error: any) {
                console.error("Vercel Blob upload failed during product update:", { message: error?.message, status: error?.status, code: error?.code });
                return res.status(error?.code === "BLOB_TIMEOUT" ? 504 : 503).json({
                    success: false,
                    message: "Image storage is temporarily unavailable. The product was not changed. Please try again.",
                });
            }
        }

        const updates: any = { ...req.body };

        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
        if (req.body.isFeatured !== undefined) {
            updates.isFeatured = req.body.isFeatured === "true" || req.body.isFeatured === true;
        }

        if (req.body.category) {
            const validCategories = ["Men", "Women", "Kids", "Shoes", "Bags", "Bag", "Other"];
            const matchedCat = validCategories.find(c => c.toLowerCase() === String(req.body.category).toLowerCase());
            updates.category = matchedCat || "Other";
        }

        let sizes = req.body.sizes || req.body.size;
        if (sizes) {
            if (typeof sizes === "string") {
                try {
                    sizes = JSON.parse(sizes);
                } catch {
                    sizes = sizes.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");
                }
            }
            if (!Array.isArray(sizes)) sizes = [sizes];
            updates.sizes = sizes;
        }

        if (images.length > 0 || req.body.existingImages !== undefined) {
            updates.images = images;
        }

        delete updates.existingImages;
        delete updates.size;

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "product not found" });
        }

        return res.status(200).json({ success: true, data: product });
    } catch (error: any) {
        console.error("Error updating product in ProductController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update product",
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
        // Delete Vercel Blob images. Legacy Cloudinary URLs are left untouched
        // so existing products remain usable during migration.
        if (product.images && product.images.length > 0) {
            await Promise.all(product.images.map((imageUrl) => deleteBlobByUrl(imageUrl)));
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
