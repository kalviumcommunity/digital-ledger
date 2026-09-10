import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getCustomers } from "@/app/actions/customers";
import { CustomersDirectory } from "@/components/customers/CustomersDirectory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers — KhataBook",
};

export default async function CustomersPage(
  props: PageProps<"/customers">
) {
  const query = await props.searchParams;
  const rawSearch = query?.search;
  const rawPage = query?.page;

  const search = typeof rawSearch === "string" ? rawSearch : "";
  const page =
    typeof rawPage === "string" && Number.parseInt(rawPage, 10) > 0
      ? Number.parseInt(rawPage, 10)
      : 1;

  const [user, result] = await Promise.all([
    requireUser(),
    getCustomers({ search, page }),
  ]);

  if (!result.success) {
    throw new Error(result.error);
  }

  return (
    <CustomersDirectory
      initialData={result.data}
      search={search}
      page={page}
      user={user}
    />
  );
}