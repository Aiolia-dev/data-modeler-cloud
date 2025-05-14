"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";

interface DataModelTabsProps {
  projectId: string;
  modelId: string;
  entityCount: number;
  referentialCount: number;
  ruleCount: number;
  activeTab: string;
}

export default function DataModelTabs({
  projectId,
  modelId,
  entityCount,
  referentialCount,
  ruleCount,
  activeTab
}: DataModelTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const entityId = params?.entityId as string | undefined;
  
  // Determine if we're on an entity detail page
  const isEntityDetailPage = pathname.includes('/entities/');
  
  // Handle tab navigation
  const handleTabChange = (value: string) => {
    // If we're on the entity detail page, navigate back to the main data model page
    if (isEntityDetailPage) {
      router.push(`/protected/projects/${projectId}/models/${modelId}?tab=${value}`);
    } else {
      // If we're already on the main data model page, just update the URL query parameter
      const url = new URL(window.location.href);
      url.searchParams.set("tab", value);
      
      // Update the URL to reflect the current tab without a full page reload
      window.history.pushState({}, "", url.toString());
      
      // Dispatch a custom event to notify components that the tab has changed
      window.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: value } }));
    }
  };

  return (
    <div className="grid grid-cols-6 gap-[10px] mb-8 bg-gray-800 rounded-md py-[5px] px-[5px]">
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "entities" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center gap-1.5`}
        onClick={() => handleTabChange('entities')}
      >
        Entities {entityCount > 0 && (
          <span className="inline-flex items-center justify-center bg-white rounded-full w-5 h-5 text-xs font-medium text-gray-700">
            {entityCount}
          </span>
        )}
      </button>
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "referentials" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center gap-1.5`}
        onClick={() => handleTabChange('referentials')}
      >
        Referentials {referentialCount > 0 && (
          <span className="inline-flex items-center justify-center bg-white rounded-full w-5 h-5 text-xs font-medium text-gray-700">
            {referentialCount}
          </span>
        )}
      </button>
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "diagram" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center`}
        onClick={() => handleTabChange('diagram')}
      >
        Diagram
      </button>
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "rules" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center gap-1.5`}
        onClick={() => handleTabChange('rules')}
      >
        Rules {ruleCount > 0 && (
          <span className="inline-flex items-center justify-center bg-white rounded-full w-5 h-5 text-xs font-medium text-gray-700">
            {ruleCount}
          </span>
        )}
      </button>
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "sql" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center`}
        onClick={() => handleTabChange('sql')}
      >
        SQL
      </button>
      <button 
        className={`py-2 px-4 text-sm font-medium ${activeTab === "nl-interface" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"} rounded-sm flex items-center justify-center`}
        onClick={() => handleTabChange('nl-interface')}
      >
        Natural Language
      </button>
    </div>
  );
}
