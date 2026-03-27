export type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  name: string;
  slug: string;
  tier: 1 | 2 | 3;
  description: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  department_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  birthday: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileWithRelations = Profile & {
  department: Department;
  role: Role;
};

export type MasterGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

export type View = {
  id: string;
  master_group_id: string;
  name: string;
  slug: string;
  description: string | null;
  route: string;
  sort_order: number;
  created_at: string;
};

export type ViewWithMasterGroup = View & {
  master_group: MasterGroup;
};

export type DepartmentMasterGroup = {
  id: string;
  department_id: string;
  master_group_id: string;
  enabled: boolean;
};

export type DepartmentView = {
  id: string;
  department_id: string;
  view_id: string;
  ops_allowed: boolean;
  manager_enabled: boolean;
};

export type UserViewOverride = {
  id: string;
  user_id: string;
  view_id: string;
  enabled: boolean;
  set_by: string;
  created_at: string;
};

export type KpiEntry = {
  id: string;
  department_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  source: string;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  target_value: number | null;
  target_unit: string | null;
  metric_name: string | null;
  deadline: string | null;
  status: "active" | "completed" | "missed" | "cancelled";
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Leave = {
  id: string;
  user_id: string;
  leave_type: "vacation" | "sick" | "personal" | "other";
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type LeaveWithProfile = Leave & {
  profile: Pick<Profile, "first_name" | "last_name" | "department_id">;
};

export type Kop = {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type KopVersion = {
  id: string;
  kop_id: string;
  version_number: number;
  file_url: string;
  file_type: string | null;
  change_notes: string | null;
  uploaded_by: string;
  created_at: string;
};

export type LearningMaterial = {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  material_type: "video" | "pdf" | "presentation" | "document" | "link";
  file_url: string | null;
  external_link: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
};

export type Memo = {
  id: string;
  department_id: string | null;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type MemoSignature = {
  id: string;
  memo_id: string;
  user_id: string;
  signed_at: string;
};

export type KanbanBoard = {
  id: string;
  department_id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type KanbanColumn = {
  id: string;
  board_id: string;
  name: string;
  sort_order: number;
};

export type KanbanCard = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  department_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  kanban_card_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
  is_active: boolean;
};

export type RoomBooking = {
  id: string;
  room_id: string;
  booked_by: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  department_id: string | null;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  created_by: string;
  expires_at: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};