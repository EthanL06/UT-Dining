import type { MealTime, PaymentMethod, ServiceHours } from '@ut-dining/core';

export type { MealTime, PaymentMethod, ServiceHours, TimeRange } from '@ut-dining/core';

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
  latitude: number;
  longitude: number;
  regular_service_hours: ServiceHours;
  meal_times?: MealTime[];
  methods_of_payment: PaymentMethod[];
  status: 'open' | 'closed';
  type_id: string;
  force_close: boolean;
  has_menus: boolean;
  updated_at: string;
}
