import {
  CursorPaginatedResponse,
  SortOrder,
  Edge,
  Connection,
} from './pagination.dto';

/**
 * Cursor data structure
 */
interface CursorData {
  id: string;
  [key: string]: string | number | Date;
}

/**
 * Utility class for cursor-based pagination
 */
export class CursorPagination {
  /**
   * Encode cursor data to base64 string
   */
  static encodeCursor(data: CursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Decode base64 cursor string to cursor data
   */
  static decodeCursor(cursor: string): CursorData | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded) as CursorData;
    } catch {
      return null;
    }
  }

  /**
   * Build Prisma cursor query for forward pagination
   */
  static buildCursorQuery<T extends { id: string }>(
    cursor: string | undefined,
    sortField: keyof T = 'id' as keyof T,
    sortOrder: SortOrder = SortOrder.DESC,
  ): { cursor?: { id: string }; skip?: number } {
    if (!cursor) {
      return {};
    }

    const cursorData = this.decodeCursor(cursor);
    if (!cursorData) {
      return {};
    }

    return {
      cursor: { id: cursorData.id },
      skip: 1, // Skip the cursor item itself
    };
  }

  /**
   * Build pagination result from items
   */
  static buildResult<T extends { id: string }>(
    items: T[],
    limit: number,
    cursorField: keyof T = 'id' as keyof T,
    totalCount?: number,
  ): CursorPaginatedResponse<T> {
    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const startCursor =
      data.length > 0
        ? this.encodeCursor({ id: String(data[0].id), [cursorField as string]: data[0][cursorField] as string })
        : null;

    const endCursor =
      data.length > 0
        ? this.encodeCursor({
            id: String(data[data.length - 1].id),
            [cursorField as string]: data[data.length - 1][cursorField] as string,
          })
        : null;

    return {
      data,
      meta: {
        hasNextPage,
        hasPreviousPage: false, // Would need additional logic
        startCursor,
        endCursor,
        totalCount,
      },
    };
  }

  /**
   * Build connection-style result (GraphQL compatible)
   */
  static buildConnection<T extends { id: string }>(
    items: T[],
    limit: number,
    cursorField: keyof T = 'id' as keyof T,
    totalCount?: number,
  ): Connection<T> {
    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    const edges: Edge<T>[] = data.map((item) => ({
      node: item,
      cursor: this.encodeCursor({
        id: String(item.id),
        [cursorField as string]: item[cursorField] as string,
      }),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        totalCount,
      },
      totalCount,
    };
  }
}

/**
 * Helper to create cursor-based findMany options for Prisma
 */
export function createCursorPaginationOptions<T extends { id: string }>(
  cursor: string | undefined,
  limit: number,
  orderBy: Record<string, SortOrder> = { createdAt: SortOrder.DESC },
): {
  take: number;
  cursor?: { id: string };
  skip?: number;
  orderBy: Record<string, SortOrder>;
} {
  const cursorQuery = CursorPagination.buildCursorQuery<T>(cursor);

  return {
    take: limit + 1, // Fetch one extra to check if there's a next page
    ...cursorQuery,
    orderBy,
  };
}
