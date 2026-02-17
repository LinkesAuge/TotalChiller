import fs from "node:fs/promises";
import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { storageStatePath, type TestRole } from "./helpers/auth";

type JsonRecord = Record<string, unknown>;

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function asRecord(value: unknown): JsonRecord {
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
  expect(typeof value).toBe("object");
  return value as JsonRecord;
}

function assertNoEmailField(entry: JsonRecord): void {
  expect(Object.prototype.hasOwnProperty.call(entry, "email")).toBe(false);
}

function assertProfileMapContract(profiles: unknown): void {
  const map = asRecord(profiles);
  for (const profileValue of Object.values(map)) {
    const profile = asRecord(profileValue);
    assertNoEmailField(profile);
    expect("username" in profile).toBe(true);
    expect("display_name" in profile).toBe(true);
  }
}

function extractUserIdFromPayload(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const id = extractUserIdFromPayload(item);
      if (id) return id;
    }
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;

  const record = payload as JsonRecord;
  const maybeUser = record.user;
  if (typeof maybeUser === "object" && maybeUser !== null && !Array.isArray(maybeUser)) {
    const maybeId = (maybeUser as JsonRecord).id;
    if (typeof maybeId === "string" && maybeId.length > 0) {
      return maybeId;
    }
  }
  return null;
}

async function readUserIdFromStorageState(role: TestRole): Promise<string> {
  const raw = await fs.readFile(storageStatePath(role), "utf8");
  const state = JSON.parse(raw) as { cookies?: Array<{ name?: string; value?: string }> };
  const authCookie = (state.cookies ?? []).find((cookie) => {
    if (!cookie.name) return false;
    return cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token");
  });
  if (!authCookie?.value) {
    throw new Error(`Missing Supabase auth cookie in storage state for role: ${role}`);
  }

  const decoded = decodeURIComponent(authCookie.value);
  const payload = decoded.startsWith("base64-") ? decoded.slice(7) : decoded;

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    parsedPayload = JSON.parse(payload);
  }

  const userId = extractUserIdFromPayload(parsedPayload);
  if (!userId) {
    throw new Error(`Failed to extract user id from storage state for role: ${role}`);
  }
  return userId;
}

async function createAuthedApiContext(role: TestRole): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: BASE_URL,
    storageState: storageStatePath(role),
  });
}

function skipIfRateLimited(status: number, endpoint: string): void {
  test.skip(status === 429, `${endpoint} was rate-limited (429).`);
}

test.describe("Messages API: contract + privacy", () => {
  test.describe.configure({ mode: "serial" });

  test("all message endpoints keep stable envelopes and hide emails", async () => {
    const adminApi = await createAuthedApiContext("admin");
    const memberApi = await createAuthedApiContext("member");
    const seedSubject = `Contract seed ${Date.now()}`;
    const seedContent = "Contract test message body.";

    try {
      const searchResponse = await adminApi.get("/api/messages/search-recipients?q=te");
      expect([200, 429]).toContain(searchResponse.status());
      skipIfRateLimited(searchResponse.status(), "/api/messages/search-recipients");
      const searchBody = asRecord(await searchResponse.json());
      expect(Array.isArray(searchBody.data)).toBe(true);
      for (const rawEntry of searchBody.data as unknown[]) {
        const entry = asRecord(rawEntry);
        assertNoEmailField(entry);
        expect(typeof entry.id).toBe("string");
        expect(typeof entry.label).toBe("string");
        expect("username" in entry).toBe(true);
        expect(Array.isArray(entry.gameAccounts)).toBe(true);
      }

      const memberUserId = await readUserIdFromStorageState("member");
      const sendResponse = await adminApi.post("/api/messages", {
        data: {
          recipient_ids: [memberUserId],
          subject: seedSubject,
          content: seedContent,
          message_type: "private",
        },
      });
      expect([201, 429]).toContain(sendResponse.status());
      skipIfRateLimited(sendResponse.status(), "POST /api/messages");
      const sendBody = asRecord(await sendResponse.json());
      const sendData = asRecord(sendBody.data);
      expect(typeof sendData.id).toBe("string");
      expect(typeof sendBody.recipient_count).toBe("number");
      const messageId = sendData.id as string;
      let threadId = (typeof sendData.thread_id === "string" ? sendData.thread_id : null) ?? messageId;

      const inboxResponse = await memberApi.get("/api/messages");
      expect([200, 429]).toContain(inboxResponse.status());
      skipIfRateLimited(inboxResponse.status(), "GET /api/messages");
      const inboxBody = asRecord(await inboxResponse.json());
      expect(Array.isArray(inboxBody.data)).toBe(true);
      assertProfileMapContract(inboxBody.profiles);

      for (const rawThread of inboxBody.data as unknown[]) {
        const thread = asRecord(rawThread);
        const latest = asRecord(thread.latest_message);
        if (latest.id === messageId || latest.subject === seedSubject) {
          if (typeof thread.thread_id === "string") {
            threadId = thread.thread_id;
          }
          break;
        }
      }

      const threadResponse = await memberApi.get(`/api/messages/thread/${threadId}`);
      expect([200, 429]).toContain(threadResponse.status());
      skipIfRateLimited(threadResponse.status(), "GET /api/messages/thread/[threadId]");
      const threadBody = asRecord(await threadResponse.json());
      expect(Array.isArray(threadBody.data)).toBe(true);
      assertProfileMapContract(threadBody.profiles);

      const threadMessages = threadBody.data as unknown[];
      let targetMessageId = messageId;
      for (const rawMsg of threadMessages) {
        const message = asRecord(rawMsg);
        if (typeof message.id === "string") {
          targetMessageId = message.id;
          break;
        }
      }

      const markReadResponse = await memberApi.patch(`/api/messages/${targetMessageId}`, {
        data: { is_read: true },
      });
      expect([200, 404, 429]).toContain(markReadResponse.status());
      if (markReadResponse.status() === 200) {
        const markReadBody = asRecord(await markReadResponse.json());
        const markReadData = asRecord(markReadBody.data);
        expect(markReadData.id).toBe(targetMessageId);
        expect(markReadData.is_read).toBe(true);
      }

      const deleteMessageResponse = await memberApi.delete(`/api/messages/${targetMessageId}`);
      expect([200, 404, 429]).toContain(deleteMessageResponse.status());
      if (deleteMessageResponse.status() === 200) {
        const deleteMessageBody = asRecord(await deleteMessageResponse.json());
        const deleteMessageData = asRecord(deleteMessageBody.data);
        expect(deleteMessageData.id).toBe(targetMessageId);
        expect(deleteMessageData.deleted).toBe(true);
      }

      const deleteThreadResponse = await memberApi.delete(`/api/messages/thread/${threadId}`);
      expect([200, 404, 429]).toContain(deleteThreadResponse.status());
      if (deleteThreadResponse.status() === 200) {
        const deleteThreadBody = asRecord(await deleteThreadResponse.json());
        const deleteThreadData = asRecord(deleteThreadBody.data);
        expect(deleteThreadData.thread_id).toBe(threadId);
        expect(deleteThreadData.deleted).toBe(true);
      }

      const sentResponse = await adminApi.get(`/api/messages/sent?search=${encodeURIComponent(seedSubject)}`);
      expect([200, 429]).toContain(sentResponse.status());
      skipIfRateLimited(sentResponse.status(), "GET /api/messages/sent");
      const sentBody = asRecord(await sentResponse.json());
      expect(Array.isArray(sentBody.data)).toBe(true);
      assertProfileMapContract(sentBody.profiles);
      for (const rawMsg of sentBody.data as unknown[]) {
        const sentMessage = asRecord(rawMsg);
        const recipients = sentMessage.recipients;
        expect(Array.isArray(recipients)).toBe(true);
        for (const rawRecipient of recipients as unknown[]) {
          assertNoEmailField(asRecord(rawRecipient));
        }
      }

      const archiveListResponse = await adminApi.get("/api/messages/archive");
      expect([200, 429]).toContain(archiveListResponse.status());
      skipIfRateLimited(archiveListResponse.status(), "GET /api/messages/archive");
      const archiveListBody = asRecord(await archiveListResponse.json());
      expect(Array.isArray(archiveListBody.data)).toBe(true);
      assertProfileMapContract(archiveListBody.profiles);

      const archiveResponse = await adminApi.post("/api/messages/archive", {
        data: {
          type: "sent",
          ids: [messageId],
          action: "archive",
        },
      });
      expect([200, 404, 429]).toContain(archiveResponse.status());
      if (archiveResponse.status() === 200) {
        const archiveBody = asRecord(await archiveResponse.json());
        const archiveData = asRecord(archiveBody.data);
        expect(archiveData.type).toBe("sent");
        expect(archiveData.action).toBe("archive");
      }

      const unarchiveResponse = await adminApi.post("/api/messages/archive", {
        data: {
          type: "sent",
          ids: [messageId],
          action: "unarchive",
        },
      });
      expect([200, 404, 429]).toContain(unarchiveResponse.status());
      if (unarchiveResponse.status() === 200) {
        const unarchiveBody = asRecord(await unarchiveResponse.json());
        const unarchiveData = asRecord(unarchiveBody.data);
        expect(unarchiveData.type).toBe("sent");
        expect(unarchiveData.action).toBe("unarchive");
      }

      const deleteSentResponse = await adminApi.delete(`/api/messages/sent/${messageId}`);
      expect([200, 404, 429]).toContain(deleteSentResponse.status());
      if (deleteSentResponse.status() === 200) {
        const deleteSentBody = asRecord(await deleteSentResponse.json());
        const deleteSentData = asRecord(deleteSentBody.data);
        expect(deleteSentData.id).toBe(messageId);
        expect(deleteSentData.deleted).toBe(true);
      }
    } finally {
      await Promise.all([adminApi.dispose(), memberApi.dispose()]);
    }
  });
});
