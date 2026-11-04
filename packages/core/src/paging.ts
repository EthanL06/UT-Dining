export const PAGE_SIZE = 1000;

export interface PageResult<Row, Failure> {
  data: Row[] | null;
  error: Failure | null;
}

export type PageFetcher<Row, Failure> = (
  from: number,
  to: number,
) => PromiseLike<PageResult<Row, Failure>>;

export const fetchAllPages = async <Row, Failure>(
  fetchPage: PageFetcher<Row, Failure>,
  pageSize: number = PAGE_SIZE,
): Promise<PageResult<Row, Failure>> => {
  const rows: Row[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
};

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};
