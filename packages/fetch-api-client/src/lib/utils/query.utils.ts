/**
 * Builds a query string from a given object.
 * @param params
 */
export const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value
        .filter((v: unknown) => v !== undefined && v !== null)
        .forEach((v: unknown) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

export const getJoinedUrl = (baseUrl: string, url: string) => {
  return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
};
