export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      billing_records: {
        Row: {
          created_at: string | null
          gp_gbp: number
          id: string
          month: number
          np_gbp: number
          revenue_gbp: number
          updated_at: string | null
          upload_id: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          gp_gbp?: number
          id?: string
          month: number
          np_gbp?: number
          revenue_gbp?: number
          updated_at?: string | null
          upload_id?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          gp_gbp?: number
          id?: string
          month?: number
          np_gbp?: number
          revenue_gbp?: number
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "billing_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_targets: {
        Row: {
          created_at: string
          id: string
          set_by_user_id: string
          target_gp: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          set_by_user_id: string
          target_gp: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          set_by_user_id?: string
          target_gp?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      billing_uploads: {
        Row: {
          correction_reason: string | null
          created_at: string
          file_data: Json
          file_name: string
          id: string
          is_correction: boolean
          month: number
          replaced_upload_id: string | null
          uploaded_at: string
          uploaded_by_user_id: string
          year: number
        }
        Insert: {
          correction_reason?: string | null
          created_at?: string
          file_data: Json
          file_name: string
          id?: string
          is_correction?: boolean
          month: number
          replaced_upload_id?: string | null
          uploaded_at?: string
          uploaded_by_user_id: string
          year: number
        }
        Update: {
          correction_reason?: string | null
          created_at?: string
          file_data?: Json
          file_name?: string
          id?: string
          is_correction?: boolean
          month?: number
          replaced_upload_id?: string | null
          uploaded_at?: string
          uploaded_by_user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_uploads_replaced_upload_id_fkey"
            columns: ["replaced_upload_id"]
            isOneToOne: false
            referencedRelation: "billing_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          approved_by_user_id: string | null
          bd_percent: number | null
          bd_user_id: string | null
          client: string
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          deal_type: Database["public"]["Enums"]["deal_type"]
          dt_percent: number | null
          dt_user_id: string | null
          duration_days: number | null
          gp_daily: number | null
          id: string
          is_renewal: boolean | null
          location: string
          percent_360: number | null
          placement_id: string | null
          reason_for_backdate: string | null
          renewal_count: number | null
          revision_comment: string | null
          service_description: string | null
          service_name: string | null
          status: Database["public"]["Enums"]["deal_status"] | null
          submitted_by_user_id: string
          submitted_month: number | null
          submitted_year: number | null
          updated_at: string | null
          user_360_id: string | null
          value_converted_gbp: number | null
          value_original_currency: number
          void_reason: string | null
          voided_by_user_id: string | null
          worker_name: string | null
        }
        Insert: {
          approved_by_user_id?: string | null
          bd_percent?: number | null
          bd_user_id?: string | null
          client: string
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          deal_type: Database["public"]["Enums"]["deal_type"]
          dt_percent?: number | null
          dt_user_id?: string | null
          duration_days?: number | null
          gp_daily?: number | null
          id?: string
          is_renewal?: boolean | null
          location: string
          percent_360?: number | null
          placement_id?: string | null
          reason_for_backdate?: string | null
          renewal_count?: number | null
          revision_comment?: string | null
          service_description?: string | null
          service_name?: string | null
          status?: Database["public"]["Enums"]["deal_status"] | null
          submitted_by_user_id: string
          submitted_month?: number | null
          submitted_year?: number | null
          updated_at?: string | null
          user_360_id?: string | null
          value_converted_gbp?: number | null
          value_original_currency: number
          void_reason?: string | null
          voided_by_user_id?: string | null
          worker_name?: string | null
        }
        Update: {
          approved_by_user_id?: string | null
          bd_percent?: number | null
          bd_user_id?: string | null
          client?: string
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          deal_type?: Database["public"]["Enums"]["deal_type"]
          dt_percent?: number | null
          dt_user_id?: string | null
          duration_days?: number | null
          gp_daily?: number | null
          id?: string
          is_renewal?: boolean | null
          location?: string
          percent_360?: number | null
          placement_id?: string | null
          reason_for_backdate?: string | null
          renewal_count?: number | null
          revision_comment?: string | null
          service_description?: string | null
          service_name?: string | null
          status?: Database["public"]["Enums"]["deal_status"] | null
          submitted_by_user_id?: string
          submitted_month?: number | null
          submitted_year?: number | null
          updated_at?: string | null
          user_360_id?: string | null
          value_converted_gbp?: number | null
          value_original_currency?: number
          void_reason?: string | null
          voided_by_user_id?: string | null
          worker_name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string
          role_type: Database["public"]["Enums"]["role_type"]
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          id: string
          name: string
          role_type: Database["public"]["Enums"]["role_type"]
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role_type?: Database["public"]["Enums"]["role_type"]
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          team_name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          team_name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          team_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      currency_type: "GBP" | "USD" | "EUR" | "SAR" | "AED"
      deal_status:
        | "Draft"
        | "Submitted"
        | "Under Review"
        | "Approved"
        | "Rejected"
        | "Revision Required"
        | "Voided"
      deal_type: "Staff" | "Contract" | "Service"
      role_type: "BD" | "DT" | "360" | "Manager" | "CEO" | "Admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency_type: ["GBP", "USD", "EUR", "SAR", "AED"],
      deal_status: [
        "Draft",
        "Submitted",
        "Under Review",
        "Approved",
        "Rejected",
        "Revision Required",
        "Voided",
      ],
      deal_type: ["Staff", "Contract", "Service"],
      role_type: ["BD", "DT", "360", "Manager", "CEO", "Admin"],
    },
  },
} as const
