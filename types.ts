
export type Role = 'user' | 'model';

export interface ChatMessage {
  text: string;
  role: Role;
  isToolMessage?: boolean;
}
