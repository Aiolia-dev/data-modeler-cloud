"use client";

import { useState } from "react";
import { ChevronRightIcon, EyeIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useParams } from "next/navigation";

interface Entity {
  id: string;
  name: string;
  description: string | null;
  data_model_id: string;
  created_at: string;
  updated_at: string;
}

import TableSpinner from "@/components/ui/table-spinner";

interface EntityListProps {
  entities: Entity[];
  attributeCounts: Record<string, number>;
  foreignKeyCounts: Record<string, number>;
  relationshipCounts: Record<string, number>;
  ruleCounts: Record<string, number>;
  attributeCountsLoading?: Record<string, boolean>;
  foreignKeyCountsLoading?: Record<string, boolean>;
  relationshipCountsLoading?: Record<string, boolean>;
  ruleCountsLoading?: Record<string, boolean>;
  onSelectEntity: (entityId: string) => void;
  onViewInModel?: (entityId: string) => void;
}

export default function EntityList({
  entities,
  attributeCounts,
  foreignKeyCounts,
  relationshipCounts,
  ruleCounts,
  attributeCountsLoading,
  foreignKeyCountsLoading,
  relationshipCountsLoading,
  ruleCountsLoading,
  onSelectEntity,
  onViewInModel
}: EntityListProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const modelId = params.modelId as string;

  // Navigate to Diagram tab with selected entity
  const handleViewInModel = (entityId: string) => {
    router.push(`/protected/projects/${projectId}/models/${modelId}?tab=diagram&selectedEntity=${entityId}`);
  };

  return (
    <div className="border border-gray-700 rounded-md overflow-hidden bg-gray-900">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="w-10 px-4 py-3"></th>
            <th className="text-left px-4 py-3 font-medium text-gray-200">Entity Name</th>
            <th className="text-center px-4 py-3 font-medium text-gray-200">Attributes</th>
            <th className="text-center px-4 py-3 font-medium text-gray-200">Foreign Keys</th>
            <th className="text-center px-4 py-3 font-medium text-gray-200">Relationships</th>
            <th className="text-center px-4 py-3 font-medium text-gray-200">Rules</th>
            <th className="text-right px-4 py-3 font-medium text-gray-200">Last Updated</th>
            <th className="text-center px-4 py-3 font-medium text-gray-200">View in model</th>
          </tr>
        </thead>
        <tbody>
          {entities.map((entity) => (
            <tr 
              key={entity.id} 
              className="border-t border-gray-700 hover:bg-gray-800/30 cursor-pointer"
              onClick={() => onSelectEntity(entity.id)}
            >
              <td className="px-4 py-3 text-center">
                <ChevronRightIcon size={16} className="text-gray-400" />
              </td>
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-gray-100">{entity.name}</div>
                  {entity.description && (
                    <div className="text-sm text-gray-400 truncate max-w-md">{entity.description}</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md text-sm min-w-[24px] inline-flex items-center justify-center">
                  {attributeCountsLoading?.[entity.id] ? <TableSpinner /> : (
                    // Debug and display attribute count
                    (() => {
                      console.log('Attribute count for', entity.id, '=', attributeCounts[entity.id]);
                      return attributeCounts[entity.id] || 0;
                    })()
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded-md text-sm min-w-[24px] inline-flex items-center justify-center">
                  {foreignKeyCountsLoading?.[entity.id] ? <TableSpinner /> : (
                    // Debug and display foreign key count
                    (() => {
                      console.log('FK count for', entity.id, '=', foreignKeyCounts[entity.id]);
                      return foreignKeyCounts[entity.id] || 0;
                    })()
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-md text-sm min-w-[24px] inline-flex items-center justify-center">
                  {relationshipCountsLoading?.[entity.id] ? <TableSpinner /> : (
                    // Debug and display relationship count
                    (() => {
                      console.log('Relationship count for', entity.id, '=', relationshipCounts[entity.id]);
                      return relationshipCounts[entity.id] || 0;
                    })()
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="px-2 py-1 bg-orange-900/30 text-orange-400 rounded-md text-sm min-w-[24px] inline-flex items-center justify-center">
                  {ruleCountsLoading?.[entity.id] ? <TableSpinner /> : (
                    // Debug and display rule count
                    (() => {
                      console.log('Rule count for', entity.id, '=', ruleCounts[entity.id]);
                      return ruleCounts[entity.id] || 0;
                    })()
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-400">
                {formatDistanceToNow(new Date(entity.updated_at), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded hover:bg-gray-800/40 p-1 transition"
                  tabIndex={0}
                  aria-label={"View " + entity.name + " in model"}
                  onClick={e => {
                    e.stopPropagation();
                    handleViewInModel(entity.id);
                  }}
                >
                  <EyeIcon size={18} className="text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
