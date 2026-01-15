import { getDashboardMetrics } from '@/lib/api/dashboard';
import { apiFetch } from '@/lib/api/client';

// Mock the apiFetch function
jest.mock('@/lib/api/client');

describe('getDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches dashboard metrics successfully', async () => {
    const mockMetrics = {
      totalProposals: 42,
      inProgress: 15,
      completed: 27,
      dueSoon: 3,
    };

    (apiFetch as jest.Mock).mockResolvedValueOnce(mockMetrics);

    const result = await getDashboardMetrics('test-token');

    expect(apiFetch).toHaveBeenCalledWith('/dashboard/metrics', {
      method: 'GET',
      token: 'test-token',
    });
    expect(result).toEqual(mockMetrics);
  });

  it('returns correct metric types', async () => {
    const mockMetrics = {
      totalProposals: 100,
      inProgress: 25,
      completed: 70,
      dueSoon: 5,
    };

    (apiFetch as jest.Mock).mockResolvedValueOnce(mockMetrics);

    const result = await getDashboardMetrics('test-token');

    expect(typeof result.totalProposals).toBe('number');
    expect(typeof result.inProgress).toBe('number');
    expect(typeof result.completed).toBe('number');
    expect(typeof result.dueSoon).toBe('number');
  });

  it('handles API errors', async () => {
    const apiError = new Error('API Error');
    (apiFetch as jest.Mock).mockRejectedValueOnce(apiError);

    await expect(getDashboardMetrics('test-token')).rejects.toThrow('API Error');
  });
});
