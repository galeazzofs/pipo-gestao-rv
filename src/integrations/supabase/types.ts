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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      apuracao_itens: {
        Row: {
          apuracao_id: string
          cliente_mae: string
          comissao: number | null
          contract_id: string | null
          created_at: string | null
          id: string
          mes_recebimento: string
          mes_vigencia: number | null
          nf_liquido: number
          nome_ev: string | null
          operadora: string
          produto: string
          status: string
          taxa: number | null
        }
        Insert: {
          apuracao_id: string
          cliente_mae: string
          comissao?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          mes_recebimento: string
          mes_vigencia?: number | null
          nf_liquido: number
          nome_ev?: string | null
          operadora: string
          produto: string
          status: string
          taxa?: number | null
        }
        Update: {
          apuracao_id?: string
          cliente_mae?: string
          comissao?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          mes_recebimento?: string
          mes_vigencia?: number | null
          nf_liquido?: number
          nome_ev?: string | null
          operadora?: string
          produto?: string
          status?: string
          taxa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apuracao_itens_apuracao_id_fkey"
            columns: ["apuracao_id"]
            isOneToOne: false
            referencedRelation: "apuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apuracao_itens_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ev_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      apuracoes: {
        Row: {
          count_expirados: number
          count_nao_encontrados: number
          count_pre_vigencia: number
          count_validos: number
          created_at: string | null
          created_by: string | null
          data_processamento: string | null
          id: string
          mes_referencia: string
          nome: string
          total_comissao_valida: number
          total_expirado: number
          total_nao_encontrado: number
          total_processado: number
        }
        Insert: {
          count_expirados?: number
          count_nao_encontrados?: number
          count_pre_vigencia?: number
          count_validos?: number
          created_at?: string | null
          created_by?: string | null
          data_processamento?: string | null
          id?: string
          mes_referencia: string
          nome: string
          total_comissao_valida?: number
          total_expirado?: number
          total_nao_encontrado?: number
          total_processado?: number
        }
        Update: {
          count_expirados?: number
          count_nao_encontrados?: number
          count_pre_vigencia?: number
          count_validos?: number
          created_at?: string | null
          created_by?: string | null
          data_processamento?: string | null
          id?: string
          mes_referencia?: string
          nome?: string
          total_comissao_valida?: number
          total_expirado?: number
          total_nao_encontrado?: number
          total_processado?: number
        }
        Relationships: []
      }
      ev_contracts: {
        Row: {
          atingimento: number
          cliente: string
          created_at: string | null
          created_by: string | null
          data_inicio: string
          id: string
          nome_ev: string
          operadora: string
          porte: string
          produto: string
          updated_at: string | null
        }
        Insert: {
          atingimento?: number
          cliente: string
          created_at?: string | null
          created_by?: string | null
          data_inicio: string
          id?: string
          nome_ev: string
          operadora: string
          porte: string
          produto: string
          updated_at?: string | null
        }
        Update: {
          atingimento?: number
          cliente?: string
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string
          id?: string
          nome_ev?: string
          operadora?: string
          porte?: string
          produto?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nivel: Database["public"]["Enums"]["cn_level"]
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nivel?: Database["public"]["Enums"]["cn_level"]
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nivel?: Database["public"]["Enums"]["cn_level"]
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cn"
      cn_level: "CN1" | "CN2" | "CN3"
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
      app_role: ["admin", "cn"],
      cn_level: ["CN1", "CN2", "CN3"],
    },
  },
} as const
