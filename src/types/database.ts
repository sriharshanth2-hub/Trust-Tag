export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'candidate' | 'company' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'candidate' | 'company' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'candidate' | 'company' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string
          company_name: string
          business_email: string
          business_id: string
          is_verified_business: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          business_email: string
          business_id: string
          is_verified_business?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          business_email?: string
          business_id?: string
          is_verified_business?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          candidate_id: string
          company_id: string
          document_type: 'offer_letter' | 'experience_letter'
          file_url: string
          file_hash: string
          file_name: string
          status: 'pending' | 'verified' | 'rejected'
          qr_code_id: string
          verified_at: string | null
          verified_by: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          company_id: string
          document_type: 'offer_letter' | 'experience_letter'
          file_url: string
          file_hash: string
          file_name: string
          status?: 'pending' | 'verified' | 'rejected'
          qr_code_id: string
          verified_at?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          company_id?: string
          document_type?: 'offer_letter' | 'experience_letter'
          file_url?: string
          file_hash?: string
          file_name?: string
          status?: 'pending' | 'verified' | 'rejected'
          qr_code_id?: string
          verified_at?: string | null
          verified_by?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
