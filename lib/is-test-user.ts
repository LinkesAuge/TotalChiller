/** Pattern matching E2E / automated test user email addresses. */
export const TEST_USER_PATTERN = /^test-.*@example\.com$/;

/** Returns true if the email belongs to an E2E test user. */
export function isTestUser(email: string): boolean {
  return TEST_USER_PATTERN.test(email);
}
