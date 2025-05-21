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
} 