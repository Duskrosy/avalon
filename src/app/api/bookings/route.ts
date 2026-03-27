import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps } from "@/lib/permissions";

// GET /api/bookings?room_id=xxx&start=xxx&end=xxx
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("room_id");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const admin = createAdminClient();

  let query = admin
    .from("room_bookings")
    .select(`
      *,
      room:rooms(id, name, location, capacity),
      booker:profiles!room_bookings_booked_by_fkey(first_name, last_name)
    `)
    .order("start_time", { ascending: true });

  if (roomId) query = query.eq("room_id", roomId);
  if (start) query = query.gte("start_time", start);
  if (end) query = query.lte("end_time", end);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}

// POST /api/bookings — create a booking
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { room_id, title, start_time, end_time, notes } = body;

  if (!room_id || !title || !start_time || !end_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (new Date(start_time) >= new Date(end_time)) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  if (new Date(start_time) < new Date()) {
    return NextResponse.json({ error: "Cannot book in the past" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check for overlapping bookings
  const { data: conflicts } = await admin
    .from("room_bookings")
    .select("id")
    .eq("room_id", room_id)
    .lt("start_time", end_time)
    .gt("end_time", start_time);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: "This time slot is already booked. First come, first serve!" },
      { status: 409 }
    );
  }

  const { data, error } = await admin
    .from("room_bookings")
    .insert({
      room_id,
      booked_by: currentUser.id,
      title,
      start_time,
      end_time,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("no_overlap")) {
      return NextResponse.json(
        { error: "This time slot was just booked by someone else. Try another time." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ booking: data });
}

// DELETE /api/bookings?id=xxx — cancel a booking
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check ownership
  const { data: booking } = await admin
    .from("room_bookings")
    .select("booked_by")
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.booked_by !== currentUser.id && !isOps(currentUser)) {
    return NextResponse.json(
      { error: "You can only cancel your own bookings" },
      { status: 403 }
    );
  }

  const { error } = await admin.from("room_bookings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Booking cancelled" });
}