import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import { ThemeProvider } from "../../lib/theme/ThemeContext";

/**
 * A screen under test gets its own query client: no retries (a failing
 * mutation should surface its error on the first attempt, not 1.5s later) and
 * no cache carried between tests.
 */
export function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders a screen inside the providers the real tree gives it. Auth is not
 * included — screens that branch on it mock `useAuth` directly, which is
 * cheaper than driving a real sign-in for every test.
 */
export async function renderScreen(
  ui: ReactElement,
  { client = testQueryClient() }: { client?: QueryClient } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { client, ...(await render(ui, { wrapper: Wrapper })) };
}
