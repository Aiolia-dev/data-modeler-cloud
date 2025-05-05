"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Import the client component dynamically with client-side only rendering
const EntityDetailClient = dynamic(() => import("./EntityDetailClient"), {
  ssr: false,
  loading: () => <LoadingState />
});

// Loading state component
function LoadingState() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-pulse text-gray-400">Loading entity details...</div>
    </div>
  );
}

interface EntityDetailWrapperProps {
  projectId: string;
  modelId: string;
  entityId: string;
}

// This is a client component wrapper that can safely use dynamic imports with ssr: false
export default function EntityDetailWrapper({ projectId, modelId, entityId }: EntityDetailWrapperProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <EntityDetailClient projectId={projectId} modelId={modelId} />
    </Suspense>
  );
}
