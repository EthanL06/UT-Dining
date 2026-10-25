"use server";

import { createClient } from "@/lib/supabase/server";
import type { AppConfig, CreditsConfig, HelpSupportConfig } from "@/types/config";

// About Section - App Configuration
export async function getAppConfig(): Promise<AppConfig> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("app_information")
    .select("about_title, about_description")
    .single();
  
  if (error) {
    console.error("Error fetching app configuration:", error);
    // Return default values instead of crashing
    return {
      title: "UT Dining",
      description: "Find dining locations, menus, and meal times across UT Austin campus.",
    };
  }
  
  return {
    title: data?.about_title || "UT Dining",
    description: data?.about_description || "Find dining locations, menus, and meal times across UT Austin campus.",
  };
}

export async function updateAppConfig(config: AppConfig): Promise<AppConfig> {
  const supabase = await createClient();
  
  // First check if a record exists
  const { data: existingData, error: fetchError } = await supabase
    .from("app_information")
    .select("id")
    .limit(1)
    .single();
  
  if (fetchError && fetchError.code === 'PGRST116') {
    // No record exists, insert a new one
    const { data: insertData, error: insertError } = await supabase
      .from("app_information")
      .insert({
        about_title: config.title,
        about_description: config.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("about_title, about_description")
      .single();
    
    if (insertError) {
      console.error("Error creating app configuration:", insertError);
      return config; // Return the input config as fallback
    }
    
    return {
      title: insertData.about_title || config.title,
      description: insertData.about_description || config.description,
    };
  } else if (fetchError) {
    console.error("Error checking existing app configuration:", fetchError);
    return config; // Return the input config as fallback
  }
  
  // Record exists, update it using the ID
  const { data, error } = await supabase
    .from("app_information")
    .update({
      about_title: config.title,
      about_description: config.description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingData.id)
    .select("about_title, about_description")
    .single();
  
  if (error) {
    console.error("Error updating app configuration:", error);
    return config; // Return the input config as fallback
  }
  
  return {
    title: data.about_title || config.title,
    description: data.about_description || config.description,
  };
}

// Credits Section
export async function getCreditsConfig(): Promise<CreditsConfig> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("app_information")
    .select("credits_contributors")
    .single();
  
  if (error) {
    console.error("Error fetching credits configuration:", error);
    // Return default values instead of crashing
    return {
      contributors: [],
    };
  }
  
  const contributors = data?.credits_contributors as any[] || [];
  return {
    contributors: contributors.map((contributor: any) => ({
      id: contributor.id,
      name: contributor.name,
      order: contributor.order,
    })),
  };
}

export async function updateCreditsConfig(config: CreditsConfig): Promise<CreditsConfig> {
  const supabase = await createClient();
  
  // First check if a record exists
  const { data: existingData, error: fetchError } = await supabase
    .from("app_information")
    .select("id")
    .limit(1)
    .single();
  
  if (fetchError && fetchError.code === 'PGRST116') {
    // No record exists, insert a new one
    const { data: insertData, error: insertError } = await supabase
      .from("app_information")
      .insert({
        about_title: "UT Dining", // Required field
        about_description: "Find dining locations, menus, and meal times across UT Austin campus.", // Required field
        credits_contributors: config.contributors,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("credits_contributors")
      .single();
    
    if (insertError) {
      console.error("Error creating credits configuration:", insertError);
      return config; // Return the input config as fallback
    }
    
    const contributors = insertData.credits_contributors as any[] || [];
    return {
      contributors: contributors.map((contributor: any) => ({
        id: contributor.id,
        name: contributor.name,
        order: contributor.order,
      })),
    };
  } else if (fetchError) {
    console.error("Error checking existing credits configuration:", fetchError);
    return config; // Return the input config as fallback
  }
  
  // Record exists, update it using the ID
  const { data, error } = await supabase
    .from("app_information")
    .update({
      credits_contributors: config.contributors,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingData.id)
    .select("credits_contributors")
    .single();
  
  if (error) {
    console.error("Error updating credits configuration:", error);
    return config; // Return the input config as fallback
  }
  
  const contributors = data.credits_contributors as any[] || [];
  return {
    contributors: contributors.map((contributor: any) => ({
      id: contributor.id,
      name: contributor.name,
      order: contributor.order,
    })),
  };
}

// Help & Support Section
export async function getHelpSupportConfig(): Promise<HelpSupportConfig> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("app_information")
    .select("support_links")
    .single();
  
  if (error) {
    console.error("Error fetching help & support configuration:", error);
    // Return default values instead of crashing
    return {
      links: [],
    };
  }
  
  const links = data?.support_links as any[] || [];
  return {
    links: links.map((link: any) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      order: link.order,
    })),
  };
}

export async function updateHelpSupportConfig(config: HelpSupportConfig): Promise<HelpSupportConfig> {
  const supabase = await createClient();
  
  // First check if a record exists
  const { data: existingData, error: fetchError } = await supabase
    .from("app_information")
    .select("id")
    .limit(1)
    .single();
  
  if (fetchError && fetchError.code === 'PGRST116') {
    // No record exists, insert a new one
    const { data: insertData, error: insertError } = await supabase
      .from("app_information")
      .insert({
        about_title: "UT Dining", // Required field
        about_description: "Find dining locations, menus, and meal times across UT Austin campus.", // Required field
        support_links: config.links,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("support_links")
      .single();
    
    if (insertError) {
      console.error("Error creating help & support configuration:", insertError);
      return config; // Return the input config as fallback
    }
    
    const links = insertData.support_links as any[] || [];
    return {
      links: links.map((link: any) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        order: link.order,
      })),
    };
  } else if (fetchError) {
    console.error("Error checking existing help & support configuration:", fetchError);
    return config; // Return the input config as fallback
  }
  
  // Record exists, update it using the ID
  const { data, error } = await supabase
    .from("app_information")
    .update({
      support_links: config.links,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingData.id)
    .select("support_links")
    .single();
  
  if (error) {
    console.error("Error updating help & support configuration:", error);
    return config; // Return the input config as fallback
  }
  
  const links = data.support_links as any[] || [];
  return {
    links: links.map((link: any) => ({
      id: link.id,
      label: link.label,
      url: link.url,
      order: link.order,
    })),
  };
} 