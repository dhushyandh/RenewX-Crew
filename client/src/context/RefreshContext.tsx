import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface RefreshContextValue {
  refreshing: boolean;
  refresh: () => Promise<void>;
  registerRefreshHandler: (handler: (() => Promise<void> | void) | null) => () => void;
}

const RefreshContext = createContext<RefreshContextValue | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<Set<() => Promise<void> | void>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const registerRefreshHandler = useCallback(
    (handler: (() => Promise<void> | void) | null) => {
      if (!handler) return () => undefined;

      handlersRef.current.add(handler);

      return () => {
        handlersRef.current.delete(handler);
      };
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      const handlers = Array.from(handlersRef.current);
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler();
          } catch (error) {
            console.error("Refresh handler failed:", error);
          }
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  const value = useMemo(
    () => ({ refreshing, refresh, registerRefreshHandler }),
    [refreshing, refresh, registerRefreshHandler],
  );

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useAppRefresh() {
  const context = useContext(RefreshContext);

  if (!context) {
    throw new Error("useAppRefresh must be used within RefreshProvider");
  }

  return context;
}

export function useRegisterRefresh(
  handler: (() => Promise<void> | void) | null,
) {
  const { registerRefreshHandler } = useAppRefresh();

  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const stableHandler = async () => {
      if (handlerRef.current) {
        await handlerRef.current();
      }
    };

    return registerRefreshHandler(stableHandler);
  }, [registerRefreshHandler]);
}
