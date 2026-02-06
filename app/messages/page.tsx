import { redirect } from "next/navigation";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import AuthActions from "../components/auth-actions";
import MessagesClient from "./messages-client";

export const dynamic = "force-dynamic";

/**
 * Renders the messaging page with authentication guard.
 */
async function MessagesPage(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  return (
    <>
      <section className="header header-inline">
        <div className="title">Messages</div>
        <div className="actions">
          <AuthActions />
        </div>
      </section>
      <MessagesClient userId={data.user.id} />
    </>
  );
}

export default MessagesPage;
