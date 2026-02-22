import { vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

type MockResult = { data: unknown; error: unknown; count?: number };

interface ChainableMock {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  match: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  returns: ReturnType<typeof vi.fn>;
  textSearch: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

/**
 * Creates a chainable Supabase query builder mock.
 * Every method returns `this` for chaining. The mock is thenable –
 * awaiting it (or calling `.then()`) resolves to `result`.
 */
export function createChainableMock(result: MockResult = { data: null, error: null }): ChainableMock {
  const chain: ChainableMock = {} as ChainableMock;

  const chainMethods = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "like",
    "ilike",
    "contains",
    "or",
    "not",
    "filter",
    "match",
    "order",
    "limit",
    "range",
    "returns",
    "textSearch",
  ] as const;

  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);

  const thenImpl = (
    onfulfilled?: ((value: MockResult) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise.resolve(result).then(onfulfilled, onrejected);

  Object.defineProperty(chain, "then", {
    value: vi.fn().mockImplementation(thenImpl),
    writable: true,
    enumerable: false,
    configurable: true,
  });

  return chain;
}

export function setChainResult(chain: ChainableMock, result: MockResult): void {
  chain.single.mockReturnValue(chain);
  chain.maybeSingle.mockReturnValue(chain);
  chain.then.mockImplementation(
    (onfulfilled?: ((value: MockResult) => unknown) | null, onrejected?: ((reason: unknown) => unknown) | null) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  );
}

interface MockSupabaseOptions {
  authUser?: { id: string; email?: string } | null;
  authError?: { message: string } | null;
}

/**
 * Creates a mock Supabase client with configurable auth and query behavior.
 * Use `mockFrom` to control what `.from(table)` returns.
 */
export function createMockSupabase(options: MockSupabaseOptions = {}): {
  supabase: SupabaseClient;
  mockFrom: ReturnType<typeof vi.fn>;
  mockRpc: ReturnType<typeof vi.fn>;
  mockStorage: { from: ReturnType<typeof vi.fn> };
} {
  const { authUser = { id: "test-user-id", email: "test@example.com" }, authError = null } = options;

  const defaultChain = createChainableMock();
  const mockFrom = vi.fn().mockReturnValue(defaultChain);
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const uploadMock = vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null });
  const removeMock = vi.fn().mockResolvedValue({ data: null, error: null });
  const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file.png" } });

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: uploadMock,
      remove: removeMock,
      getPublicUrl: getPublicUrlMock,
    }),
  };

  const supabase = {
    from: mockFrom,
    rpc: mockRpc,
    storage: mockStorage,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: authError,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: authUser ? { user: authUser, access_token: "mock-token" } : null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: authUser, session: { access_token: "mock-token" } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  } as unknown as SupabaseClient;

  return { supabase, mockFrom, mockRpc, mockStorage };
}
