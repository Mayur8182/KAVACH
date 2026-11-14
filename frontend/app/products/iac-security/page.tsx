import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';

export const metadata: Metadata = {
  title: 'Infrastructure as Code Security',
  description: 'Trace infrastructure policy findings to source and review configuration changes.',
};

export default function Page() {
  return <ProductStoryPage product="iac-security" />;
}
