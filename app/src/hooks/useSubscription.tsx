import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { getSubscriptionStatus, restoreSubscription as restoreApi, SubscriptionStatus } from '../services/subscriptionApi';
import { initPurchases, getOfferings, purchasePackage, restorePurchases as restoreRC, hasPremiumEntitlement, getCustomerInfo } from '../services/purchasesApi';

interface SubscriptionContextValue {
  tier: 'free' | 'premium';
  isPremium: boolean;
  aiProgramsRemaining: number;
  isLoading: boolean;
  offerings: any[];
  showPaywall: () => void;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: 'free',
  isPremium: false,
  aiProgramsRemaining: 1,
  isLoading: true,
  offerings: [],
  showPaywall: () => {},
  purchaseMonthly: async () => {},
  purchaseYearly: async () => {},
  restorePurchases: async () => {},
  refreshStatus: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [aiProgramsRemaining, setAiProgramsRemaining] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<any[]>([]);
  const rcInitialized = useRef(false);

  const isPremium = tier === 'premium';

  // Init RevenueCat + fetch status when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setTier('free');
      setAiProgramsRemaining(1);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      try {
        // Init RevenueCat SDK (no-op on web)
        if (!rcInitialized.current && Platform.OS !== 'web') {
          await initPurchases(user.id);
          rcInitialized.current = true;
          // Pre-fetch offerings
          const pkgs = await getOfferings();
          if (!cancelled) setOfferings(pkgs);
        }

        // Fetch subscription status from backend
        const status = await getSubscriptionStatus();
        if (!cancelled) {
          setTier(status.tier);
          setAiProgramsRemaining(status.ai_programs_remaining);
        }
      } catch {
        // Fallback: use user data from auth
        if (!cancelled && user) {
          const userTier = (user as any).subscription_tier;
          const generated = (user as any).ai_programs_generated ?? 0;
          setTier(userTier === 'premium' ? 'premium' : 'free');
          setAiProgramsRemaining(userTier === 'premium' ? -1 : Math.max(0, 10 - generated));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  const showPaywall = useCallback(() => {
    router.push('/paywall' as any);
  }, [router]);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getSubscriptionStatus();
      setTier(status.tier);
      setAiProgramsRemaining(status.ai_programs_remaining);
    } catch {
      // Silently fail
    }
  }, []);

  const purchaseMonthly = useCallback(async () => {
    const monthly = offerings.find(p => p.packageType === 'MONTHLY');
    if (!monthly) throw new Error('Monthly package not available');
    const info = await purchasePackage(monthly);
    if (hasPremiumEntitlement(info)) {
      setTier('premium');
      setAiProgramsRemaining(-1);
      // Sync with backend
      await refreshStatus();
    }
  }, [offerings, refreshStatus]);

  const purchaseYearly = useCallback(async () => {
    const annual = offerings.find(p => p.packageType === 'ANNUAL');
    if (!annual) throw new Error('Annual package not available');
    const info = await purchasePackage(annual);
    if (hasPremiumEntitlement(info)) {
      setTier('premium');
      setAiProgramsRemaining(-1);
      await refreshStatus();
    }
  }, [offerings, refreshStatus]);

  const handleRestore = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const info = await restoreRC();
      if (hasPremiumEntitlement(info)) {
        setTier('premium');
        setAiProgramsRemaining(-1);
      }
    }
    // Also restore on backend side
    const status = await restoreApi();
    setTier(status.tier);
    setAiProgramsRemaining(status.ai_programs_remaining);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isPremium,
        aiProgramsRemaining,
        isLoading,
        offerings,
        showPaywall,
        purchaseMonthly,
        purchaseYearly,
        restorePurchases: handleRestore,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
