// app/dashboard/page.tsx (Server Component)
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationType } from "@/types/location";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import DashboardLocationsClient from "@/components/dashboard/locations/dashboard-locations-client";

async function getLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("location")
    .select("*")
    .order("display_order", {
      ascending: true,
    });

  console.log("📍 Locations fetched");
  if (error) {
    console.error(error.message);
    return [];
  }

  return (data as unknown as Location[]) || [];
}

async function getLocationTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("location_type").select("*");
  if (error) {
    console.error("❌ Failed to fetch location types:", error.message);
    return [];
  }
  return (data as unknown as LocationType[]) || [];
}

async function getLocationMenuStatus(
  locations: Location[],
): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const menuStatus: Record<string, boolean> = {};

  // Get all location IDs
  const locationIds = locations
    .map((loc) => loc.id)
    .filter(Boolean) as string[];

  if (locationIds.length === 0) {
    return menuStatus;
  }

  try {
    // Fetch all menus for all locations in one query
    const { data, error } = await supabase
      .from("menu")
      .select("location_id")
      .in("location_id", locationIds);

    if (error) {
      console.error("❌ Menu check error:", error.message);
      // Default all locations to no menus on error
      locationIds.forEach((id) => {
        menuStatus[id] = false;
      });
    } else {
      // Create a set of location IDs that have menus
      const locationsWithMenus = new Set(
        data?.map((menu) => menu.location_id) || [],
      );

      // Set menu status for each location
      locationIds.forEach((id) => {
        menuStatus[id] = locationsWithMenus.has(id);
      });
    }
  } catch (error) {
    console.error("❌ Failed to check menus for locations:", error);
    // Default all locations to no menus on error
    locationIds.forEach((id) => {
      menuStatus[id] = false;
    });
  }

  console.log("🍽️  Menu status loaded for all locations");
  return menuStatus;
}

export default async function DashboardPage() {
  const locations = await getLocations();
  const locationTypes = await getLocationTypes();
  const locationMenuStatus = await getLocationMenuStatus(locations);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLocationsClient
        initialLocations={locations}
        locationTypes={locationTypes}
        initialLocationMenuStatus={locationMenuStatus}
      />
    </Suspense>
  );
}
