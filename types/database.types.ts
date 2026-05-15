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
      booking_items: {
        Row: {
          booking_id: string
          id: string
          item_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          id?: string
          item_id: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          id?: string
          item_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          address_lat: number | null
          address_lng: number | null
          booking_date: string
          booking_number: string | null
          booking_time: string | null
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          id: string
          location_type: Database["public"]["Enums"]["location_type"]
          manicurist_id: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_mode: Database["public"]["Enums"]["service_mode"] | null
          source: Database["public"]["Enums"]["record_source"] | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          booking_date: string
          booking_number?: string | null
          booking_time?: string | null
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          manicurist_id?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          source?: Database["public"]["Enums"]["record_source"] | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          booking_date?: string
          booking_number?: string | null
          booking_time?: string | null
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          manicurist_id?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          source?: Database["public"]["Enums"]["record_source"] | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_manicurist_id_fkey"
            columns: ["manicurist_id"]
            isOneToOne: false
            referencedRelation: "manicurists"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          first_visit: string | null
          full_name: string
          id: string
          is_student: boolean | null
          last_visit: string | null
          notes: string | null
          phone: string | null
          points_balance: number | null
          profile_id: string | null
          source: Database["public"]["Enums"]["record_source"] | null
          total_spent: number | null
          total_visits: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_visit?: string | null
          full_name: string
          id?: string
          is_student?: boolean | null
          last_visit?: string | null
          notes?: string | null
          phone?: string | null
          points_balance?: number | null
          profile_id?: string | null
          source?: Database["public"]["Enums"]["record_source"] | null
          total_spent?: number | null
          total_visits?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_visit?: string | null
          full_name?: string
          id?: string
          is_student?: boolean | null
          last_visit?: string | null
          notes?: string | null
          phone?: string | null
          points_balance?: number | null
          profile_id?: string | null
          source?: Database["public"]["Enums"]["record_source"] | null
          total_spent?: number | null
          total_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          cost: number | null
          created_at: string | null
          description: string | null
          duration_min: number | null
          id: string
          is_active: boolean | null
          margin: number | null
          name: string
          photo_url: string | null
          photo_urls: string[]
          price: number
          service_mode: Database["public"]["Enums"]["service_mode"]
          stock: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          cost?: number | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          margin?: number | null
          name: string
          photo_url?: string | null
          photo_urls?: string[]
          price: number
          service_mode?: Database["public"]["Enums"]["service_mode"]
          stock?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          cost?: number | null
          created_at?: string | null
          description?: string | null
          duration_min?: number | null
          id?: string
          is_active?: boolean | null
          margin?: number | null
          name?: string
          photo_url?: string | null
          photo_urls?: string[]
          price?: number
          service_mode?: Database["public"]["Enums"]["service_mode"]
          stock?: number | null
        }
        Relationships: []
      }
      manicurist_availability: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_booked: boolean | null
          manicurist_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_booked?: boolean | null
          manicurist_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          is_booked?: boolean | null
          manicurist_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "manicurist_availability_manicurist_id_fkey"
            columns: ["manicurist_id"]
            isOneToOne: false
            referencedRelation: "manicurists"
            referencedColumns: ["id"]
          },
        ]
      }
      manicurist_date_overrides: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          is_closed: boolean
          manicurist_id: string
          note: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          manicurist_id: string
          note?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          manicurist_id?: string
          note?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manicurist_date_overrides_manicurist_id_fkey"
            columns: ["manicurist_id"]
            isOneToOne: false
            referencedRelation: "manicurists"
            referencedColumns: ["id"]
          },
        ]
      }
      manicurist_weekly_schedule: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_closed: boolean
          manicurist_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_closed?: boolean
          manicurist_id: string
          start_time: string
          weekday: number
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_closed?: boolean
          manicurist_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "manicurist_weekly_schedule_manicurist_id_fkey"
            columns: ["manicurist_id"]
            isOneToOne: false
            referencedRelation: "manicurists"
            referencedColumns: ["id"]
          },
        ]
      }
      manicurists: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          photo_url: string | null
          profile_id: string
          rating: number | null
          specialties: string[] | null
          total_jobs: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          profile_id: string
          rating?: number | null
          specialties?: string[] | null
          total_jobs?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          profile_id?: string
          rating?: number | null
          specialties?: string[] | null
          total_jobs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manicurists_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_student: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_student?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_student?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string | null
          discount_pct: number | null
          free_item_id: string | null
          id: string
          is_active: boolean | null
          min_bookings: number | null
          type: Database["public"]["Enums"]["promotion_type"]
          valid_until: string | null
        }
        Insert: {
          code?: string | null
          discount_pct?: number | null
          free_item_id?: string | null
          id?: string
          is_active?: boolean | null
          min_bookings?: number | null
          type: Database["public"]["Enums"]["promotion_type"]
          valid_until?: string | null
        }
        Update: {
          code?: string | null
          discount_pct?: number | null
          free_item_id?: string | null
          id?: string
          is_active?: boolean | null
          min_bookings?: number | null
          type?: Database["public"]["Enums"]["promotion_type"]
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_free_item_id_fkey"
            columns: ["free_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          booking_id: string | null
          cost_of_goods: number | null
          created_at: string | null
          date: string
          discounts: number | null
          gross_profit: number | null
          gross_sales: number
          id: string
          net_sales: number | null
          refunds: number | null
          source: Database["public"]["Enums"]["record_source"] | null
        }
        Insert: {
          booking_id?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          date: string
          discounts?: number | null
          gross_profit?: number | null
          gross_sales?: number
          id?: string
          net_sales?: number | null
          refunds?: number | null
          source?: Database["public"]["Enums"]["record_source"] | null
        }
        Update: {
          booking_id?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          date?: string
          discounts?: number | null
          gross_profit?: number | null
          gross_sales?: number
          id?: string
          net_sales?: number | null
          refunds?: number | null
          source?: Database["public"]["Enums"]["record_source"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          address: string
          created_at: string | null
          customer_id: string
          id: string
          label: string
          lat: number
          lng: number
        }
        Insert: {
          address: string
          created_at?: string | null
          customer_id: string
          id?: string
          label: string
          lat: number
          lng: number
        }
        Update: {
          address?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          label?: string
          lat?: number
          lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_manicurist: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      discount_type: "student" | "loyalty" | "none"
      item_category: "package" | "addon"
      location_type: "home" | "booth" | "other"
      payment_status: "unpaid" | "paid" | "refunded"
      promotion_type: "student" | "loyalty" | "seasonal"
      record_source: "system" | "manual"
      service_mode: "mobile" | "walkin" | "both"
      user_role: "customer" | "manicurist"
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
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      discount_type: ["student", "loyalty", "none"],
      item_category: ["package", "addon"],
      location_type: ["home", "booth", "other"],
      payment_status: ["unpaid", "paid", "refunded"],
      promotion_type: ["student", "loyalty", "seasonal"],
      record_source: ["system", "manual"],
      service_mode: ["mobile", "walkin", "both"],
      user_role: ["customer", "manicurist"],
    },
  },
} as const
