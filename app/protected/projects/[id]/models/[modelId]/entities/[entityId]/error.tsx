"use client";
import React from "react";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="p-8 text-destructive">
      Error loading entity: {error.message}
    </div>
  );
}
