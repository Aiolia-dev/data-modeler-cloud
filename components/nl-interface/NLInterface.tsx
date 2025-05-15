"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NLProcessor, { Message, ModelChange } from './NLProcessor';
import EntityPreview from './EntityPreview';

export type NLInterfaceProps = {
  projectId: string;
  dataModelId: string;
};

export function NLInterface({ projectId, dataModelId }: NLInterfaceProps) {
  // Initialize the NLProcessor
  const nlProcessor = useRef(new NLProcessor(projectId, dataModelId));
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'How would you like to modify your data model? Describe what you want in plain English.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<ModelChange[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: input },
      { id: `${userMessageId}-assistant`, role: 'assistant', content: '', pending: true },
    ]);
    setInput('');
    setIsProcessing(true);

    try {
      // Process the request using NLProcessor with the OpenAI API
      console.log('Sending request to OpenAI API...');
      const response = await nlProcessor.current.processRequest(input, messages);
      console.log('Received response from OpenAI API:', response);
      
      // Check if the AI needs more information from the user
      if (response.need_more_info && response.missing_info) {
        // Update the assistant message asking for more information
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === `${userMessageId}-assistant`
              ? { ...msg, content: response.missing_info || response.message, pending: false }
              : msg
          )
        );
        return;
      }
      
      // Check if this is a standard entity creation
      const isEntityCreation = response.changes && 
        response.changes.length > 0 && 
        response.changes[0].operation === 'add_entity';
      
      if (isEntityCreation) {
        // The entity will be created automatically by the processRequest method
        // Just update the assistant message with confirmation
        const entityName = response.changes[0].entity || 'entity';
        const confirmationMessage = `I've created the "${entityName}" entity with a primary key (id). You can see it in the diagram view.`;
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === `${userMessageId}-assistant`
              ? { ...msg, content: confirmationMessage, pending: false }
              : msg
          )
        );
        
        return;
      }
      
      // We no longer need to handle responses to placement questions since we don't ask for positioning anymore
      
      // For non-entity creation or if position is already specified, update the assistant message with the response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${userMessageId}-assistant`
            ? { ...msg, content: response.message, pending: false }
            : msg
        )
      );

      // If the AI identified changes, show the preview
      if (response.changes && response.changes.length > 0) {
        setPreviewChanges(response.changes);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error processing NL request:', error);
      
      // Update the assistant message with the error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === `${userMessageId}-assistant`
            ? {
                ...msg,
                content:
                  'Sorry, I encountered an error processing your request. Please try again or rephrase your request.',
                pending: false,
              }
            : msg
        )
      );
      
      toast({
        title: 'Error',
        description: 'Failed to process your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = async () => {
    setIsProcessing(true);
    try {
      // The changes have already been applied by the NLProcessor when creating attributes
      // This is now just for UI feedback and confirmation
      
      // Close the preview dialog
      setShowPreview(false);
      
      // If this was a join entity creation, trigger the Sugiyama algorithm
      if (previewChanges.length > 0 && previewChanges[0].operation === 'add_join_entity') {
        // Dispatch a custom event to trigger the Sugiyama algorithm
        // This event will be caught by the DiagramView component
        setTimeout(() => {
          console.log('Dispatching event to run Sugiyama algorithm after join entity creation');
          // Use a custom event that will be handled in the diagram
          const event = new CustomEvent('run-sugiyama-layout');
          window.dispatchEvent(event);
        }, 500); // Wait for the join entity to be created and rendered
      }
      
      // Show a success toast
      toast({
        title: 'Changes Applied',
        description: 'Your requested changes have been applied to the data model.',
        variant: 'default',
      });
      
      // Add a confirmation message from the assistant
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'The changes have been applied successfully. Is there anything else you would like to do?',
        },
      ]);
      
      // Don't redirect, just stay on the current page
      // The changes have already been applied and the user can continue using the NL interface
      // or navigate manually to another page if needed
    } catch (error) {
      console.error('Error applying changes:', error);
      
      // Show an error toast
      toast({
        title: 'Error',
        description: 'Failed to apply changes. Please try again.',
        variant: 'destructive',
      });
      
      // Add an error message from the assistant
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error applying the changes. Please try again or rephrase your request.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelChanges = () => {
    // Close the preview dialog
    setShowPreview(false);
    
    // Add a cancellation message from the assistant
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Changes have been cancelled. Is there anything else you would like to do?',
      },
    ]);
  };

  return (
    <>
      <Card className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle>Natural Language Interface</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.pending ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter className="border-t p-4">
          <div className="flex w-full items-center space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to do with your data model..."
              className="flex-grow"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              size="icon"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview Changes</DialogTitle>
            <DialogDescription>
              Review the changes before applying them to your data model.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Changes Summary</h3>
            <div className="bg-secondary p-4 rounded-md">
              {previewChanges.map((change, index) => (
                <div key={index} className="mb-2">
                  <div className="flex items-center">
                    <span className="font-semibold">{change.type.charAt(0).toUpperCase() + change.type.slice(1)}</span>
                    <span className="mx-2">→</span>
                    <span>
                      {change.entity && `Entity: ${change.entity}`}
                      {change.attribute && ` / Attribute: ${change.attribute}`}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{change.details}</div>
                </div>
              ))}
            </div>
            
            {/* Entity Preview with React Flow */}
            {previewChanges.length > 0 && previewChanges[0].entity && (
              <div className="mt-4">
                <h3 className="text-md font-semibold mb-2">Visual Preview</h3>
                {previewChanges[0].operation === 'add_join_entity' ? (
                  <EntityPreview 
                    entityName={previewChanges[0].entity || ''} 
                    changes={previewChanges}
                    sourceEntityName={previewChanges[0].source_entity || ''}
                    targetEntityName={previewChanges[0].target_entity || ''}
                    isJoinEntity={true}
                  />
                ) : (
                  <EntityPreview 
                    entityName={previewChanges[0].entity || ''} 
                    changes={previewChanges} 
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between mt-4">
            <Button variant="outline" onClick={handleCancelChanges} disabled={isProcessing}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleApplyChanges} 
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NLInterface;
