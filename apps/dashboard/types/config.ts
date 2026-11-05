import type { Json } from '@ut-dining/supabase';

export interface AppConfig {
  title: string;
  description: string;
}

export interface Contributor {
  id: string;
  name: string;
  order: number;
  [key: string]: Json | undefined;
}

export interface CreditsConfig {
  contributors: Contributor[];
}

export interface HelpSupportLink {
  id: string;
  label: string;
  url: string;
  order: number;
  [key: string]: Json | undefined;
}

export interface HelpSupportConfig {
  links: HelpSupportLink[];
}
