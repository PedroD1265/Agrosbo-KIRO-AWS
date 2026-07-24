export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  scopeType: "all" | "block" | "greenhouse";
  scopeId: string;
  assignee: string;
  status: string;
}

export const TODAY = new Date().toISOString().slice(0, 10);

export function defaultFilters(): ReportFilters {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return {
    dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
    dateTo: TODAY,
    scopeType: "all",
    scopeId: "all",
    assignee: "all",
    status: "all",
  };
}
