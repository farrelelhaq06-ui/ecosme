"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  /** Value used for sorting. Defaults to row[key]. */
  sortValue?: (row: T) => string | number | null;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  hideOnMobile?: boolean;
}

export interface TableFilter<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Cari…",
  filters = [],
  pageSize = 10,
  initialSort,
  emptyTitle = "Tidak ada data",
  emptyDescription,
  toolbar,
  caption,
  dense = false,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: TableFilter<T>[];
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  caption: string;
  dense?: boolean;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const processed = useMemo(() => {
    let out = rows;
    const q = query.trim().toLowerCase();
    if (q && searchText) out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    for (const f of filters) {
      const v = filterValues[f.key];
      if (v) out = out.filter((r) => f.match(r, v));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const get = col?.sortValue ?? ((r: T) => (r as Record<string, unknown>)[sort.key] as string | number | null);
      out = [...out].sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "id");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, filterValues, sort, columns, filters, searchText]);

  const pageCount = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const visible = processed.slice(current * pageSize, current * pageSize + pageSize);

  function toggleSort(key: string) {
    setPage(0);
    setSort((s) => (!s || s.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null));
  }

  const hasToolbar = !!searchText || filters.length > 0 || !!toolbar;

  return (
    <div>
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {searchText && (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[13px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              />
            </div>
          )}
          {filters.map((f) => (
            <select
              key={f.key}
              aria-label={f.label}
              value={filterValues[f.key] ?? ""}
              onChange={(e) => {
                setFilterValues((v) => ({ ...v, [f.key]: e.target.value }));
                setPage(0);
              }}
              className="h-9 rounded-lg border border-line-strong bg-white px-3 text-[13px] text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            >
              <option value="">{f.label}: Semua</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ))}
          {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-canvas/70">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const sortable = c.sortable !== false;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "whitespace-nowrap px-5 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideOnMobile && "hidden md:table-cell",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded uppercase hover:text-ink",
                          active && "text-ink",
                          c.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {c.header}
                        {active ? (
                          sort!.dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("border-b border-line/70 transition-colors last:border-0 hover:bg-brand-50/40", onRowClick && "cursor-pointer")}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-5 align-middle text-ink",
                      dense ? "py-2" : "py-3",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.hideOnMobile && "hidden md:table-cell",
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "–")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
      </div>

      {processed.length > pageSize && (
        <nav aria-label="Navigasi halaman tabel" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[12.5px] text-muted">
          <span>
            {current * pageSize + 1}–{Math.min(processed.length, (current + 1) * pageSize)} dari {processed.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Halaman sebelumnya">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {current + 1} / {pageCount}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1} aria-label="Halaman berikutnya">
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
