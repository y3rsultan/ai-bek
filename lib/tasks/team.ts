"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function addWorker(formData: FormData) {
  const supabase = createServiceClient();

  const { error } = await supabase.from("users").insert({
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    project_id: formData.get("project_id") as string,
  });

  if (error) throw error;
}

export async function updateMember(id: string, name: string, role: string) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("users")
    .update({ name, role })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteMember(id: string) {
  const supabase = createServiceClient();

  // Soft delete — just deactivate
  const { error } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
