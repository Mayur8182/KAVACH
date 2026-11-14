import type { Metadata } from 'next';
import { ProductStoryPage } from '@/components/products/ProductStoryPage';
export const metadata: Metadata = { title: 'Codebase Scanning', description: 'Trace code security findings from source to reviewed remediation.' };
export default function Page() { return <ProductStoryPage product="codebase-scanning" />; }
