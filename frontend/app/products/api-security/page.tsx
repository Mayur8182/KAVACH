import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';

export const metadata: Metadata = {
  title: 'API Security',
  description: 'Explore API endpoints, authorization context, and reviewable security changes.',
};

export default function Page() {
  return <ProductStoryPage product="api-security" />;
}
