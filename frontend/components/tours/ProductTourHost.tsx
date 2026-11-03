'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TOUR_CONFIGS, TourConfig } from './tourDefinitions';
import { ProductTourModal } from './ProductTourModal';
import { api } from '@/lib/api/client';

export const startProductTour = (tourId: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('seculayer-start-tour', { detail: { tourId } }));
  }
};

export const ProductTourHost: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Fetch persistent tour completion state from backend on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchTourState() {
      try {
        const data = await api.tours.getStatus();
        if (!isMounted) return;
        const completed = data?.completed_tours || [];
        setCompletedTours(completed);
        setIsLoaded(true);

        // Check if an explicit active tour was requested server-side
        if (data?.active_tour && TOUR_CONFIGS[data.active_tour]) {
          const config = TOUR_CONFIGS[data.active_tour];
          setActiveTour(config);
          setStepIndex(0);
          if (config.steps[0]?.route && pathname !== config.steps[0].route) {
            router.push(config.steps[0].route);
          }
        }
      } catch (err) {
        console.warn('Could not retrieve backend tour state:', err);
        if (isMounted) setIsLoaded(true);
      }
    }

    fetchTourState();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Automatic First-Visit Detection per Module
  useEffect(() => {
    if (!isLoaded || activeTour) return;

    // A. Dashboard Overview on first dashboard visit
    if (
      (pathname === '/code' || pathname === '/home' || pathname === '/platform') &&
      !completedTours.includes('dashboard_overview')
    ) {
      const timer = setTimeout(() => {
        setActiveTour(TOUR_CONFIGS.dashboard_overview);
        setStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }

    // B. Thing Cloud First-Visit
    if (pathname?.startsWith('/cloud') && !completedTours.includes('thing_cloud')) {
      const timer = setTimeout(() => {
        setActiveTour(TOUR_CONFIGS.thing_cloud);
        setStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }

    // C. Thing Attack First-Visit
    if (pathname?.startsWith('/attack') && !completedTours.includes('thing_attack')) {
      const timer = setTimeout(() => {
        setActiveTour(TOUR_CONFIGS.thing_attack);
        setStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }

    // D. Thing Protect First-Visit
    if (pathname?.startsWith('/protect') && !completedTours.includes('thing_protect')) {
      const timer = setTimeout(() => {
        setActiveTour(TOUR_CONFIGS.thing_protect);
        setStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }

    // E. Thing Compliance First-Visit
    if (
      (pathname?.startsWith('/governance') || pathname?.startsWith('/compliance')) &&
      !completedTours.includes('thing_compliance')
    ) {
      const timer = setTimeout(() => {
        setActiveTour(TOUR_CONFIGS.thing_compliance);
        setStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [pathname, isLoaded, completedTours, activeTour]);

  // 3. Listen to Manual "Restart Tour" events
  useEffect(() => {
    const handleManualTour = (e: any) => {
      const tourId = e?.detail?.tourId;
      if (tourId && TOUR_CONFIGS[tourId]) {
        const config = TOUR_CONFIGS[tourId];
        setActiveTour(config);
        setStepIndex(0);
        if (config.steps[0]?.route && pathname !== config.steps[0].route) {
          router.push(config.steps[0].route);
        }
      }
    };

    window.addEventListener('seculayer-start-tour', handleManualTour);
    return () => window.removeEventListener('seculayer-start-tour', handleManualTour);
  }, [pathname, router]);

  const handleNext = useCallback(() => {
    if (!activeTour) return;
    const nextIdx = stepIndex + 1;
    if (nextIdx < activeTour.steps.length) {
      const nextStep = activeTour.steps[nextIdx];
      if (nextStep.route && pathname !== nextStep.route) {
        router.push(nextStep.route);
      }
      setStepIndex(nextIdx);
    } else {
      handleFinish();
    }
  }, [activeTour, stepIndex, pathname, router]);

  const handlePrev = useCallback(() => {
    if (!activeTour) return;
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      const prevStep = activeTour.steps[prevIdx];
      if (prevStep.route && pathname !== prevStep.route) {
        router.push(prevStep.route);
      }
      setStepIndex(prevIdx);
    }
  }, [activeTour, stepIndex, pathname, router]);

  const handleSkip = useCallback(async () => {
    if (!activeTour) return;
    const tourId = activeTour.id;
    setActiveTour(null);
    setStepIndex(0);

    // Optimistically update local list
    setCompletedTours((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));

    // Authoritative backend persistence
    try {
      await api.tours.complete({
        tour_id: tourId,
        step_index: stepIndex,
        dismissed: true,
      });
    } catch (err) {
      console.warn('Failed to record tour dismissal in backend:', err);
    }
  }, [activeTour, stepIndex]);

  const handleFinish = useCallback(async () => {
    if (!activeTour) return;
    const tourId = activeTour.id;
    setActiveTour(null);
    setStepIndex(0);

    // Optimistically update local list
    setCompletedTours((prev) => (prev.includes(tourId) ? prev : [...prev, tourId]));

    // Authoritative backend persistence
    try {
      await api.tours.complete({
        tour_id: tourId,
        step_index: activeTour.steps.length - 1,
        dismissed: false,
      });
    } catch (err) {
      console.warn('Failed to record tour completion in backend:', err);
    }
  }, [activeTour]);

  if (!activeTour) return null;

  return (
    <ProductTourModal
      tour={activeTour}
      currentStepIndex={stepIndex}
      onNext={handleNext}
      onPrev={handlePrev}
      onSkip={handleSkip}
      onFinish={handleFinish}
    />
  );
};
