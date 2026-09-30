export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  category_id: number | null;
  category_name?: string | null;
}

export interface Store {
  id: number;
  name: string;
}

export interface StoreCategory {
  category_id: number;
  order_position: number;
  name: string;
}

export interface Recipe {
  id: number;
  name: string;
  products: Product[];
}

export interface RecurringItem {
  id: number;
  product_id: number;
  product_name: string;
  frequency: string;
  active: boolean;
}

export interface ShoppingListSummary {
  id: number;
  store_id: number;
  store_name: string;
  type: 'weekly' | 'quick';
  created_at: string;
  completed_at: string | null;
  item_count: number;
  checked_count: number;
}

export interface ListItem {
  id: number;
  product_id: number;
  product_name: string;
  checked: boolean;
  source: 'manual' | 'auto';
  category_id: number | null;
  category_name: string | null;
  order_position: number | null;
}

export interface MealPlanDay {
  day_of_week: number;
  recipe_id: number | null;
  recipe_name: string | null;
}

export interface ShoppingListDetail extends ShoppingListSummary {
  items: ListItem[];
  meal_plan: MealPlanDay[] | null;
}

export const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

export const FREQUENCIES = [
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'bi-weekly', label: 'Om de week' },
  { value: 'monthly', label: 'Maandelijks' },
];
