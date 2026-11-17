'use client';

import ErrorBoundary from '@/app/error';

export default function Page500() {
  const dummyError = new Error('Internal Server Error (500)');
  const dummyReset = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return <ErrorBoundary error={dummyError} reset={dummyReset} />;
}

