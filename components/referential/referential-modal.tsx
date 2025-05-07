"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PermissionButton } from "@/components/ui/permission-button"
import { usePermissions } from "@/context/permission-context"
import { useViewerCheck } from "@/hooks/use-viewer-check"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { EntityMultiSelect, Entity } from "@/components/ui/entity-multi-select"

interface ReferentialFormData {
  name: string
  description: string
  color: string
  entityIds: string[] // IDs of entities to associate with this referential
}

interface ReferentialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (formData: ReferentialFormData, isEditing: boolean) => void
  dataModelId: string
  projectId: string // Added projectId for permission checks
  entities?: Entity[] // Available entities for selection
  editingReferential?: {
    id: string
    name: string
    description?: string
    color: string
    entityIds?: string[] // IDs of entities currently associated with this referential
  }
  referentials?: {
    id: string
    name: string
    entityIds?: string[] // IDs of entities associated with each referential
  }[]
}

export function ReferentialModal({
  open,
  onOpenChange,
  onSave,
  dataModelId,
  projectId,
  entities = [], // Default to empty array if not provided
  editingReferential,
  referentials = [], // Default to empty array if not provided
}: ReferentialModalProps) {
  // Check if the user is a viewer for this project
  const isViewer = useViewerCheck(projectId);
  const [formData, setFormData] = useState<ReferentialFormData>({
    name: "",
    description: "",
    color: "#6366F1", // Default color (indigo)
    entityIds: [],
  })
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([])
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, color: e.target.value }))
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (editingReferential) {
        // We're editing an existing referential
        setIsEditing(true)
        setFormData({
          name: editingReferential.name,
          description: editingReferential.description || "",
          color: editingReferential.color,
          entityIds: editingReferential.entityIds || [],
        })
        
        // Set selected entities based on entityIds
        if (editingReferential.entityIds && editingReferential.entityIds.length > 0) {
          const selectedEntitiesData = entities.filter(entity => 
            editingReferential.entityIds?.includes(entity.id)
          )
          setSelectedEntities(selectedEntitiesData)
        } else {
          setSelectedEntities([])
        }
        
        // When editing, available entities should include:
        // 1. Entities that don't belong to any referential
        // 2. Entities that belong to the current referential being edited
        if (entities.length > 0) {
          // Get all entities that are already assigned to other referentials
          const entitiesInOtherReferentials = new Set<string>()
          
          referentials.forEach(ref => {
            // Skip the current referential being edited
            if (ref.id !== editingReferential.id && ref.entityIds) {
              ref.entityIds.forEach(entityId => {
                entitiesInOtherReferentials.add(entityId)
              })
            }
          })
          
          // Filter out entities that belong to other referentials
          const availableEntitiesFiltered = entities.filter(entity => 
            !entitiesInOtherReferentials.has(entity.id)
          )
          
          setAvailableEntities(availableEntitiesFiltered)
        }
      } else {
        // We're creating a new referential
        setIsEditing(false)
        setFormData({
          name: "",
          description: "",
          color: "#6366F1",
          entityIds: [],
        })
        setSelectedEntities([])
        
        // When creating a new referential, available entities should only include
        // entities that don't belong to any referential
        if (entities.length > 0) {
          // Get all entities that are already assigned to referentials
          const entitiesInReferentials = new Set<string>()
          
          referentials.forEach(ref => {
            if (ref.entityIds) {
              ref.entityIds.forEach(entityId => {
                entitiesInReferentials.add(entityId)
              })
            }
          })
          
          // Filter out entities that already belong to referentials
          const availableEntitiesFiltered = entities.filter(entity => 
            !entitiesInReferentials.has(entity.id)
          )
          
          setAvailableEntities(availableEntitiesFiltered)
        }
      }
    }
  }, [open, entities, editingReferential, referentials])

  // Update entityIds in formData when selectedEntities changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      entityIds: selectedEntities.map(entity => entity.id)
    }))
  }, [selectedEntities])

  // Handle adding an entity to the selection
  const handleSelectEntity = (entity: Entity) => {
    setSelectedEntities(prev => [...prev, entity])
  }

  // Handle removing an entity from the selection
  const handleRemoveEntity = (entityId: string) => {
    setSelectedEntities(prev => prev.filter(entity => entity.id !== entityId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onSave(formData, isEditing)
      // Explicitly close the modal after successful save
      onOpenChange(false)
      // Form will be reset when modal closes via the useEffect
    } catch (error) {
      console.error("Error saving referential:", error)
      // Keep the modal open on error so the user can try again
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[490px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Referential' : 'Create New Referential'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update referential details and associated entities.' 
              : 'Create a new referential to group related entities together.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={isViewer}
                title={isViewer ? "You don't have permission to edit referentials" : "Enter referential name"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="col-span-3"
                rows={3}
                disabled={isViewer}
                title={isViewer ? "You don't have permission to edit referentials" : "Enter referential description"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <div 
                  className="h-8 w-8 rounded-md border border-input" 
                  style={{ backgroundColor: formData.color }}
                />
                <Input
                  id="color"
                  name="color"
                  type="color"
                  value={formData.color}
                  onChange={handleColorChange}
                  className="w-12 p-1 h-8"
                  disabled={isViewer}
                  title={isViewer ? "You don't have permission to edit referentials" : "Select color"}
                />
                <Input
                  id="colorHex"
                  value={formData.color}
                  onChange={handleChange}
                  name="color"
                  className="flex-1"
                  placeholder="#000000"
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  title={isViewer ? "You don't have permission to edit referentials" : "Valid hexadecimal color code (e.g., #FF0000)"}
                  disabled={isViewer}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="entities" className="text-right pt-2">
                Select Entities
              </Label>
              <div className="col-span-3">
                <EntityMultiSelect
                  entities={availableEntities}
                  selectedEntities={selectedEntities}
                  onSelectEntity={handleSelectEntity}
                  onRemoveEntity={handleRemoveEntity}
                  placeholder="Type to search entities..."
                  className="min-h-[42px]"
                  disabled={isViewer}
                />
                {selectedEntities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEntities.length} {selectedEntities.length === 1 ? 'entity' : 'entities'} selected
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <PermissionButton 
              type="submit" 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
              projectId={projectId}
              action="edit"
              disabledMessage="You don't have permission to edit referentials"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Referential" : "Save Referential"}
            </PermissionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
