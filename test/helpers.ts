import { NextRequest } from "next/server";

/**
 * Creates a NextRequest for testing API route handlers.
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const { method = "GET", body, headers = {}, searchParams = {} } = options;
  const fullUrl = new URL(url, "http://localhost:3000");
  for (const [key, value] of Object.entries(searchParams)) {
    fullUrl.searchParams.set(key, value);
  }

  const defaultHeaders: Record<string, string> = {
    "x-real-ip": "127.0.0.1",
    ...headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    defaultHeaders["Content-Type"] ??= "application/json";
  }

  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: defaultHeaders,
  };

  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, init);
}

/**
 * Extracts the JSON body and status from a NextResponse.
 */
export async function parseResponse(response: Response): Promise<{ status: number; body: unknown }> {
  const status = response.status;
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status, body };
}
