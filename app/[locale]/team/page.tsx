export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import AddWorkerForm from "@/components/AddWorkerForm";
import TeamMemberCard from "@/components/TeamMemberCard";

async function getTeamData() {
  const supabase = createServiceClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .limit(1)
    .single();

  if (!project) return { project: null, members: [] };

  const { data: members } = await supabase
    .from("users")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_active", true)
    .order("role")
    .order("name");

  return { project, members: members || [] };
}

export default async function TeamPage() {
  const { project, members } = await getTeamData();
  if (!project) return <p>Проект не найден</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Команда</h2>

      <AddWorkerForm projectId={project.id} />

      <div className="space-y-3 mt-6">
        {members.map((m: any) => (
          <TeamMemberCard key={m.id} member={m} botUsername="aibek67_bot" />
        ))}
      </div>
    </div>
  );
}
