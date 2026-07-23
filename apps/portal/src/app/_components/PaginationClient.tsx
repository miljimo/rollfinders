"use client";

import { Pagination as SharedPagination } from "@miljimo/react-components";
import type { ReactNode } from "react";

import type { PaginationProps } from "./Pagination";

type PaginationClientProps = Omit<PaginationProps, "getPageHref" | "summaryLabel"> & {
  pageHrefs?: Record<number, string>;
  summaryText?: ReactNode;
};

export function PaginationClient({ pageHrefs, summaryText, ...props }: PaginationClientProps) {
  return (
    <SharedPagination
      {...props}
      getPageHref={pageHrefs ? (page) => pageHrefs[page] : undefined}
      summaryLabel={summaryText === undefined ? undefined : () => summaryText}
    />
  );
}
