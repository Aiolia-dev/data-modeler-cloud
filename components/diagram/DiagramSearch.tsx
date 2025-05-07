"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useReactFlow } from 'reactflow';

interface SearchItem {
  id: string;
  name: string;
  type: 'entity' | 'attribute';
  entityId?: string; // For attributes, this is the parent entity ID
  entityName?: string; // For attributes, this is the parent entity name
}

interface DiagramSearchProps {
  nodes: any[];
  onSelectEntity: (entityId: string) => void;
  onSearchActive?: (isActive: boolean) => void;
}

export function DiagramSearch({ nodes, onSelectEntity, onSearchActive }: DiagramSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // Generate search items from nodes
  useEffect(() => {
    if (!nodes) return;

    const items: SearchItem[] = [];
    
    // Add entities
    nodes.forEach(node => {
      // Skip nodes without proper data
      if (!node.data || !node.data.name) return;
      
      // Add entity
      items.push({
        id: node.id,
        name: node.data.name,
        type: 'entity'
      });
      
      // Add attributes
      if (node.data.attributes && Array.isArray(node.data.attributes)) {
        node.data.attributes.forEach((attr: any) => {
          // Skip attributes without name
          if (!attr || !attr.name) return;
          
          items.push({
            id: attr.id || `attr-${Math.random().toString(36).substring(2, 9)}`,
            name: attr.name,
            type: 'attribute',
            entityId: node.id,
            entityName: node.data.name
          });
        });
      }
    });
    
    // Sort items alphabetically
    items.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
    
  }, [nodes]);

  // Filter search results based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    const items: SearchItem[] = [];
    
    // Add entities
    nodes.forEach(node => {
      // Skip nodes without proper data
      if (!node.data || !node.data.name) return;
      
      // Add entity if it matches
      if (node.data.name.toLowerCase().includes(term)) {
        items.push({
          id: node.id,
          name: node.data.name,
          type: 'entity'
        });
      }
      
      // Add attributes if they match
      if (node.data.attributes && Array.isArray(node.data.attributes)) {
        node.data.attributes.forEach((attr: any) => {
          // Skip attributes without name
          if (!attr || !attr.name) return;
          
          if (attr.name.toLowerCase().includes(term)) {
            items.push({
              id: attr.id || `attr-${Math.random().toString(36).substring(2, 9)}`,
              name: attr.name,
              type: 'attribute',
              entityId: node.id,
              entityName: node.data.name
            });
          }
        });
      }
    });
    
    // Sort items alphabetically
    items.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
    
    setSearchResults(items);
    setHighlightedIndex(0);
  }, [searchTerm, nodes]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[highlightedIndex]) {
          handleSelectItem(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Handle item selection
  const handleSelectItem = (item: SearchItem) => {
    // For attributes, select their parent entity
    const entityId = item.type === 'attribute' ? item.entityId : item.id;
    
    if (entityId) {
      onSelectEntity(entityId);
      
      // Focus on the selected entity
      const selectedNode = nodes.find(node => node.id === entityId);
      if (selectedNode) {
        // Center view on the selected entity with animation
        fitView({
          nodes: [selectedNode],
          duration: 800,
          padding: 0.5
        });
      }
    }
    
    // Close dropdown and reset search
    setIsOpen(false);
    setSearchTerm('');
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && resultsRef.current) {
      const highlightedElement = resultsRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="relative z-50">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
          <Search className="h-4 w-4 text-gray-500" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search entities and attributes..."
          className="pl-10 pr-4 py-2 w-64 bg-white/90 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm shadow-md rounded-md"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            // Notify parent that search is active
            onSearchActive?.(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            // Notify parent that search is active
            onSearchActive?.(true);
          }}
          onBlur={() => {
            // Delay closing to allow for clicks on results
            setTimeout(() => {
              setIsOpen(false);
              // Notify parent that search is no longer active
              onSearchActive?.(false);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {isOpen && searchResults.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute mt-1 w-full max-h-60 overflow-auto rounded-md bg-popover border border-muted shadow-md z-50"
        >
          <div className="py-1">
            {searchResults.length > 0 && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                ENTITIES
              </div>
            )}
            {searchResults
              .filter(item => item.type === 'entity')
              .map((item, index) => (
                <div
                  key={`entity-${item.id}`}
                  data-index={index}
                  className={`px-3 py-1.5 text-sm cursor-pointer flex items-center ${
                    highlightedIndex === index ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={() => handleSelectItem(item)}
                >
                  {item.name}
                </div>
              ))}

            {searchResults.some(item => item.type === 'attribute') && (
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
                ATTRIBUTES
              </div>
            )}
            {searchResults
              .filter(item => item.type === 'attribute')
              .map((item, index) => {
                const entityIndex = searchResults.filter(i => i.type === 'entity').length;
                const actualIndex = entityIndex + index;
                return (
                  <div
                    key={`attribute-${item.id}`}
                    data-index={actualIndex}
                    className={`px-3 py-1.5 text-sm cursor-pointer ${
                      highlightedIndex === actualIndex ? 'bg-accent text-accent-foreground' : ''
                    }`}
                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                    onMouseDown={() => handleSelectItem(item)}
                  >
                    <div className="flex items-center">
                      <span>{item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        in {item.entityName}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
