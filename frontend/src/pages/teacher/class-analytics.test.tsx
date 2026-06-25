import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import ClassAnalyticsPage from '@/pages/teacher/class-analytics';

// Mock the api module
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock react-router-dom useParams
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ classId: 'test-class-1' }),
  };
});

import api from '@/lib/api';

describe('ClassAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<ClassAnalyticsPage />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders analytics data when loaded', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          {
            reg_id: 1,
            student_id: 'STU-00001',
            name: 'Juan Dela Cruz',
            assignments: { submitted: 8, total: 10, rate_pct: 80 },
            quizzes: { taken: 5, total: 5, avg_score_pct: 90 },
            discussions: { posts: 3, replies: 7 },
          },
        ],
        totals: { assignments: 10, quizzes: 5 },
      },
    });

    renderWithProviders(<ClassAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    });

    expect(screen.getByText('STU-00001')).toBeInTheDocument();
  });

  it('renders empty state when no students', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], totals: { assignments: 0, quizzes: 0 } },
    });

    renderWithProviders(<ClassAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No students enrolled in this class/i)).toBeInTheDocument();
    });
  });

  it('shows correct page heading', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], totals: { assignments: 0, quizzes: 0 } },
    });

    renderWithProviders(<ClassAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Class Analytics')).toBeInTheDocument();
    });
  });
});
