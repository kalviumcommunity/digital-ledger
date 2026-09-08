import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getGlobalTransactions } from "@/app/actions/transactions";
import { TransactionsDashboard } from "@/components/transactions/TransactionsDashboard";
import type { TransactionFilters } from "@/app/actions/transactions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transactions — KhataBook",
};

export default async function TransactionsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await props.searchParams;

  const search = typeof query?.search === "string" ? query.search : "";
  const type: "ALL" | "CREDIT" | "DEBIT" =
    query?.type === "CREDIT" || query?.type === "DEBIT" ? query.type : "ALL";
  const dateFrom = typeof query?.dateFrom === "string" ? query.dateFrom : "";
  const dateTo = typeof query?.dateTo === "string" ? query.dateTo : "";
  const page =
    typeof query?.page === "string" && Number.parseInt(query.page, 10) > 0
      ? Number.parseInt(query.page, 10)
      : 1;

  const filters: TransactionFilters = {
    search: search || undefined,
    type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const [user, result] = await Promise.all([
    requireUser(),
    getGlobalTransactions({ ...filters, page }),
  ]);

  if (!result.success) {
    throw new Error(result.error);
  }

  return (
    <TransactionsDashboard
      initialData={result.data}
      filters={{
        search,
        type,
        dateFrom,
        dateTo,
      }}
      page={page}
      user={user}
    />
  );
}