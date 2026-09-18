import { useAuth } from "@clerk/expo";

import api, { getAuthHeaders } from "@/constants/api";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import { Product } from "@/constants/types";
import { useAppRefresh } from "./RefreshContext";

export type CartItem = {
    id: string;
    product: Product;
    productId: string;
    userId: string;
    quantity: number;
    size: string;
    price: number;
    createdAt: string;
    updatedAt: string;
};

export type CartContextType = {
    cartItems: CartItem[];

    addToCart: (
        product: Product,
        size: string,
    ) => Promise<void>;

    removeFromCart: (
        productId: string,
        size: string,
    ) => Promise<void>;

    updateQuantity: (
        productId: string,
        size: string,
        quantity: number,
    ) => Promise<void>;

    clearCart: () => Promise<void>;

    cartTotal: number;
    itemCount: number;
    isLoading: boolean;

    fetchCart: () => Promise<void>;
};

const CartContext =
    createContext<CartContextType | undefined>(
        undefined,
    );

export function CartProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [cartItems, setCartItems] =
        useState<CartItem[]>([]);

    const [cartTotal, setCartTotal] =
        useState(0);

    const [isLoading, setIsLoading] =
        useState(false);

    const { isSignedIn, getToken } = useAuth();

    const { registerRefreshHandler } =
        useAppRefresh();

    const fetchCart = useCallback(async () => {
        if (!isSignedIn) {
            setCartItems([]);
            setCartTotal(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.get("/cart", authConfig);
            const serverCart = response.data?.data;

            if (!response.data?.success || !serverCart) {
                throw new Error("Invalid cart response");
            }

            const mappedItems: CartItem[] = (Array.isArray(serverCart.items) ? serverCart.items : [])
                .filter((item: any) => item?.product?._id)
                .map((item: any) => ({
                    id: String(item._id),
                    product: item.product,
                    productId: String(item.product._id),
                    userId: String(serverCart.user ?? ""),
                    quantity: item.quantity,
                    size: item.size ?? "",
                    price: Number(item.price ?? item.product.price ?? 0),
                    createdAt: item.createdAt ?? serverCart.createdAt ?? new Date().toISOString(),
                    updatedAt: item.updatedAt ?? serverCart.updatedAt ?? new Date().toISOString(),
                }));

            setCartItems(mappedItems);
            setCartTotal(Number(serverCart.totalAmount ?? 0));
        } catch (error) {
            console.error("Failed to fetch cart:", error);
            setCartItems([]);
            setCartTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [isSignedIn, getToken]);

    /*
     * Register cart refresh globally.
     */
    useEffect(() => {
        return registerRefreshHandler(
            fetchCart,
        );
    }, [registerRefreshHandler, fetchCart]);

    /*
     * Initial cart load.
     */
    useEffect(() => {
        void fetchCart();
    }, [fetchCart]);

    const addToCart = async (
        product: Product,
        size: string,
    ) => {
        if (!isSignedIn) throw new Error("Authentication required");
        if (!product?._id || !size?.trim()) throw new Error("Product and size are required");

        setIsLoading(true);
        try {
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.post("/cart/add", {
                productId: product._id,
                quantity: 1,
                size: size.trim(),
            }, authConfig);

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to add item to cart");
            }
            await fetchCart();
        } catch (error) {
            console.error("Failed to add item to cart:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromCart = async (
        productId: string,
        size: string,
    ) => {
        if (!isSignedIn) throw new Error("Authentication required");
        setIsLoading(true);
        try {
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.delete(
                `/cart/remove/${productId}?size=${encodeURIComponent(size)}`,
                authConfig,
            );
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to remove item");
            }
            await fetchCart();
        } catch (error) {
            console.error("Failed to remove cart item:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const updateQuantity = async (
        productId: string,
        size: string,
        quantity: number,
    ) => {
        if (!isSignedIn) throw new Error("Authentication required");
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100) {
            throw new Error("Quantity must be an integer between 0 and 100");
        }

        setIsLoading(true);
        try {
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.put(
                `/cart/update/${productId}`,
                { quantity, size },
                authConfig,
            );
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to update cart item");
            }
            await fetchCart();
        } catch (error) {
            console.error("Failed to update cart item:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const clearCart = async () => {
        if (!isSignedIn) {
            setCartItems([]);
            setCartTotal(0);
            return;
        }

        setIsLoading(true);
        try {
            const authConfig = await getAuthHeaders(getToken);
            const response = await api.delete("/cart", authConfig);
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to clear cart");
            }
            setCartItems([]);
            setCartTotal(0);
        } catch (error) {
            console.error("Failed to clear cart:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const itemCount = cartItems.reduce(
        (sum, item) =>
            sum + item.quantity,
        0,
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartTotal,
                itemCount,
                isLoading,
                fetchCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart must be used within CartProvider",
        );
    }

    return context;
}