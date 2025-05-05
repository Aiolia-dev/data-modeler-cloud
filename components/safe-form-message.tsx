import { FormMessage, Message } from './form-message';

interface SafeFormMessageProps {
  message: Message | null;
}

export function SafeFormMessage({ message }: SafeFormMessageProps) {
  if (!message) {
    return <div className="h-6"></div>;
  }
  
  return <FormMessage message={message} />;
}
