export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}
): PaginationParams {
  const page = Math.max(0, Number(searchParams.get('page') ?? defaults.page ?? 0));
  const requestedPageSize = Number(
    searchParams.get('pageSize') ?? searchParams.get('limit') ?? defaults.pageSize ?? 20
  );
  const maxPageSize = defaults.maxPageSize ?? 100;
  const pageSize = Math.min(Math.max(1, requestedPageSize), maxPageSize);

  return {
    page,
    pageSize,
    offset: page * pageSize,
  };
}
