import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { Product } from "@/constants/types";
import { dummyCart } from "@/assets/assets";

export type CartItem = {
    id: string,
    product: Product,
    productId: string,
    userId: string,
    quantity: number,
    size: string,
    price: number,
    createdAt: string,
    updatedAt: string,
}

export type CartContextType = {
    cartItems: CartItem[],
    addToCart: (product: Product, size: string) => Promise<void>,
    removeFromCart: (productId: string, size: string) => Promise<void>
    updateQuantity: (productId: string, size: string, quantity: number) => Promise<void>
    clearCart: () => Promise<void>
    cartTotal: number,
    itemCount: number,
    isLoading: boolean,
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {

    const [cartItems, setCartItems] = useState<CartItem[]>([])
    const [cartTotal, setCartTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(false)


    const fetchCart = async () => {
        setIsLoading(true);
        const serverCart = dummyCart;
        const mappedItems: CartItem[] = serverCart.items.map((item: any) => ({
            id: item.product._id,
            product: item.product,
            productId: item.productId,
            userId: item.userId,
            quantity: item.quantity,
            size: item.size,
            price: item.product.price,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }))

        setCartItems(mappedItems);
        setCartTotal(serverCart.totalAmount)
        setIsLoading(false);
    }

    const addToCart = async (product: Product, size: string) => {
        setIsLoading(true)

        const existingItem = cartItems.find((item) =>
            item.productId === product._id && item.size === size
        )
        if (existingItem) {

        }
    }
    const removeFromCart = async (productId: string, size: string) => {
    }
    const updateQuantity = async (productId: string, size: string, quantity: number) => {

    }
    const clearCart = async () => {

    }

    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    useEffect(() => {
        fetchCart()
    }, [])

    return (
        <CartContext.Provider value={{cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount, isLoading}}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)

    if (context === undefined) {
        throw new Error('useCart must be used within CartProvider')
    }
    return context
}