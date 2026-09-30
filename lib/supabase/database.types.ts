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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          analysis_json: Json
          confidence_score: number
          created_at: string
          failure_id: string
          id: string
          root_cause: string
          suggested_fix: string
        }
        Insert: {
          analysis_json?: Json
          confidence_score?: number
          created_at?: string
          failure_id: string
          id?: string
          root_cause: string
          suggested_fix: string
        }
        Update: {
          analysis_json?: Json
          confidence_score?: number
          created_at?: string
          failure_id?: string
          id?: string
          root_cause?: string
          suggested_fix?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_failure_id_fkey"
            columns: ["failure_id"]
            isOneToOne: false
            referencedRelation: "failures"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_repairs: {
        Row: {
          ai_analysis_id: string | null
          created_at: string
          diff_content: string
          explanation: string
          failure_id: string
          id: string
          pull_request_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis_id?: string | null
          created_at?: string
          diff_content: string
          explanation: string
          failure_id: string
          id?: string
          pull_request_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis_id?: string | null
          created_at?: string
          diff_content?: string
          explanation?: string
          failure_id?: string
          id?: string
          pull_request_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_repairs_ai_analysis_id_fkey"
            columns: ["ai_analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_repairs_failure_id_fkey"
            columns: ["failure_id"]
            isOneToOne: false
            referencedRelation: "failures"
            referencedColumns: ["id"]
          },
        ]
      }
      failures: {
        Row: {
          component_affected: string | null
          detected_at: string
          error_message: string
          error_type: string
          id: string
          repository_id: string
          resolved_at: string | null
          severity: string
          stack_trace: string | null
          status: string
          test_result_id: string | null
          title: string
        }
        Insert: {
          component_affected?: string | null
          detected_at?: string
          error_message: string
          error_type: string
          id?: string
          repository_id: string
          resolved_at?: string | null
          severity?: string
          stack_trace?: string | null
          status?: string
          test_result_id?: string | null
          title: string
        }
        Update: {
          component_affected?: string | null
          detected_at?: string
          error_message?: string
          error_type?: string
          id?: string
          repository_id?: string
          resolved_at?: string | null
          severity?: string
          stack_trace?: string | null
          status?: string
          test_result_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "failures_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "failures_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pull_requests: {
        Row: {
          ai_repair_id: string | null
          branch_name: string
          created_at: string
          id: string
          pr_number: number
          repository_id: string
          status: string
          title: string
          url: string
        }
        Insert: {
          ai_repair_id?: string | null
          branch_name: string
          created_at?: string
          id?: string
          pr_number: number
          repository_id: string
          status?: string
          title: string
          url: string
        }
        Update: {
          ai_repair_id?: string | null
          branch_name?: string
          created_at?: string
          id?: string
          pr_number?: number
          repository_id?: string
          status?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pull_requests_ai_repair_id_fkey"
            columns: ["ai_repair_id"]
            isOneToOne: false
            referencedRelation: "ai_repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pull_requests_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          data_json: Json
          generated_at: string
          id: string
          pass_rate_percent: number
          repairs_applied: number
          repository_id: string
          summary: string
          title: string
          total_failures: number
          total_runs: number
          type: string
        }
        Insert: {
          data_json?: Json
          generated_at?: string
          id?: string
          pass_rate_percent?: number
          repairs_applied?: number
          repository_id: string
          summary: string
          title: string
          total_failures?: number
          total_runs?: number
          type?: string
        }
        Update: {
          data_json?: Json
          generated_at?: string
          id?: string
          pass_rate_percent?: number
          repairs_applied?: number
          repository_id?: string
          summary?: string
          title?: string
          total_failures?: number
          total_runs?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      repositories: {
        Row: {
          created_at: string
          default_branch: string
          description: string | null
          failing_count: number
          framework: string
          full_name: string
          health_score: number
          id: string
          is_private: boolean
          language: string
          last_run_at: string | null
          name: string
          passing_count: number
          status: string
          target_url: string | null
          test_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_branch?: string
          description?: string | null
          failing_count?: number
          framework?: string
          full_name: string
          health_score?: number
          id?: string
          is_private?: boolean
          language?: string
          last_run_at?: string | null
          name: string
          passing_count?: number
          status?: string
          target_url?: string | null
          test_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_branch?: string
          description?: string | null
          failing_count?: number
          framework?: string
          full_name?: string
          health_score?: number
          id?: string
          is_private?: boolean
          language?: string
          last_run_at?: string | null
          name?: string
          passing_count?: number
          status?: string
          target_url?: string | null
          test_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repositories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repository_analysis: {
        Row: {
          analyzed_at: string
          api_routes_found: number
          components_analyzed: number
          e2e_coverage_percent: number
          id: string
          repository_id: string
          status: string
          summary: string | null
          tech_stack: Json
        }
        Insert: {
          analyzed_at?: string
          api_routes_found?: number
          components_analyzed?: number
          e2e_coverage_percent?: number
          id?: string
          repository_id: string
          status?: string
          summary?: string | null
          tech_stack?: Json
        }
        Update: {
          analyzed_at?: string
          api_routes_found?: number
          components_analyzed?: number
          e2e_coverage_percent?: number
          id?: string
          repository_id?: string
          status?: string
          summary?: string | null
          tech_stack?: Json
        }
        Relationships: [
          {
            foreignKeyName: "repository_analysis_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      test_artifacts: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number
          file_url: string
          id: string
          test_result_id: string
          type: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number
          file_url: string
          id?: string
          test_result_id: string
          type: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number
          file_url?: string
          id?: string
          test_result_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_artifacts_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_ms: number
          file_path: string
          id: string
          last_run_at: string | null
          repository_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_ms?: number
          file_path: string
          id?: string
          last_run_at?: string | null
          repository_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_ms?: number
          file_path?: string
          id?: string
          last_run_at?: string | null
          repository_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          duration_ms: number
          error_message: string | null
          error_stack: string | null
          file_path: string
          id: string
          status: string
          test_case_id: string | null
          test_run_id: string
          title: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          error_stack?: string | null
          file_path: string
          id?: string
          status?: string
          test_case_id?: string | null
          test_run_id: string
          title: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          error_stack?: string | null
          file_path?: string
          id?: string
          status?: string
          test_case_id?: string | null
          test_run_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          branch: string
          commit_sha: string | null
          completed_at: string | null
          delivery_id: string | null
          duration_seconds: number
          failed_tests: number
          id: string
          passed_tests: number
          repository_id: string
          skipped_tests: number
          started_at: string
          status: string
          total_tests: number
          trigger_type: string
        }
        Insert: {
          branch?: string
          commit_sha?: string | null
          completed_at?: string | null
          delivery_id?: string | null
          duration_seconds?: number
          failed_tests?: number
          id?: string
          passed_tests?: number
          repository_id: string
          skipped_tests?: number
          started_at?: string
          status?: string
          total_tests?: number
          trigger_type?: string
        }
        Update: {
          branch?: string
          commit_sha?: string | null
          completed_at?: string | null
          delivery_id?: string | null
          duration_seconds?: number
          failed_tests?: number
          id?: string
          passed_tests?: number
          repository_id?: string
          skipped_tests?: number
          started_at?: string
          status?: string
          total_tests?: number
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
