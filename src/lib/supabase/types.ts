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
