import Image from 'next/image';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="h-12 w-12 bg-primary flex items-center justify-center rounded-md">
          <span className="text-2xl font-bold text-white">D</span>
        </div>
        <h1 className="text-2xl font-bold">DataModel Pro</h1>
      </div>
      {/* Documentation link removed to prevent overlap with sign-in buttons */}
      {children}
    </div>
  );
}
