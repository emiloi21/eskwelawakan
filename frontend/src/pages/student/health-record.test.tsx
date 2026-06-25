import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import StudentHealthRecordPage from '@/pages/student/health-record';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '@/lib/api';

const mockHealthRecord = {
  blood_type: 'O+',
  height_cm: 165,
  weight_kg: 58,
  vision_left: '20/20',
  vision_right: '20/20',
  hearing_left: 'Normal',
  hearing_right: 'Normal',
  medical_conditions: 'None',
  allergies: 'Penicillin',
  current_medications: null,
  last_physical_exam: '2025-01-15',
  philhealth_no: '012345678901',
};

describe('StudentHealthRecordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows page title', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockHealthRecord } });
    renderWithProviders(<StudentHealthRecordPage />);
    await waitFor(() => {
      expect(screen.getByText('My Health Record')).toBeInTheDocument();
    });
  });

  it('renders health record data', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockHealthRecord } });
    renderWithProviders(<StudentHealthRecordPage />);

    await waitFor(() => {
      expect(screen.getByText('O+')).toBeInTheDocument();
    });

    expect(screen.getByText('Penicillin')).toBeInTheDocument();
  });

  it('shows "no record" message when data is null', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: null } });
    renderWithProviders(<StudentHealthRecordPage />);

    await waitFor(() => {
      expect(screen.getByText(/no health record on file/i)).toBeInTheDocument();
    });
  });

  it('calls the correct API endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockHealthRecord } });
    renderWithProviders(<StudentHealthRecordPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/clinic/my-health-record');
    });
  });
});
