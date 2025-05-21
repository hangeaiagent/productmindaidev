export interface Database {
  public: {
    Tables: {
      template_versions: {
        Row: {
          id: string;
          template_id: string;
          input_content: string;
          output_content: string;
          created_at: string;
          created_by: string | null;
          is_active: boolean;
          version_number: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          input_content: string;
          output_content: string;
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
          version_number?: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          input_content?: string;
          output_content?: string;
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
          version_number?: number;
        };
      };
      template_categories: {
        Row: {
          id: string;
          parent_id: string | null;
          name_en: string;
          name_zh: string;
          description_en: string | null;
          description_zh: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          parent_id?: string | null;
          name_en: string;
          name_zh: string;
          description_en?: string | null;
          description_zh?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          parent_id?: string | null;
          name_en?: string;
          name_zh?: string;
          description_en?: string | null;
          description_zh?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      templates: {
        Row: {
          id: string;
          category_id: string;
          name_en: string;
          name_zh: string;
          description_en: string | null;
          description_zh: string | null;
          prompt_content: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          name_en: string;
          name_zh: string;
          description_en?: string | null;
          description_zh?: string | null;
          prompt_content: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string;
          name_en?: string;
          name_zh?: string;
          description_en?: string | null;
          description_zh?: string | null;
          prompt_content?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}