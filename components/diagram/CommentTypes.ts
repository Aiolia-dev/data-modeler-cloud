import { Entity } from '@/types/entity';

export interface CommentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (commentData: CommentData) => Promise<void>;
  position: { x: number; y: number } | null;
  dataModelId: string;
  availableEntities: Entity[];
}

export interface CommentData {
  content: string;
  commentType: 'free' | 'entity' | 'attribute' | 'relationship';
  entityId?: string;
  attributeId?: string;
  relationshipId?: string;
  position?: { x: number; y: number };
  dataModelId: string;
}
