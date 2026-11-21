export type Kind = "ticket" | "exhibitor" | "sponsor";

export interface Settings {
  event_name: string;
  edition: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  city: string | null;
  venue_confirmed: boolean;
  capacity: number | null;
  sales_open: boolean;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  instagram_url: string | null;
}

export interface Product {
  id: string;
  kind: Kind;
  name: string;
  tagline: string | null;
  description: string | null;
  benefits: string[];
  price: number | null;
  on_request: boolean;
  max_per_order: number;
  tickets_per_unit: number;
  is_featured: boolean;
  remaining: number | null;
}

export interface TeamMember {
  id: string;
  is_revealed: boolean;
  name?: string;
  role?: string;
  bio?: string | null;
  section_label?: string | null;
  topic_title?: string | null;
  topic_description?: string | null;
  takeaway?: string | null;
  photo_url?: string | null;
  silhouette_url?: string | null;
  instagram?: string | null;
}

export interface Site {
  settings: Settings;
  products: Product[];
  team: TeamMember[];
}

export type OrderStatus = "awaiting_payment" | "processing" | "paid" | "expired" | "cancelled";
export type PayMethod = "express" | "referencia";

export interface Ticket {
  id: string;
  code: string;
  public_token: string;
  seq: number;
  holder_name: string;
  product_name: string;
  status: "valid" | "used" | "cancelled";
  checked_in_at: string | null;
}

export interface Order {
  token: string;
  number: number;
  kind: Kind;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  company_name: string | null;
  status: OrderStatus;
  payment_method: PayMethod | "manual" | null;
  entity: string | null;
  reference: string | null;
  reference_due_at: string | null;
  failure_reason: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  tickets: Ticket[];
}
