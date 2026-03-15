export type Priority = "low" | "medium" | "high";
export type AssignedTo = "Andrew" | "Chrystalla" | "Both" | "Lulu";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: Priority;
          assigned_to: AssignedTo;
          created_by: string;
          is_completed: boolean;
          parent_id: string | null;
          section: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: Priority;
          assigned_to?: AssignedTo;
          created_by: string;
          is_completed?: boolean;
          parent_id?: string | null;
          section?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: Priority;
          assigned_to?: AssignedTo;
          created_by?: string;
          is_completed?: boolean;
          parent_id?: string | null;
          section?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
      };
      google_calendar_tokens: {
        Row: {
          id: string;
          user_id: string;
          google_email: string;
          refresh_token: string;
          access_token: string | null;
          token_expiry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          google_email: string;
          refresh_token: string;
          access_token?: string | null;
          token_expiry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          google_email?: string;
          refresh_token?: string;
          access_token?: string | null;
          token_expiry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      google_calendar_selections: {
        Row: {
          id: string;
          user_id: string;
          calendar_id: string;
          calendar_name: string;
          show_in_family_view: boolean;
          is_work_calendar: boolean;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calendar_id: string;
          calendar_name: string;
          show_in_family_view?: boolean;
          is_work_calendar?: boolean;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calendar_id?: string;
          calendar_name?: string;
          show_in_family_view?: boolean;
          is_work_calendar?: boolean;
          color?: string | null;
          created_at?: string;
        };
      };
      family_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          all_day: boolean;
          created_by: string;
          gcal_event_ids: Record<string, string>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_at: string;
          end_at: string;
          all_day?: boolean;
          created_by: string;
          gcal_event_ids?: Record<string, string>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_at?: string;
          end_at?: string;
          all_day?: boolean;
          created_by?: string;
          gcal_event_ids?: Record<string, string>;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      priority: Priority;
      assigned_to: AssignedTo;
    };
  };
}

export type Todo = Database["public"]["Tables"]["todos"]["Row"];
export type TodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
export type TodoUpdate = Database["public"]["Tables"]["todos"]["Update"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type GoogleCalendarToken = Database["public"]["Tables"]["google_calendar_tokens"]["Row"];
export type GoogleCalendarSelection = Database["public"]["Tables"]["google_calendar_selections"]["Row"];
export type FamilyEvent = Database["public"]["Tables"]["family_events"]["Row"];
export type FamilyEventInsert = Database["public"]["Tables"]["family_events"]["Insert"];
