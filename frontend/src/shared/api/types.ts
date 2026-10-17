/** Pagination envelope shared by products, inventory, sales and platform lists. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** Error body produced by the gateway and every service exception filter. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
  timestamp?: string;
  path?: string;
}
