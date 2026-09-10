import type { DashboardCustomer } from '@/app/dashboard/types';

export interface CustomerApiResponse {
  success: boolean;
  data?: DashboardCustomer[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Fetches customers from Person 1's real Customer API (/api/customers).
 */
export async function fetchCustomersFromApi(): Promise<DashboardCustomer[]> {
  const res = await fetch('/api/customers', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch customers: ${res.statusText}`);
  }

  const json: CustomerApiResponse = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json?.error?.message || 'Invalid customer response received from API');
  }

  return json.data;
}
