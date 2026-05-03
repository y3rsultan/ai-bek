export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AnalyticsPage() {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .limit(1)
    .single();

  if (!project) return <p>Проект не найден</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Аналитика</h2>
      <AnalyticsDashboard projectId={project.id} />
    </div>
  );
}
