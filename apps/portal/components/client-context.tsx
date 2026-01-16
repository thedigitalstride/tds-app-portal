'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface Client {
  _id: string;
  name: string;
  website: string;
  description?: string;
  contactEmail?: string;
  contactName?: string;
  isActive: boolean;
}

interface ClientContextValue {
  clients: Client[];
  loadingClients: boolean;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  selectedClient: Client | null;
  refreshClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_KEY = 'tds-selected-client';

// Helper to get clientId from URL (works on client-side only)
function getClientIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('clientId');
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(null);

  // Fetch clients from API
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  // Initialize: Load from localStorage, then check URL
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedClientIdState(stored);
    }

    // Check URL for clientId (overrides localStorage)
    const urlClientId = getClientIdFromUrl();
    if (urlClientId) {
      setSelectedClientIdState(urlClientId);
      localStorage.setItem(STORAGE_KEY, urlClientId);
    }

    // Fetch clients
    fetchClients();
  }, [fetchClients]);

  // Watch for pathname changes and sync clientId from URL
  useEffect(() => {
    const urlClientId = getClientIdFromUrl();
    if (urlClientId) {
      setSelectedClientIdState(urlClientId);
      localStorage.setItem(STORAGE_KEY, urlClientId);
    }
  }, [pathname]); // Re-run when pathname changes (navigation occurred)

  // Wrapper to also persist to localStorage
  const setSelectedClientId = useCallback((id: string | null) => {
    setSelectedClientIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Derive selected client from ID
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find(c => c._id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const value = useMemo<ClientContextValue>(() => ({
    clients,
    loadingClients,
    selectedClientId,
    setSelectedClientId,
    selectedClient,
    refreshClients: fetchClients,
  }), [clients, loadingClients, selectedClientId, setSelectedClientId, selectedClient, fetchClients]);

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
