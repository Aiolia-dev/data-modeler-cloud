"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CommentModalProps, CommentData } from './CommentTypes';

export function CommentModal({
  open,
  onOpenChange,
  onSave,
  position,
  dataModelId,
  availableEntities = [],
}: CommentModalProps) {
  const [commentData, setCommentData] = useState<CommentData>({
    content: "",
    commentType: "free",
    dataModelId,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setCommentData({
        content: "",
        commentType: "free",
        dataModelId,
        position: position || undefined,
      });
      setError(null);
    }
  }, [open, dataModelId, position]);

  const handleChange = (field: keyof CommentData, value: string | boolean | { x: number; y: number } | undefined) => {
    setCommentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!commentData.content.trim()) {
        setError("Comment content is required");
        return;
      }
      
      setIsSaving(true);
      
      // Set position for free comments
      if (commentData.commentType === 'free' && position) {
        commentData.position = position;
      } else {
        // Remove position for entity/attribute/relationship comments
        delete commentData.position;
      }
      
      await onSave(commentData);
      
      // Close modal on successful save
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving comment:', err);
      setError(err instanceof Error ? err.message : "Failed to save comment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>
          <DialogDescription>
            Add a comment to the diagram. Comments can be placed freely or attached to specific elements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <RadioGroup
            value={commentData.commentType}
            onValueChange={(value) => handleChange("commentType", value)}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="free" id="free" />
              <Label htmlFor="free">Free-floating comment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="entity" id="entity" />
              <Label htmlFor="entity">Attach to entity</Label>
            </div>
          </RadioGroup>

          {commentData.commentType === 'entity' && (
            <div className="grid gap-2">
              <Label htmlFor="entitySelect">Select Entity</Label>
              <select
                id="entitySelect"
                className="w-full p-2 border rounded-md"
                value={commentData.entityId || ''}
                onChange={(e) => handleChange("entityId", e.target.value)}
              >
                <option value="">Select an entity...</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Enter your comment here..."
              value={commentData.content}
              onChange={(e) => handleChange("content", e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
