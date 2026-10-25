"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function login(formData: FormData) {
  const supabase = await createClient();
  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/dashboard");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
