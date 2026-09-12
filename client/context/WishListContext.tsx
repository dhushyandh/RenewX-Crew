import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    Product,
    WishlistContextType,
} from "@/constants/types";

import { dummyWishlist } from "@/assets/assets";

import { useAppRefresh } from "./RefreshContext";

const WishlistContext =
    createContext<
        WishlistContextType | undefined
    >(undefined);

export function WishlistProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [wishlist, setWishlist] =
        useState<Product[]>([]);

    const [loading, setLoading] =
        useState(false);

    const { registerRefreshHandler } =
        useAppRefresh();

    const fetchWishlist = async () => {
        setLoading(true);

        try {
            /*
             * TODO:
             * Replace dummyWishlist with your
             * real wishlist API.
             */

            setWishlist(dummyWishlist);
        } catch (error) {
            console.error(
                "Failed to fetch wishlist:",
                error,
            );
        } finally {
            setLoading(false);
        }
    };

    /*
     * Register wishlist with global refresh.
     */
    useEffect(() => {
        return registerRefreshHandler(
            fetchWishlist,
        );
    }, [registerRefreshHandler]);

    /*
     * Initial wishlist load.
     */
    useEffect(() => {
        fetchWishlist();
    }, []);

    const toggleWishlist = async (
        product: Product,
    ) => {
        const exists = wishlist.some(
            (item) =>
                item._id === product._id,
        );

        if (exists) {
            setWishlist((previous) =>
                previous.filter(
                    (item) =>
                        item._id !==
                        product._id,
                ),
            );
        } else {
            setWishlist((previous) => [
                ...previous,
                product,
            ]);
        }
    };

    const isInWishlist = (
        productId: string,
    ) => {
        return wishlist.some(
            (product) =>
                product._id === productId,
        );
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                loading,
                toggleWishlist,
                isInWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishList() {
    const context =
        useContext(WishlistContext);

    if (!context) {
        throw new Error(
            "useWishList must be used within WishlistProvider",
        );
    }

    return context;
}