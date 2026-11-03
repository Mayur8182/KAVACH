/**
 * Thing Navigation & Product Routing Types
 */

export type ProductId =
  | 'home'
  | 'code'
  | 'cloud'
  | 'attack'
  | 'protect'
  | 'agent'
  | 'data'
  | 'graph'
  | 'intelligence'
  | 'soc'
  | 'control-plane'
  | 'governance'
  | 'settings'
  | 'help';

export interface ProductNavTab {
  id: string;
  label: string;
  count?: number;
  badge?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}
