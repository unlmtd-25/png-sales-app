import Dexie, { Table } from 'dexie';

// ---- Entity types (mirrors the original Room schema) ----

export type Role = 'MANAGER' | 'OFFICER' | 'WAREHOUSE';

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  device_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  weight_grams: number;
  unit_cost: number;
  unit_price: number;
  is_new: boolean;
  category: string;
  created_by: string;
  updated_at: string;
  version: number;
}

export interface Customer {
  id: string;
  name: string;
  location: string;
  phone: string;
  last_order_date: string | null;
  created_by: string;
  updated_at: string;
  version: number;
}

export interface Order {
  id: string; // device-prefixed, append-only
  customer_id: string;
  officer_id: string;
  date: string;
  total_revenue: number;
  total_profit: number;
  device_origin: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
  discount: number;
  cogs_at_sale: number;
}

export interface Stocktake {
  id: string;
  product_id: string;
  date: string;
  good_qty: number;
  damaged_qty: number;
  counted_by: string;
  device_origin: string;
}

export type ContainerStatus = 'ACTIVE' | 'PARTIAL' | 'HELD' | 'SOLD_OUT';

export interface Container {
  id: string;
  number: string;
  arrival_date: string;
  status: ContainerStatus;
  freight_fee: number;
  recorded_by: string;
}

export interface ContainerContent {
  id: string;
  container_id: string;
  product_id: string;
  qty_received: number;
  qty_sold: number;
}

export interface Promotion {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  uplift_pct: number;
  product_ids: string[];
}

export interface Survey {
  id: string;
  product_id: string;
  product_name_freetext: string;
  weight: string;
  size: string;
  market_price: number;
  competitor_price: number | null;
  store_name: string;
  date: string;
  surveyed_by: string;
  device_origin: string;
}

export interface SyncLogEntry {
  id: string;
  entity_table: string;
  entity_id: string;
  device_id: string;
  timestamp: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
}

class SalesDB extends Dexie {
  users!: Table<AppUser, string>;
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  order_items!: Table<OrderItem, string>;
  stocktake!: Table<Stocktake, string>;
  containers!: Table<Container, string>;
  container_contents!: Table<ContainerContent, string>;
  promotions!: Table<Promotion, string>;
  surveys!: Table<Survey, string>;
  sync_log!: Table<SyncLogEntry, string>;

  constructor() {
    super('png_sales_tracker');
    this.version(1).stores({
      users: 'id, device_id, role',
      products: 'id, code, category, updated_at',
      customers: 'id, name, last_order_date, updated_at',
      orders: 'id, customer_id, date, device_origin',
      order_items: 'id, order_id, product_id',
      stocktake: 'id, product_id, date',
      containers: 'id, number, status, arrival_date',
      container_contents: 'id, container_id, product_id',
      promotions: 'id, start_date, end_date',
      surveys: 'id, product_id, date',
      sync_log: 'id, entity_table, entity_id, timestamp, device_id',
    });
  }
}

export const db = new SalesDB();

// ---- Device / session identity (stored locally per install) ----

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'SERVER';
  let id = localStorage.getItem('png_device_id');
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('png_device_id', id);
  }
  return id;
}

export function getCurrentUser(): { name: string; role: Role } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('png_current_user');
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(name: string, role: Role) {
  localStorage.setItem('png_current_user', JSON.stringify({ name, role }));
}

export function logSyncEntry(
  entity_table: string,
  entity_id: string,
  operation: SyncLogEntry['operation']
) {
  db.sync_log.put({
    id: `${getDeviceId()}-${entity_table}-${entity_id}-${Date.now()}`,
    entity_table,
    entity_id,
    device_id: getDeviceId(),
    timestamp: new Date().toISOString(),
    operation,
  });
  }
