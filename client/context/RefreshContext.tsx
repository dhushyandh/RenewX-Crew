import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";

type RefreshHandler = () => Promise<void> | void;

type RefreshContextType = {
    refreshing: boolean;
    refresh: () => Promise<void>;
    registerRefreshHandler: (
        handler: RefreshHandler,
    ) => () => void;
};

const RefreshContext =
    createContext<RefreshContextType | undefined>(
        undefined,
    );

export function RefreshProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const handlersRef = useRef<Set<RefreshHandler>>(
        new Set(),
    );

    const [refreshing, setRefreshing] =
        useState(false);

    const registerRefreshHandler = useCallback(
        (handler: RefreshHandler) => {
            handlersRef.current.add(handler);

            return () => {
                handlersRef.current.delete(handler);
            };
        },
        [],
    );

    const refresh = useCallback(async () => {
        if (refreshing) {
            return;
        }

        setRefreshing(true);

        try {
            const handlers = Array.from(
                handlersRef.current,
            );

            await Promise.all(
                handlers.map(async (handler) => {
                    try {
                        await handler();
                    } catch (error) {
                        console.error(
                            "Global refresh handler error:",
                            error,
                        );
                    }
                }),
            );
        } finally {
            setRefreshing(false);
        }
    }, [refreshing]);

    const value = useMemo(
        () => ({
            refreshing,
            refresh,
            registerRefreshHandler,
        }),
        [
            refreshing,
            refresh,
            registerRefreshHandler,
        ],
    );

    return (
        <RefreshContext.Provider value={value}>
            {children}
        </RefreshContext.Provider>
    );
}

export function useAppRefresh() {
    const context = useContext(RefreshContext);

    if (!context) {
        throw new Error(
            "useAppRefresh must be used within RefreshProvider",
        );
    }

    return context;
}