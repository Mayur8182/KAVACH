import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';
export const metadata: Metadata = { title: 'Supply Chain Security', description: 'Explore dependencies, package risk, and reviewed upgrade workflows.' };
export default function Page() { return <ProductStoryPage product="supply-chain" />; }
