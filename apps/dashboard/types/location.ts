export type PaymentMethod =
  | "Bevo Pay"
  | "Cash"
  | "Credit/Debit"
  | "Dine In Dollars";

export interface TimeRange {
  open: number;
  close: number;
}

export interface ServiceHours {
  monday: { timeRanges: TimeRange[]; isClosed: boolean };
  tuesday: { timeRanges: TimeRange[]; isClosed: boolean };
  wednesday: { timeRanges: TimeRange[]; isClosed: boolean };
  thursday: { timeRanges: TimeRange[]; isClosed: boolean };
  friday: { timeRanges: TimeRange[]; isClosed: boolean };
  saturday: { timeRanges: TimeRange[]; isClosed: boolean };
  sunday: { timeRanges: TimeRange[]; isClosed: boolean };
}

export interface MealTime {
  name: string;
  start_time: number;
  end_time: number;
}

export interface LocationType {
  id: string;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Location {
  id?: string;
  name: string;
  colloquial_name?: string;
  description: string;
  address: string;
  image?: string;
  apple_maps_link: string;
  google_maps_link: string;
  regular_service_hours: ServiceHours;
  meal_times?: MealTime[];
  methods_of_payment: PaymentMethod[];
  status: "open" | "closed";
  type_id: string;
  force_close: boolean;
  has_menus: boolean;
  updated_at: string;
}
