'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

// Inner component that uses searchParams (needs Suspense boundary)
function ClientProviderInner({
  children,
  setSelectedClientIdFromUrl
}: {
  children: React.ReactNode;
  setSelectedClientIdFromUrl: (id: string) => void;
}) {
  const searchParams = useSearchParams();

  // Listen for URL query param changes (e.g., from client dashboard badge links)
  useEffect(() => {
    const clientIdFromUrl = searchParams.get('clientId');
    if (clientIdFromUrl) {
      setSelectedClientIdFromUrl(clientIdFromUrl);
    }
  }, [searchParams, setSelectedClientIdFromUrl]);

  return <>{children}</>;
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
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

  // Initialize: Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedClientIdState(stored);
    }

    // Fetch clients
    fetchClients();
  }, [fetchClients]);

  // Callback to set client ID from URL (called by inner component)
  const setSelectedClientIdFromUrl = useCallback((id: string) => {
    setSelectedClientIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

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
      <Suspense fallback={children}>
        <ClientProviderInner setSelectedClientIdFromUrl={setSelectedClientIdFromUrl}>
          {children}
        </ClientProviderInner>
      </Suspense>
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
