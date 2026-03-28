import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps } from "@/lib/permissions";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type: "leave" | "booking" | "birthday" | "task" | "goal";
  color: string;
  meta?: string;
};

// GET /api/calendar?month=2026-03
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM format

  if (!month) {
    return NextResponse.json({ error: "Month parameter required (YYYY-MM)" }, { status: 400 });
  }

  const [year, mo] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, mo, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
  const startISO = `${startDate}T00:00:00`;
  const endISO = `${endDate}T23:59:59`;

  const admin = createAdminClient();
  const userIsOps = isOps(currentUser);
  const events: CalendarEvent[] = [];

  // 1. Leaves (approved only)
  let leavesQuery = admin
    .from("leaves")
    .select("id, start_date, end_date, leave_type, user_id, profile:profiles!leaves_user_id_fkey(first_name, last_name, department_id)")
    .eq("status", "approved")
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (!userIsOps) {
    const { data: deptUsers } = await admin
      .from("profiles")
      .select("id")
      .eq("department_id", currentUser.department_id);
    const ids = (deptUsers ?? []).map((u) => u.id);
    if (ids.length > 0) leavesQuery = leavesQuery.in("user_id", ids);
  }

  const { data: leaves } = await leavesQuery;

  for (const leave of leaves ?? []) {
    const profile = leave.profile as unknown as { first_name: string; last_name: string };
    events.push({
      id: `leave-${leave.id}`,
      title: `${profile.first_name} ${profile.last_name} — ${leave.leave_type}`,
      date: leave.start_date,
      end_date: leave.end_date,
      type: "leave",
      color: "#f59e0b",
      meta: leave.leave_type,
    });
  }

  // 2. Room bookings
  const { data: bookings } = await admin
    .from("room_bookings")
    .select("id, title, start_time, end_time, room:rooms(name), booker:profiles!room_bookings_booked_by_fkey(first_name, last_name)")
    .gte("start_time", startISO)
    .lte("start_time", endISO);

  for (const booking of bookings ?? []) {
    const room = booking.room as unknown as { name: string };
    const booker = booking.booker as unknown as { first_name: string; last_name: string };
    events.push({
      id: `booking-${booking.id}`,
      title: `${booking.title} — ${room.name}`,
      date: booking.start_time.split("T")[0],
      type: "booking",
      color: "#3b82f6",
      meta: `${booker.first_name} ${booker.last_name}`,
    });
  }

  // 3. Birthdays
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, last_name, birthday, department_id")
    .eq("is_active", true)
    .not("birthday", "is", null);

  for (const p of profiles ?? []) {
    if (!p.birthday) continue;
    if (!userIsOps && p.department_id !== currentUser.department_id) continue;

    const bday = new Date(p.birthday);
    const thisYearBday = `${month}-${String(bday.getUTCDate()).padStart(2, "0")}`;
    const bdayMonth = bday.getUTCMonth() + 1;

    if (bdayMonth === mo) {
      events.push({
        id: `bday-${p.id}`,
        title: `🎂 ${p.first_name} ${p.last_name}'s birthday`,
        date: thisYearBday,
        type: "birthday",
        color: "#ec4899",
      });
    }
  }

  // 4. Kanban cards with due dates
  let cardsQuery = admin
    .from("kanban_cards")
    .select("id, title, due_date, column:kanban_columns(board:kanban_boards(department_id)), assignee:profiles!kanban_cards_assigned_to_fkey(first_name, last_name)")
    .not("due_date", "is", null)
    .gte("due_date", startDate)
    .lte("due_date", endDate);

  const { data: cards } = await cardsQuery;

  for (const card of cards ?? []) {
    const col = card.column as unknown as { board: { department_id: string } };
    if (!userIsOps && col?.board?.department_id !== currentUser.department_id) continue;

    const assignee = card.assignee as unknown as { first_name: string; last_name: string } | null;
    events.push({
      id: `task-${card.id}`,
      title: card.title,
      date: card.due_date!,
      type: "task",
      color: "#8b5cf6",
      meta: assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined,
    });
  }

  // 5. Goals with deadlines
  let goalsQuery = admin
    .from("goals")
    .select("id, title, deadline, status, department:departments(name)")
    .not("deadline", "is", null)
    .gte("deadline", startDate)
    .lte("deadline", endDate)
    .eq("status", "active");

  if (!userIsOps) {
    goalsQuery = goalsQuery.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  }

  const { data: goals } = await goalsQuery;

  for (const goal of goals ?? []) {
    const dept = goal.department as unknown as { name: string } | null;
    events.push({
      id: `goal-${goal.id}`,
      title: `🎯 ${goal.title}`,
      date: goal.deadline!,
      type: "goal",
      color: "#10b981",
      meta: dept?.name ?? "Company-wide",
    });
  }

  return NextResponse.json({ events });
}