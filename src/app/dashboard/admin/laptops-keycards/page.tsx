import { redirect } from "next/navigation";

/** Old bookmark target. Equipment agreements now live on the Agreements page. */
export default function AdminLaptopsKeycardsPage() {
  redirect("/dashboard/admin/agreements?tab=equipment");
}
