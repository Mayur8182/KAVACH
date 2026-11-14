import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';

export const metadata: Metadata = {
  title: 'Container Security',
  description: 'Explore container image layers, package context, and reviewable update paths.',
};

export default function Page() {
  return <ProductStoryPage product="container-security" />;
}
