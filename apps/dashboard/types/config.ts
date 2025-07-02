export interface AppConfig {
  title: string;
  description: string;
}

export interface Contributor {
  id: string;
  name: string;
  order: number;
  [key: string]: any; // Index signature for JSON serialization
}

export interface CreditsConfig {
  contributors: Contributor[];
}

export interface HelpSupportLink {
  id: string;
  label: string;
  url: string;
  order: number;
  [key: string]: any; // Index signature for JSON serialization
}

export interface HelpSupportConfig {
  links: HelpSupportLink[];
} 