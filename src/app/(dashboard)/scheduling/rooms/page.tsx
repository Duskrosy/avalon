import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RoomBookingView } from "./room-booking-view";
import { AddRoomForm } from "./add-room-form";

export default async function RoomsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  const userIsOps = isOps(currentUser);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Conference room booking
          </h1>
          <p className="text-gray-500 mt-1">
            Book a room — first come, first serve.
          </p>
        </div>
      </div>

      {userIsOps && <AddRoomForm />}

      <RoomBookingView currentUserId={currentUser.id} isOps={userIsOps} />
    </div>
  );
}