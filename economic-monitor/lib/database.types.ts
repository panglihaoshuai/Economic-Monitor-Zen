export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          deepseek_api_key_encrypted: string | null;
          language: 'en' | 'zh';
          risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          image?: string | null;
          deepseek_api_key_encrypted?: string | null;
          language?: 'en' | 'zh';
          risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          deepseek_api_key_encrypted?: string | null;
          language?: 'en' | 'zh';
          risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_indicators: {
        Row: {
          id: string;
          user_id: string;
          series_id: string;
          enabled: boolean;
          z_threshold_warning: number;
          z_threshold_critical: number;
          analysis_mode: string;
          notify_frequency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          series_id: string;
          enabled?: boolean;
          z_threshold_warning?: number;
          z_threshold_critical?: number;
          analysis_mode?: string;
          notify_frequency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          series_id?: string;
          enabled?: boolean;
          z_threshold_warning?: number;
          z_threshold_critical?: number;
          analysis_mode?: string;
          notify_frequency?: string;
          created_at?: string;
        };
      };
      economic_data: {
        Row: {
          id: string;
          series_id: string;
          date: string;
          value: number;
          vintage_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          series_id: string;
          date: string;
          value: number;
          vintage_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          series_id?: string;
          date?: string;
          value?: number;
          vintage_date?: string | null;
          created_at?: string;
        };
      };
      anomalies: {
        Row: {
          id: string;
          user_id: string;
          series_id: string;
          date: string;
          value: number;
          z_score: number;
          severity: string;
          analysis_simple: string | null;
          analysis_deep: string | null;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          series_id: string;
          date: string;
          value: number;
          z_score: number;
          severity: string;
          analysis_simple?: string | null;
          analysis_deep?: string | null;
          notified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          series_id?: string;
          date?: string;
          value?: number;
          z_score?: number;
          severity?: string;
          analysis_simple?: string | null;
          analysis_deep?: string | null;
          notified?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
