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
    title: 'Accueil',
    description: 'Ton tableau de bord : streak, objectif de la semaine et prochaine séance. Le menu (☰) donne accès à la progression et aux programmes.',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/feed',
    title: 'Réseau (Feed)',
    description: 'Les séances partagées par la communauté. Like (❤️) et commente les posts.',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/explore',
    title: 'Explorer',
    description: 'Défis communautaires et découverte de séances. Rejoins un défi pour te mesurer aux autres.',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/messages',
    title: 'Messages',
    description: 'Tes conversations privées avec les autres membres.',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)/profile',
    title: 'Profil',
    description: 'Tes stats, ton menu (Progression, Programme, Objectifs, Paramètres) et la déconnexion.',
    arrowPosition: 'top',
  },
  {
    route: '/(tabs)',
    title: 'C\'est parti !',
    description: 'Tu as vu l\'essentiel. Crée une séance depuis le menu, suis ton programme et partage sur le feed. Bonne séance 🦍',
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
