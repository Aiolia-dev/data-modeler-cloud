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
      <div className="absolute top-8 right-8 flex gap-6">
        <a href="#" className="text-gray-400 hover:text-white">Documentation</a>
        <a href="#" className="text-gray-400 hover:text-white">Support</a>
        <a href="#" className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700">Deploy to Vercel</a>
      </div>
      {children}
      <div className="absolute bottom-8 text-gray-500 text-sm">
        Powered by Supabase
      </div>
    </div>
  );
}
