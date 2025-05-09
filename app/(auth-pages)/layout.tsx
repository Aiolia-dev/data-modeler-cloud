import Image from 'next/image';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black bg-[radial-gradient(#222_1px,transparent_1px)] bg-[size:24px_24px]">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div 
          className="h-10 w-10 bg-white flex items-center justify-center" 
          style={{ 
            borderRadius: '6px',
            borderWidth: '3px',
            borderStyle: 'solid',
            borderLeftColor: '#7351F1',
            borderBottomColor: '#7351F1',
            borderRightColor: '#563CB5', /* 25% darker than #7351F1 */
            borderTopColor: '#563CB5', /* 25% darker than #7351F1 */
          }}
        >
          <span className="text-2xl font-bold" style={{ color: '#7351F1' }}>D</span>
        </div>
        <h1 className="text-2xl font-bold">Data Modeler Pro</h1>
      </div>
      {/* Documentation link removed to prevent overlap with sign-in buttons */}
      {children}
    </div>
  );
}
