import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ArrowPosition = 'top' | 'bottom' | 'left' | 'right';

export interface DemoStep {
  route: string;
  title: string;
  description: string;
  arrowPosition: ArrowPosition;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    route: '/(tabs)',
    title: 'demoHomeTitle',
    description: 'demoHomeDesc',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/feed',
    title: 'demoFeedTitle',
    description: 'demoFeedDesc',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/explore',
    title: 'demoExploreTitle',
    description: 'demoExploreDesc',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/messages',
    title: 'demoMessagesTitle',
    description: 'demoMessagesDesc',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/profile',
    title: 'demoProfileTitle',
    description: 'demoProfileDesc',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)',
    title: 'demoFinishTitle',
    description: 'demoFinishDesc',
    arrowPosition: 'top',
  },
];

interface DemoContextValue {
  isDemoActive: boolean;
  demoStep: number;
  steps: DemoStep[];
  startDemo: () => void;
  nextStep: () => void;
  stopDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const startDemo = useCallback(() => {
    setDemoStep(0);
    setIsDemoActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setDemoStep((prev) => {
      if (prev >= DEMO_STEPS.length - 1) {
        setIsDemoActive(false);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  const stopDemo = useCallback(() => {
    setIsDemoActive(false);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemoActive,
        demoStep,
        steps: DEMO_STEPS,
        startDemo,
        nextStep,
        stopDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
