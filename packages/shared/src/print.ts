export function paginateRows<T>(rows: readonly T[], rowsPerPage: number): T[][] {
  if (!Number.isInteger(rowsPerPage) || rowsPerPage <= 0) {
    throw new Error("rowsPerPage must be a positive integer");
  }

  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }
  return pages;
}

