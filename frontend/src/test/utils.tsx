import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderWithProvidersOptions extends RenderOptions {
  initialPath?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  { initialPath = '/', ...options }: RenderWithProvidersOptions = {}
) {
  const qc = createTestQueryClient();
  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper as any, ...options });
}
