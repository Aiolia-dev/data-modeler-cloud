import Image from 'next/image';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Logo and app name moved to main layout */}
      {/* Documentation link removed to prevent overlap with sign-in buttons */}
      {children}
    </div>
  );
}
