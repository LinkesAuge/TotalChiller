import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

/* ─── Schemas ─── */

const APPROVAL_ACTION_SCHEMA = z.object({
  game_account_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

/**
 * PATCH /api/admin/game-account-approvals
 * Allows admins to approve or reject a pending game account request.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = APPROVAL_ACTION_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: account, error: lookupError } = await serviceClient
      .from("game_accounts")
      .select("id,user_id,game_username,approval_status")
      .eq("id", body.game_account_id)
      .single();
    if (lookupError || !account) {
      return NextResponse.json({ error: "Game account not found." }, { status: 404 });
    }
    if (account.approval_status !== "pending") {
      return NextResponse.json(
        { error: `Cannot ${body.action} an account that is already ${account.approval_status}.` },
        { status: 409 },
      );
    }
    const gameUsername = account.game_username as string;
    const accountUserId = account.user_id as string;
    if (body.action === "approve") {
      const { error: updateError } = await serviceClient
        .from("game_accounts")
        .update({ approval_status: "approved" })
        .eq("id", body.game_account_id);
      if (updateError) {
        console.error("[game-account-approvals PATCH]", updateError.message);
        return NextResponse.json({ error: "Failed to approve account." }, { status: 500 });
      }
      after(async () => {
        await Promise.all([
          serviceClient.from("messages").insert({
            sender_id: null,
            recipient_id: accountUserId,
            message_type: "system",
            subject: "Game Account Approved",
            content: `Your game account "${gameUsername}" has been approved. You can now be assigned to a clan.`,
          }),
          serviceClient.from("notifications").insert({
            user_id: accountUserId,
            type: "approval",
            title: "Game Account Approved",
            body: `Your game account "${gameUsername}" has been approved.`,
            reference_id: body.game_account_id,
          }),
        ]);
      });
      return NextResponse.json({ data: { id: body.game_account_id, approval_status: "approved" } });
    }
    after(async () => {
      await Promise.all([
        serviceClient.from("messages").insert({
          sender_id: null,
          recipient_id: accountUserId,
          message_type: "system",
          subject: "Game Account Rejected",
          content: `Your game account request for "${gameUsername}" has been rejected. You may try again with a different game account.`,
        }),
        serviceClient.from("notifications").insert({
          user_id: accountUserId,
          type: "approval",
          title: "Game Account Rejected",
          body: `Your request for "${gameUsername}" has been rejected.`,
          reference_id: body.game_account_id,
        }),
      ]);
    });
    const { error: deleteError } = await serviceClient.from("game_accounts").delete().eq("id", body.game_account_id);
    if (deleteError) {
      console.error("[game-account-approvals PATCH]", deleteError.message);
      return NextResponse.json({ error: "Failed to reject account." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: body.game_account_id, approval_status: "rejected", deleted: true } });
  } catch (err) {
    console.error("[game-account-approvals PATCH] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import type { PendingApprovalRow as PendingAccountWithProfile } from "@/lib/types/domain";

/**
 * GET /api/admin/game-account-approvals
 * Returns all pending game account requests for admin review.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const authGet = await requireAdmin();
    if (authGet.error) return authGet.error;
    const serviceClient = createSupabaseServiceRoleClient();
    const { data: pendingAccounts, error: fetchError } = await serviceClient
      .from("game_accounts")
      .select("id,user_id,game_username,approval_status,created_at")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });
    if (fetchError) {
      console.error("[game-account-approvals GET]", fetchError.message);
      return NextResponse.json({ error: "Failed to load pending approvals." }, { status: 500 });
    }
    const accounts = pendingAccounts ?? [];
    const userIds = Array.from(new Set(accounts.map((account) => account.user_id as string)));
    let profilesById: Record<string, { email: string; username: string | null; display_name: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profileData } = await serviceClient
        .from("profiles")
        .select("id,email,username,display_name")
        .in("id", userIds);
      profilesById = (profileData ?? []).reduce<typeof profilesById>((acc, profile) => {
        acc[profile.id as string] = {
          email: profile.email as string,
          username: profile.username as string | null,
          display_name: profile.display_name as string | null,
        };
        return acc;
      }, {});
    }
    const result: readonly PendingAccountWithProfile[] = accounts.map((account) => ({
      id: account.id as string,
      user_id: account.user_id as string,
      game_username: account.game_username as string,
      approval_status: account.approval_status as string,
      created_at: account.created_at as string,
      profiles: profilesById[account.user_id as string] ?? null,
    }));
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[game-account-approvals GET] Unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
