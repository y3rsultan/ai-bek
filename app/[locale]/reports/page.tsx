export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import ReportView from "@/components/ReportView";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getData() {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .limit(1)
    .single();

  if (!project) return { project: null, reports: [] };

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("project_id", project.id)
    .order("report_date", { ascending: false })
    .limit(14);

  // Get any user with telegram for sending reports
  const { data: foreman } = await supabase
    .from("users")
    .select("telegram_chat_id")
    .eq("project_id", project.id)
    .not("telegram_chat_id", "is", null)
    .limit(1)
    .single();

  return {
    project,
    reports: reports || [],
    foremanChatId: foreman?.telegram_chat_id || null,
  };
}

export default async function ReportsPage() {
  const { project, reports, foremanChatId } = await getData();
  if (!project) return <p>Проект не найден</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Отчёты</h2>
      <ReportView
        projectId={project.id}
        projectName={project.name}
        reports={reports}
        foremanChatId={foremanChatId}
      />
    </div>
  );
}
