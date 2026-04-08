export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import SettingsForm from "@/components/SettingsForm";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getData() {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .limit(1)
    .single();

  return { project };
}

export default async function SettingsPage() {
  const { project } = await getData();
  if (!project) return <p>Проект не найден</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Настройки</h2>
      <SettingsForm project={project} />
    </div>
  );
}
