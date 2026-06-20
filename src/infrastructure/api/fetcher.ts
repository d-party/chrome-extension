import { API_BASE_URL } from "@/infrastructure/env";

/**
 * Custom fetch mutator used by the orval-generated REST client. Prefixes the
 * backend base URL and returns orval's `{ status, data, headers }` contract.
 */
export const customFetch = async <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  const body = await response.text();
  const data = body ? JSON.parse(body) : undefined;
  return { status: response.status, data, headers: response.headers } as T;
};
