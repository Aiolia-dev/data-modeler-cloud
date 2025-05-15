"use client";

import { Suspense } from 'react';
import { NLInterface } from '@/components/nl-interface/NLInterface';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Natural Language Interface Page
 * This page provides a natural language interface for modifying data models
 * using plain English instructions.
 */
type PageProps = {
  params: { id: string; modelId: string };
};

export default function NLInterfacePage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold">Natural Language Interface</h1>
        <p className="text-muted-foreground">
          Describe what you want to do with your data model in plain English, and the AI will help you make the changes.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <NLInterface dataModelId={params.modelId} projectId={params.id} />
      </Suspense>
    </div>
  );
}

/**
 * Documentation for the Natural Language Interface
 * 
 * The Natural Language Interface allows users to modify data models using plain English instructions.
 * It uses an AI model to interpret the user's instructions and generate the appropriate changes to the data model.
 * 
 * Features:
 * - Create, modify, and delete entities, attributes, referentials, relationships, and rules
 * - Visual preview of changes before applying them
 * - Conversational interface for asking follow-up questions
 * 
 * Example instructions:
 * - "Add a new entity called Customer with attributes name, email, and phone"
 * - "Create a foreign key in the Order entity that references the Customer entity"
 * - "Add a validation rule to ensure the email attribute is unique"
 * - "Create a join entity between Product and Order called OrderItem"
 * - "Delete the address attribute from the Customer entity"
 * - "Rename the 'name' attribute to 'full_name' in the Customer entity"
 * - "Create a new referential called 'Sales Process' with color #FF5733"
 */
