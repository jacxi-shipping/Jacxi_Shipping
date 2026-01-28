'use client';

import { useEffect, useState } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface TourStep extends DriveStep {
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
}

interface OnboardingTourProps {
  steps: TourStep[];
  storageKey: string;
  autoStart?: boolean;
  showProgress?: boolean;
  allowClose?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({
  steps,
  storageKey,
  autoStart = true,
  showProgress = true,
  allowClose = true,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    // Check if tour was already completed
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(storageKey);
      if (completed === 'true') {
        setTourCompleted(true);
        return;
      }

      if (autoStart) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          startTour();
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress,
      allowClose,
      steps,
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep()) {
          // Tour completed
          localStorage.setItem(storageKey, 'true');
          setTourCompleted(true);
          onComplete?.();
        } else {
          // Tour skipped
          localStorage.setItem(storageKey, 'true');
          setTourCompleted(true);
          onSkip?.();
        }
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem(storageKey);
    setTourCompleted(false);
    startTour();
  };

  // Expose reset function globally for manual trigger
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)[`reset_${storageKey}`] = resetTour;
    }
  }, []);

  return null;
}

// Predefined tours for common pages
export const dashboardTourSteps: TourStep[] = [
  {
    element: '#dashboard-header',
    popover: {
      title: 'Welcome to JACXI Dashboard! 🎉',
      description: 'Let\'s take a quick tour of the main features to help you get started.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="command-palette"]',
    popover: {
      title: 'Quick Search',
      description: 'Press Cmd+K (or Ctrl+K) to open the command palette and quickly navigate anywhere.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="notifications"]',
    popover: {
      title: 'Notifications',
      description: 'Stay updated with real-time notifications about your shipments and containers.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="theme-toggle"]',
    popover: {
      title: 'Theme Toggle',
      description: 'Switch between light and dark modes to suit your preference.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="stats"]',
    popover: {
      title: 'Quick Stats',
      description: 'Monitor your key metrics at a glance with real-time statistics.',
      side: 'top',
    },
  },
  {
    element: '[data-tour="fab"]',
    popover: {
      title: 'Quick Actions',
      description: 'Use the floating action button to quickly create new shipments, containers, or invoices.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="bottom-nav"]',
    popover: {
      title: 'Mobile Navigation',
      description: 'On mobile devices, use the bottom navigation bar for easy access to main sections.',
      side: 'top',
    },
  },
  {
    popover: {
      title: 'You\'re All Set! 🚀',
      description: 'Press ? anytime to view all keyboard shortcuts. Happy shipping!',
    },
  },
];

export const shipmentsTourSteps: TourStep[] = [
  {
    element: '[data-tour="new-shipment"]',
    popover: {
      title: 'Create New Shipment',
      description: 'Click here to add a new shipment to the system.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="filters"]',
    popover: {
      title: 'Advanced Filters',
      description: 'Use filters to quickly find specific shipments based on various criteria.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="export"]',
    popover: {
      title: 'Export Data',
      description: 'Export your shipment data to CSV or Excel for reporting.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="table"]',
    popover: {
      title: 'Sortable Table',
      description: 'Click column headers to sort, select rows for bulk actions, or click a row to view details.',
      side: 'top',
    },
  },
];

// Hook to use onboarding
export function useOnboardingTour(tourId: string) {
  const [isCompleted, setIsCompleted] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(`tour_${tourId}`);
      setIsCompleted(completed === 'true');
    }
  }, [tourId]);

  const startTour = (steps: TourStep[]) => {
    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      steps,
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep()) {
          localStorage.setItem(`tour_${tourId}`, 'true');
          setIsCompleted(true);
        }
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem(`tour_${tourId}`);
    setIsCompleted(false);
  };

  return { isCompleted, startTour, resetTour };
}
