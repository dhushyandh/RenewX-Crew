import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { Product } from "@/constants/types";
import { dummyCart } from "@/assets/assets";

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

    const { registerRefreshHandler } =
        useAppRefresh();

    const fetchCart = async () => {
        setIsLoading(true);

        try {
            /*
             * TODO:
             * Replace dummyCart with your real
             * cart API when backend is connected.
             */

            const serverCart = dummyCart;

            const mappedItems: CartItem[] =
                serverCart.items.map(
                    (item: any) => ({
                        id: item.product._id,
                        product: item.product,
                        productId: item.productId,
                        userId: item.userId,
                        quantity: item.quantity,
                        size: item.size,
                        price: item.product.price,
                        createdAt:
                            item.createdAt,
                        updatedAt:
                            item.updatedAt,
                    }),
                );

            setCartItems(mappedItems);

            setCartTotal(
                serverCart.totalAmount,
            );
        } catch (error) {
            console.error(
                "Failed to fetch cart:",
                error,
            );
        } finally {
            setIsLoading(false);
        }
    };

    /*
     * Register cart refresh globally.
     */
    useEffect(() => {
        return registerRefreshHandler(
            fetchCart,
        );
    }, [registerRefreshHandler]);

    /*
     * Initial cart load.
     */
    useEffect(() => {
        fetchCart();
    }, []);

    const addToCart = async (
        product: Product,
        size: string,
    ) => {
        setIsLoading(true);

        try {
            const existingItem =
                cartItems.find(
                    (item) =>
                        item.productId ===
                            product._id &&
                        item.size === size,
                );

            if (existingItem) {
                setCartItems((previous) =>
                    previous.map((item) =>
                        item.id ===
                        existingItem.id
                            ? {
                                  ...item,
                                  quantity:
                                      item.quantity +
                                      1,
                              }
                            : item,
                    ),
                );
            } else {
                const newItem: CartItem = {
                    id: `${product._id}-${size}`,
                    product,
                    productId: product._id,
                    userId: "local-user",
                    quantity: 1,
                    size,
                    price: product.price,
                    createdAt:
                        new Date().toISOString(),
                    updatedAt:
                        new Date().toISOString(),
                };

                setCartItems((previous) => [
                    ...previous,
                    newItem,
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromCart = async (
        productId: string,
        size: string,
    ) => {
        setCartItems((previous) =>
            previous.filter(
                (item) =>
                    !(
                        item.productId ===
                            productId &&
                        item.size === size
                    ),
            ),
        );
    };

    const updateQuantity = async (
        productId: string,
        size: string,
        quantity: number,
    ) => {
        if (quantity <= 0) {
            await removeFromCart(
                productId,
                size,
            );
            return;
        }

        setCartItems((previous) =>
            previous.map((item) =>
                item.productId === productId &&
                item.size === size
                    ? {
                          ...item,
                          quantity,
                          updatedAt:
                              new Date().toISOString(),
                      }
                    : item,
            ),
        );
    };

    const clearCart = async () => {
        setCartItems([]);
        setCartTotal(0);
    };

    const itemCount = cartItems.reduce(
        (sum, item) =>
            sum + item.quantity,
        0,
    );

    const calculatedTotal =
        cartItems.reduce(
            (sum, item) =>
                sum +
                item.product.price *
                    item.quantity,
            0,
        );

    useEffect(() => {
        setCartTotal(calculatedTotal);
    }, [calculatedTotal]);

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