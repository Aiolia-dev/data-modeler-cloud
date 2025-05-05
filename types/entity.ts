export interface Entity {
  id: string;
  name: string;
  description: string | null;
  data_model_id: string;
  created_at: string;
  updated_at: string;
  entity_type?: 'standard' | 'join';
  join_entities?: string[];
  position_x?: number;
  position_y?: number;
}
