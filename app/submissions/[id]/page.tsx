import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import PageSkeleton from "../../components/page-skeleton";
import SubmissionDetailClient from "./submission-detail-client";

export const metadata: Metadata = {
  title: "Submission Detail",
  description: "Review staged data entries.",
};

export const dynamic = "force-dynamic";

async function SubmissionDetailContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/home");

  const { data: isAdmin } = await supabase.rpc("is_any_admin");
  if (!isAdmin) redirect("/home");

  return <SubmissionDetailClient />;
}

function SubmissionDetailPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <SubmissionDetailContent />
    </Suspense>
  );
}

export default SubmissionDetailPage;
