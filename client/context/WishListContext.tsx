import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { Product, WishlistContextType } from "@/constants/types";
import { dummyWishlist } from "@/assets/assets";


const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {

    const [wishlist, setWishlist] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)

    const fetchWishlist = async () => {
        setLoading(true)
        setWishlist(dummyWishlist)
        setLoading(false)
    }

    const toggleWishlist = async (product: Product) => {
        const exists = wishlist.find((p) => p._id === product._id)
        if (exists) {
            setWishlist((prev) => prev.filter((p) => p._id !== product._id))
        } else {
            setWishlist((prev) => [...prev, product])
        }
    }
    
    const isInWishlist = (productId: string) => wishlist.some((p) => p._id === productId)

    useEffect(() => {
        fetchWishlist()
    }, [])

    return (
        <WishlistContext.Provider value={{ wishlist, loading, toggleWishlist, isInWishlist }}>
            {children}
        </WishlistContext.Provider>
    )
}

export function useWishList() {
    const context = useContext(WishlistContext)

    if (context === undefined) {
        throw new Error('useWishList must be used within WishlistProvider')
    }
    return context
}