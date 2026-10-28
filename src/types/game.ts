export interface Vector2D {
  x: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type GameState = 'title' | 'playing' | 'paused' | 'dialogue' | 'journal' | 'victory';

export interface DialogueOption {
  text: string;
  response: string;
  topicId?: string;
  externalLink?: {
    label: string;
    url: string;
  };
}

export interface DialogueNode {
  id: string;
  speaker: string;
  title: string;
  greeting: string;
  ambientChatter: string[];
  options: DialogueOption[];
}

export interface NPCData {
  id: string;
  name: string;
  role: string;
  title: string;
  accentColor: string;
  position: [number, number, number];
  rotation: number;
  avatarIcon: string;
  landmark: string;
  portfolioTopic: string;
  summaryQuote: string;
  dialogue: DialogueNode;
}

export interface PortfolioProject {
  id: string;
  title: string;
  category: 'Full-Stack Web' | 'AI & Agents' | '3D & Creative Tech' | 'Cloud & Systems';
  role: string;
  period: string;
  summary: string;
  highlights: string[];
  technologies: string[];
  demoUrl?: string;
  repoUrl?: string;
  badge: string;
}

export interface SkillCategory {
  name: string;
  icon: string;
  skills: { name: string; level: number; tags: string[] }[];
}

export interface ShellItem {
  id: string;
  name: string;
  hint: string;
  position: [number, number, number];
  collected: boolean;
  lore: string;
}

export interface PlayerStats {
  visitedNpcs: Set<string>;
  collectedShells: Set<string>;
  stepsCount: number;
  conversationsCount: number;
  startTime: number;
}
