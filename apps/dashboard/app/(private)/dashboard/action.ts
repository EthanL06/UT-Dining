"use server";

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database.types";
import type { Location, LocationType } from "@/types/location";

export async function addLocation(location: Location) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("location")
    .insert({
      name: location.name,
      colloquial_name: location.colloquial_name,
      address: location.address,
      description: location.description,
      regular_service_hours: location.regular_service_hours as unknown as Json,
      methods_of_payment: location.methods_of_payment,
      meal_times: location.meal_times as unknown as Json[],
      apple_maps_link: location.apple_maps_link,
      google_maps_link: location.google_maps_link,
      image: location.image,
      type_id: location.type_id,
      force_close: location.force_close || false,
      has_menus: location.has_menus || false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Insert error:", error.message);
    throw error;
  }

  console.log("✅ Location added successfully:", data.name);
  return data as unknown as Location;
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("location")
    .delete()
    .eq("id", locationId);

  if (error) {
    console.error("❌ Delete error:", error.message);
    throw new Error(`Failed to delete location: ${error.message}`);
  }

  console.log("🗑️ Location deleted successfully");
  return { success: true };
}

export async function updateLocation(locationId: string, location: Location) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("location")
    .update({
      name: location.name,
      colloquial_name: location.colloquial_name,
      address: location.address,
      description: location.description,
      regular_service_hours: location.regular_service_hours as unknown as Json,
      methods_of_payment: location.methods_of_payment,
      meal_times: location.meal_times as unknown as Json[],
      apple_maps_link: location.apple_maps_link,
      google_maps_link: location.google_maps_link,
      image: location.image,
      type_id: location.type_id,
      force_close: location.force_close || false,
      has_menus: location.has_menus || false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .select()
    .single();

  if (error) {
    console.error("❌ Update error:", error.message);
    throw new Error(`Failed to update location: ${error.message}`);
  }

  console.log("✏️ Location updated successfully:", data.name);
  return data as unknown as Location;
}

export async function toggleForceClose(
  locationId: string,
  forceClose: boolean,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("location")
    .update({
      force_close: forceClose,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .select()
    .single();

  if (error) {
    console.error("❌ Force close toggle error:", error.message);
    throw new Error(`Failed to toggle force close: ${error.message}`);
  }

  console.log(
    `🔒 Location force close ${forceClose ? "enabled" : "disabled"}:`,
    data.name,
  );
  return data as unknown as Location;
}

export async function checkLocationHasMenus(
  locationId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menu")
    .select("id")
    .eq("location_id", locationId)
    .limit(1);

  if (error) {
    console.error("❌ Menu check error:", error.message);
    return false; // Assume no menus if error occurs
  }

  const hasMenus = data && data.length > 0;
  console.log(`🍽️ Location ${locationId} has menus:`, hasMenus);
  return hasMenus;
}

export async function updateLocationDisplayOrder(
  locationId: string,
  displayOrder: number,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("location")
    .update({
      display_order: displayOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId);

  if (error) {
    console.error("❌ Display order update error:", error.message);
    throw new Error(`Failed to update display order: ${error.message}`);
  }

  console.log(`🔢 Location ${locationId} display_order set to ${displayOrder}`);
  return { success: true };
}
