"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Comment } from './CommentMarker';
import { Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommentViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: Comment | null;
  currentUserEmail: string;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentViewModal({
  open,
  onOpenChange,
  comment,
  currentUserEmail,
  onEdit,
  onDelete,
}: CommentViewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when modal opens with a new comment
  useEffect(() => {
    if (open && comment) {
      setEditedContent(comment.content);
      setIsEditing(false);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [open, comment]);

  if (!comment) return null;

  const isOwnComment = comment.user_email === currentUserEmail;
  const formattedDate = comment.created_at 
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    : 'recently';

  const handleSaveEdit = async () => {
    if (!comment || !editedContent.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await onEdit(comment.id, editedContent);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!comment) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await onDelete(comment.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      setShowDeleteConfirm(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Edit Comment' : 'Comment'}
            {!isEditing && isOwnComment && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditing(true)}
                disabled={isProcessing}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription className="flex justify-between">
            <span>
              By {comment.user_email || 'unknown user'} • {formattedDate}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-4">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Delete this comment?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[120px]"
              placeholder="Comment content..."
              disabled={isProcessing}
            />
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isProcessing || !editedContent.trim()}
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="whitespace-pre-wrap">{comment.content}</p>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>
        )}

        {!isEditing && !showDeleteConfirm && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
