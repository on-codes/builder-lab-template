// Hand-written to match supabase/migrations/** exactly, because this build environment has
// no live Supabase project to generate against (see openspec/changes/add-auth-foundation/
// design.md — "no MCP access to a live Supabase/Vercel project"). The very first thing to do
// once a real project is connected: regenerate this file for real and diff it against this
// version —
//
//   pnpm exec supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
//
// — then delete this comment block. Until then, every column here must stay in sync by hand
// with every migration that touches these tables.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          mfa_enabled: boolean;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          mfa_enabled?: boolean;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          mfa_enabled?: boolean;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mfa_otp_codes: {
        Row: {
          id: string;
          user_id: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          max_attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          expires_at: string;
          attempts?: number;
          max_attempts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code_hash?: string;
          expires_at?: string;
          attempts?: number;
          max_attempts?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          user_agent: string | null;
          created_at: string;
          last_seen_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_agent?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_agent?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          key: string;
          count: number;
          window_start: string;
        };
        Insert: {
          key: string;
          count?: number;
          window_start?: string;
        };
        Update: {
          key?: string;
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_rate_limit: {
        Args: { p_key: string; p_window_seconds: number };
        Returns: { count: number }[];
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
    };
    Enums: {
      user_role: "owner" | "admin" | "member";
    };
    CompositeTypes: Record<string, never>;
  };
};
