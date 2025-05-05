"use client"

import React, { useState, useRef, useEffect, KeyboardEvent } from "react"
import { X, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Entity {
  id: string
  name: string
}

interface EntityMultiSelectProps {
  entities: Entity[]
  selectedEntities: Entity[]
  onSelectEntity: (entity: Entity) => void
  onRemoveEntity: (entityId: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function EntityMultiSelect({
  entities,
  selectedEntities,
  onSelectEntity,
  onRemoveEntity,
  placeholder = "Type to search...",
  className,
  disabled = false,
}: EntityMultiSelectProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter entities based on search term
  const filteredEntities = entities
    .filter(entity => 
      // Filter out already selected entities
      !selectedEntities.some(selected => selected.id === entity.id) &&
      // Filter by search term
      entity.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 10) // Limit results to 10 for performance

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setHighlightedIndex(-1)
  }

  // Handle entity selection
  const handleSelectEntity = (entity: Entity) => {
    onSelectEntity(entity)
    setSearchTerm("")
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < filteredEntities.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault()
      handleSelectEntity(filteredEntities[highlightedIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSearchTerm("")
      setHighlightedIndex(-1)
      inputRef.current?.blur()
    } else if (e.key === "Backspace" && searchTerm === "" && selectedEntities.length > 0) {
      // Remove the last selected entity when backspace is pressed with empty input
      onRemoveEntity(selectedEntities[selectedEntities.length - 1].id)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [highlightedIndex])

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full border border-input rounded-md bg-background",
        isFocused && "ring-2 ring-ring",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <div className="flex flex-wrap gap-1 p-1">
        {/* Selected entities as tags */}
        {selectedEntities.map(entity => (
          <div
            key={entity.id}
            className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
          >
            {entity.name}
            <button
              type="button"
              onClick={() => onRemoveEntity(entity.id)}
              className="text-primary/70 hover:text-primary"
              disabled={disabled}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedEntities.length === 0 ? placeholder : ""}
          className="flex-grow min-w-[120px] h-8 px-2 bg-transparent outline-none text-sm"
          disabled={disabled}
        />
      </div>

      {/* Clear all button */}
      {selectedEntities.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => {
            selectedEntities.forEach(entity => onRemoveEntity(entity.id))
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <XCircle size={16} />
        </button>
      )}

      {/* Dropdown */}
      {isFocused && filteredEntities.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-input bg-background rounded-md shadow-md max-h-[200px] overflow-y-auto">
          <div ref={dropdownRef}>
            {filteredEntities.map((entity, index) => (
              <div
                key={entity.id}
                onClick={() => handleSelectEntity(entity)}
                className={cn(
                  "px-3 py-2 cursor-pointer hover:bg-accent",
                  index === highlightedIndex && "bg-accent"
                )}
              >
                {entity.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {isFocused && searchTerm && filteredEntities.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-input bg-background rounded-md shadow-md p-3 text-sm text-muted-foreground">
          No matching entities found
        </div>
      )}
    </div>
  )
}
