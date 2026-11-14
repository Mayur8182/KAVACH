import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';
export const metadata: Metadata = { title: 'Secret Scanning', description: 'Find exposed credentials, trace their history, and guide safe containment.' };
export default function Page() { return <ProductStoryPage product="secret-scanning" />; }
