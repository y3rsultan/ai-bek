export const dynamic = "force-dynamic";

import { getProjectAndUser, getTeamMembers } from "@/lib/tasks/actions";
import VoiceRecorder from "@/components/VoiceRecorder";

export default async function VoicePage() {
  const { project, user } = await getProjectAndUser();
  const teamMembers = await getTeamMembers(project.id);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Голосовой ввод</h2>
      <p className="text-sm text-slate-500 mb-6">
        Надиктуйте задачи, AI разберёт их автоматически
      </p>
      <VoiceRecorder
        projectId={project.id}
        userId={user.id}
        teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
