export interface Template {
  id: string;
  name_zh: string;
  name_en: string;
  description_zh: string;
  description_en: string;
  category_id: string;
  prompt_content: string;
  created_at: string;
  versions?: TemplateVersion[];
  project?: {
    id: string;
    name: string;
    description: string;
  };
  content?: string;
  currentProject?: {
    id: string;
    name: string;
    description: string;
  };
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  project_id?: string;
  input_content: string;
  output_content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
  version_number: number;
  template?: {
    id: string;
    name_zh: string;
    name_en: string;
    category?: {
      id: string;
      name_zh: string;
      name_en: string;
    };
  };
}

export interface CodeProps {
  inline: boolean;
  className: string;
  children: React.ReactNode;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_default?: boolean;
  is_open_source?: boolean;
  model_locked?: boolean;
  name_zh?: string;
  name_en?: string;
  description_zh?: string;
  description_en?: string;
  source_language?: string;
  company_info?: string;
  funding_info?: string;
  company_website?: string;
  funding_amount?: string;
  funding_round?: string;
  funding_date?: string;
  investors?: string[];
  company_location?: string;
  industry_tags?: string[];
  employee_count?: string;
  founding_date?: string;
  source_url?: string;
  source_name?: string;
  source_title?: string;
  source_date?: string;
  processed_at?: string;
  metadata?: any;
  primary_category?: string;
  secondary_category?: string;
  category_path?: string;
  official_website?: string;
} 