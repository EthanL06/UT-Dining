"use server";

import { createClient } from "@/lib/supabase/server";

// Types
export interface NotificationData {
  title: string;
  body: string;
  redirectLink?: string;
  scheduledAt?: Date;
  isScheduled: boolean;
  notification_type_id: string;
}

// Backend functions
export async function sendNotification(data: NotificationData) {
  console.log("⏳ Sending notification...");
  const supabase = await createClient();

  const { data: response, error } = await supabase.functions.invoke("manual-push-notification", {
    body: {      
      title: data.title,  
      body: data.body,
      redirect_url: data.redirectLink,
      type: data.notification_type_id,
    },
  });

  if (error) {
    console.error("❌ Error sending notification:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  console.log("✅ Notification sent successfully");

  return {
    success: true,
    message: `Notification sent successfully to ${response.sent} devices.`,
  };
}

export async function scheduleNotification(data: NotificationData) {
  if (!data.scheduledAt) {
    return {
      success: false,
      message: "Scheduled time is required",
    };
  }

  console.log("⏳ Scheduling notification...");

  const supabase = await createClient();

  // Ensure we have a valid Date object
  const scheduledAt = data.scheduledAt instanceof Date 
    ? data.scheduledAt 
    : new Date(data.scheduledAt);

  if (isNaN(scheduledAt.getTime())) {
    return {
      success: false,
      message: "Invalid scheduled time provided",
    };
  }

  // Push to scheduled notifications table
  const { error } = await supabase.from("notifications").insert({
    title: data.title,
    body: data.body,
    redirect_url: data.redirectLink,
    scheduled_at: scheduledAt.toISOString(),
    type: data.notification_type_id,
  });

  if (error) {
    console.error("❌ Error scheduling notification:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  console.log("✅ Notification scheduled successfully");
  
  return {
    success: true,
    message: `Notification scheduled successfully for ${scheduledAt.toLocaleString()}`,
  };
}

export async function getScheduledNotifications() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*, notification_types(name)")
    .not("scheduled_at", "is", null)
    .order("scheduled_at", { ascending: true });


  if (error) {
    console.error("❌ Error fetching scheduled notifications:", error);
    return [];
  }

  return data || [];
}

export async function deleteScheduledNotification(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("❌ Error deleting scheduled notification:", error);
    return {
      success: false,
      message: error.message,
    };
  }

  console.log("✅ Scheduled notification deleted successfully");
  
  return {
    success: true,
    message: "Scheduled notification deleted successfully",
  };
} 

export async function getNotificationTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("notification_types").select("*").order("name", { ascending: true });

  if (error) {
    console.error("❌ Error fetching notification types:", error);
    return [];
  }

  return data || [];
}