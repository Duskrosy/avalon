import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { KopDetail } from "./kop-detail";

export default async function KopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <KopDetail
      kopId={id}
      isManager={isManagerOrAbove(currentUser)}
    />
  );
}