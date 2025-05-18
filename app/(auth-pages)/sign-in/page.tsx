import { Message } from "@/components/form-message";
import { FixedSignInForm } from "@/components/auth/fixed-sign-in-form";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  let message;
  
  if (searchParams) {
    if ('error' in searchParams) {
      message = {
        type: 'error',
        text: searchParams.error
      };
    } else if ('success' in searchParams) {
      message = {
        type: 'success',
        text: searchParams.success
      };
    } else if ('message' in searchParams) {
      message = {
        type: 'info',
        text: searchParams.message
      };
    }
  }
  
  return (
    <div className="bg-gray-900 rounded-lg p-8 w-[450px] shadow-xl">
      <FixedSignInForm message={message} />
    </div>
  );
}
