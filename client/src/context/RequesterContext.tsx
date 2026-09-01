import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Requester } from "../types.js";
import { fetchActiveRequesters, fetchCurrentRequester } from "../api.js";

const STORAGE_KEY = "toktickit_current_requester_id";

export interface RequesterContextType {
  currentRequester: Requester | null;
  requesters: Requester[];
  isLoading: boolean;
  error: string | null;
  selectRequester: (requester: Requester) => void;
  changeRequester: () => void;
  reloadRequesters: () => Promise<void>;
}

export const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [currentRequester, setCurrentRequester] = useState<Requester | null>(null);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequesters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchActiveRequesters();
      setRequesters(list);

      // Check if we already have a saved requester in storage
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const idNum = parseInt(savedId, 10);
        const matching = list.find((u) => u.id === idNum);
        if (matching) {
          setCurrentRequester(matching);
        } else {
          // Attempt to fetch profile directly or reset if inactive
          try {
            const profile = await fetchCurrentRequester(idNum);
            if (profile && profile.isActive) {
              setCurrentRequester(profile);
            } else {
              localStorage.removeItem(STORAGE_KEY);
              setCurrentRequester(null);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY);
            setCurrentRequester(null);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load development requesters");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequesters();
  }, [loadRequesters]);

  const selectRequester = useCallback((requester: Requester) => {
    setCurrentRequester(requester);
    localStorage.setItem(STORAGE_KEY, String(requester.id));
  }, []);

  const changeRequester = useCallback(() => {
    setCurrentRequester(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        isLoading,
        error,
        selectRequester,
        changeRequester,
        reloadRequesters: loadRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
