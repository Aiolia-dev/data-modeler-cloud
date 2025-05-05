"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Import the client component dynamically with client-side only rendering
const DataModelClient = dynamic(() => import("./DataModelClient"), {
  ssr: false,
  loading: () => <LoadingState />
});

// Loading state component
function LoadingState() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-pulse text-gray-400">Loading data model...</div>
    </div>
  );
}

interface DataModelWrapperProps {
  projectId: string;
  modelId: string;
}

// This is a client component wrapper that can safely use dynamic imports with ssr: false
export default function DataModelWrapper({ projectId, modelId }: DataModelWrapperProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <DataModelClient projectId={projectId} modelId={modelId} />
    </Suspense>
  );
}
