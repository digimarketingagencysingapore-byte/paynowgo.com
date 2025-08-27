export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          password_hash: string;
          role: Database["public"]["Enums"]["admin_role"] | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          password_hash: string;
          role?: Database["public"]["Enums"]["admin_role"] | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          password_hash?: string;
          role?: Database["public"]["Enums"]["admin_role"] | null;
        };
        Relationships: [];
      };
      confirm_config: {
        Row: {
          amount_tolerance: number | null;
          amt_regex: string | null;
          android_pkg_whitelist: string[] | null;
          bankref_regex: string | null;
          created_at: string | null;
          event_hard_ttl_secs: number | null;
          payer_regex: string | null;
          ref_regex: string | null;
          tenant_id: string;
          updated_at: string | null;
        };
        Insert: {
          amount_tolerance?: number | null;
          amt_regex?: string | null;
          android_pkg_whitelist?: string[] | null;
          bankref_regex?: string | null;
          created_at?: string | null;
          event_hard_ttl_secs?: number | null;
          payer_regex?: string | null;
          ref_regex?: string | null;
          tenant_id: string;
          updated_at?: string | null;
        };
        Update: {
          amount_tolerance?: number | null;
          amt_regex?: string | null;
          android_pkg_whitelist?: string[] | null;
          bankref_regex?: string | null;
          created_at?: string | null;
          event_hard_ttl_secs?: number | null;
          payer_regex?: string | null;
          ref_regex?: string | null;
          tenant_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customer_displays: {
        Row: {
          created_at: string | null;
          device_key: string;
          id: string;
          last_seen_at: string | null;
          name: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_key: string;
          id?: string;
          last_seen_at?: string | null;
          name?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string | null;
          device_key?: string;
          id?: string;
          last_seen_at?: string | null;
          name?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_displays_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      device_health: {
        Row: {
          created_at: string | null;
          device_id: string;
          error_count: number | null;
          last_event_at: string | null;
          last_heartbeat_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          device_id: string;
          error_count?: number | null;
          last_event_at?: string | null;
          last_heartbeat_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          device_id?: string;
          error_count?: number | null;
          last_event_at?: string | null;
          last_heartbeat_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "device_health_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: true;
            referencedRelation: "devices";
            referencedColumns: ["id"];
          }
        ];
      };
      devices: {
        Row: {
          created_at: string | null;
          device_key: string;
          device_name: string;
          id: string;
          last_seen_at: string | null;
          merchant_id: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string | null;
          device_key: string;
          device_name: string;
          id?: string;
          last_seen_at?: string | null;
          merchant_id?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string | null;
          device_key?: string;
          device_name?: string;
          id?: string;
          last_seen_at?: string | null;
          merchant_id?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devices_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          }
        ];
      };
      display_events: {
        Row: {
          created_at: string | null;
          event_type: string;
          expires_at: string | null;
          id: string;
          order_id: string | null;
          qr_data: Json | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string | null;
          event_type: string;
          expires_at?: string | null;
          id?: string;
          order_id?: string | null;
          qr_data?: Json | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string | null;
          event_type?: string;
          expires_at?: string | null;
          id?: string;
          order_id?: string | null;
          qr_data?: Json | null;
          tenant_id?: string;
        };
        Relationships: [];
      };
      display_states: {
        Row: {
          amount: number | null;
          device_id: string;
          expires_at: string | null;
          order_id: string | null;
          qr_svg: string | null;
          reference: string | null;
          state: string;
          tenant_id: string;
          updated_at: string | null;
        };
        Insert: {
          amount?: number | null;
          device_id: string;
          expires_at?: string | null;
          order_id?: string | null;
          qr_svg?: string | null;
          reference?: string | null;
          state?: string;
          tenant_id: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number | null;
          device_id?: string;
          expires_at?: string | null;
          order_id?: string | null;
          qr_svg?: string | null;
          reference?: string | null;
          state?: string;
          tenant_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "display_states_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: true;
            referencedRelation: "customer_displays";
            referencedColumns: ["id"];
          }
        ];
      };
      merchant_sessions: {
        Row: {
          created_at: string | null;
          expires_at: string;
          id: string;
          merchant_id: string;
          token: string;
        };
        Insert: {
          created_at?: string | null;
          expires_at: string;
          id?: string;
          merchant_id: string;
          token: string;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          merchant_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "merchant_sessions_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          }
        ];
      };
      merchants: {
        Row: {
          address: string | null;
          business_name: string;
          created_at: string | null;
          email: string;
          id: string;
          mobile: string | null;
          monthly_revenue: number | null;
          password_hash: string;
          payment_method: string | null;
          profile_id: string | null;
          settings: Json | null;
          status: Database["public"]["Enums"]["merchant_status"] | null;
          subscription_expires_at: string | null;
          subscription_link: string | null;
          subscription_plan: string | null;
          subscription_starts_at: string | null;
          uen: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          business_name: string;
          created_at?: string | null;
          email: string;
          id?: string;
          mobile?: string | null;
          monthly_revenue?: number | null;
          password_hash: string;
          payment_method?: string | null;
          profile_id?: string | null;
          settings?: Json | null;
          status?: Database["public"]["Enums"]["merchant_status"] | null;
          subscription_expires_at?: string | null;
          subscription_link?: string | null;
          subscription_plan?: string | null;
          subscription_starts_at?: string | null;
          uen?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          business_name?: string;
          created_at?: string | null;
          email?: string;
          id?: string;
          mobile?: string | null;
          monthly_revenue?: number | null;
          password_hash?: string;
          payment_method?: string | null;
          profile_id?: string | null;
          settings?: Json | null;
          status?: Database["public"]["Enums"]["merchant_status"] | null;
          subscription_expires_at?: string | null;
          subscription_link?: string | null;
          subscription_plan?: string | null;
          subscription_starts_at?: string | null;
          uen?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      order_items_backup_20250825: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string | null;
          line_total_cents: number;
          name: string;
          order_id: string;
          qty: number;
          unit_price_cents: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id?: string | null;
          line_total_cents: number;
          name: string;
          order_id: string;
          qty?: number;
          unit_price_cents: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string | null;
          line_total_cents?: number;
          name?: string;
          order_id?: string;
          qty?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_backup_20250827032010";
            referencedColumns: ["id"];
          }
        ];
      };
      orders_backup_20250827032010: {
        Row: {
          amount: number;
          amount_cents: number | null;
          canceled_at: string | null;
          created_at: string | null;
          currency: string | null;
          expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          merchant_id: string | null;
          meta: Json | null;
          paid_at: string | null;
          payload: string | null;
          qr_svg: string | null;
          qr_text: string | null;
          reference: string;
          status: Database["public"]["Enums"]["order_status"] | null;
          tenant_id: string;
          terminal_id: string | null;
        };
        Insert: {
          amount: number;
          amount_cents?: number | null;
          canceled_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          merchant_id?: string | null;
          meta?: Json | null;
          paid_at?: string | null;
          payload?: string | null;
          qr_svg?: string | null;
          qr_text?: string | null;
          reference: string;
          status?: Database["public"]["Enums"]["order_status"] | null;
          tenant_id: string;
          terminal_id?: string | null;
        };
        Update: {
          amount?: number;
          amount_cents?: number | null;
          canceled_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          merchant_id?: string | null;
          meta?: Json | null;
          paid_at?: string | null;
          payload?: string | null;
          qr_svg?: string | null;
          qr_text?: string | null;
          reference?: string;
          status?: Database["public"]["Enums"]["order_status"] | null;
          tenant_id?: string;
          terminal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_merchant_id_fkey";
            columns: ["merchant_id"];
            isOneToOne: false;
            referencedRelation: "merchants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_terminal_id_fkey";
            columns: ["terminal_id"];
            isOneToOne: false;
            referencedRelation: "terminals";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_events: {
        Row: {
          amount: number;
          bank_ref: string | null;
          correlates_order: string | null;
          created_at: string | null;
          handled: boolean;
          id: string;
          payer_name: string | null;
          raw: Json | null;
          received_at: string;
          reference: string;
          source: Database["public"]["Enums"]["payment_source"];
          tenant_id: string;
        };
        Insert: {
          amount: number;
          bank_ref?: string | null;
          correlates_order?: string | null;
          created_at?: string | null;
          handled?: boolean;
          id?: string;
          payer_name?: string | null;
          raw?: Json | null;
          received_at: string;
          reference: string;
          source: Database["public"]["Enums"]["payment_source"];
          tenant_id: string;
        };
        Update: {
          amount?: number;
          bank_ref?: string | null;
          correlates_order?: string | null;
          created_at?: string | null;
          handled?: boolean;
          id?: string;
          payer_name?: string | null;
          raw?: Json | null;
          received_at?: string;
          reference?: string;
          source?: Database["public"]["Enums"]["payment_source"];
          tenant_id?: string;
        };
        Relationships: [];
      };
      payments_backup_20250827032010: {
        Row: {
          bank_ref: string | null;
          created_at: string | null;
          id: string;
          order_id: string;
          payer_name: string | null;
          received_amount: number;
          received_at: string;
          source: Database["public"]["Enums"]["payment_source"];
          tenant_id: string;
        };
        Insert: {
          bank_ref?: string | null;
          created_at?: string | null;
          id?: string;
          order_id: string;
          payer_name?: string | null;
          received_amount: number;
          received_at: string;
          source: Database["public"]["Enums"]["payment_source"];
          tenant_id: string;
        };
        Update: {
          bank_ref?: string | null;
          created_at?: string | null;
          id?: string;
          order_id?: string;
          payer_name?: string | null;
          received_amount?: number;
          received_at?: string;
          source?: Database["public"]["Enums"]["payment_source"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders_backup_20250827032010";
            referencedColumns: ["id"];
          }
        ];
      };
      tenants: {
        Row: {
          business_name: string | null;
          created_at: string | null;
          id: string;
          mode: string | null;
          paynow_mobile: string | null;
          paynow_uen: string | null;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          business_name?: string | null;
          created_at?: string | null;
          id?: string;
          mode?: string | null;
          paynow_mobile?: string | null;
          paynow_uen?: string | null;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          business_name?: string | null;
          created_at?: string | null;
          id?: string;
          mode?: string | null;
          paynow_mobile?: string | null;
          paynow_uen?: string | null;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      terminals: {
        Row: {
          created_at: string | null;
          device_key: string;
          id: string;
          last_seen_at: string | null;
          name: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_key: string;
          id?: string;
          last_seen_at?: string | null;
          name: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string | null;
          device_key?: string;
          id?: string;
          last_seen_at?: string | null;
          name?: string;
          tenant_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      categories: {
        Row: {
          created_at: string | null;
          id: string | null;
          name: string | null;
          parent_id: string | null;
          position: number | null;
          tenant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          parent_id?: string | null;
          position?: number | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          name?: string | null;
          parent_id?: string | null;
          position?: number | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      cms_content: {
        Row: {
          active: boolean | null;
          content: Json | null;
          created_at: string | null;
          created_by: string | null;
          id: string | null;
          section: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          active?: boolean | null;
          content?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string | null;
          section?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          active?: boolean | null;
          content?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string | null;
          section?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      items: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          currency: string | null;
          id: string | null;
          name: string | null;
          price_cents: number | null;
          sku: string | null;
          tenant_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          name?: string | null;
          price_cents?: number | null;
          sku?: string | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string | null;
          name?: string | null;
          price_cents?: number | null;
          sku?: string | null;
          tenant_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          currency: string | null;
          item_id: string | null;
          line_no: number | null;
          name: string | null;
          order_id: string | null;
          qty: number | null;
          tenant_id: string | null;
          total_cents: number | null;
          unit_price_cents: number | null;
        };
        Insert: {
          currency?: string | null;
          item_id?: string | null;
          line_no?: number | null;
          name?: string | null;
          order_id?: string | null;
          qty?: number | null;
          tenant_id?: string | null;
          total_cents?: number | null;
          unit_price_cents?: number | null;
        };
        Update: {
          currency?: string | null;
          item_id?: string | null;
          line_no?: number | null;
          name?: string | null;
          order_id?: string | null;
          qty?: number | null;
          tenant_id?: string | null;
          total_cents?: number | null;
          unit_price_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      cleanup_expired_display_events: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      update_display_state: {
        Args: {
          p_amount?: number;
          p_device_id: string;
          p_expires_at?: string;
          p_order_id?: string;
          p_qr_svg?: string;
          p_reference?: string;
          p_state: string;
          p_tenant_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      admin_role: "super_admin" | "support";
      merchant_status: "active" | "suspended" | "pending";
      order_status: "pending" | "paid" | "canceled" | "expired";
      payment_source: "android" | "email";
      user_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["super_admin", "support"],
      merchant_status: ["active", "suspended", "pending"],
      order_status: ["pending", "paid", "canceled", "expired"],
      payment_source: ["android", "email"],
      user_role: ["admin", "user"],
    },
  },
} as const;

// Auth and Profile Types
export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user';
  created_at: string | null;
  updated_at: string | null;
}

export interface MerchantData {
  id: string;
  businessName: string;
  email: string;
  uen?: string | null;
  mobile?: string | null;
  address?: string | null;
  status: string;
  subscriptionPlan?: string | null;
  monthlyRevenue?: number | null;
  subscriptionLink?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: Profile;
  merchant?: MerchantData;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}
