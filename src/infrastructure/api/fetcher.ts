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
  // Error responses from nginx/proxies (502/504 …) are often HTML, not JSON.
  // Guard JSON.parse so a non-JSON body surfaces as `data: undefined` with the
  // real status code instead of throwing an unhandled SyntaxError.
  let data: unknown = undefined;
  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      data = undefined;
    }
  }
  return { status: response.status, data, headers: response.headers } as T;
};
