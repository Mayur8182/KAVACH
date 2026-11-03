export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden', backgroundColor: '#ffffff', color: '#18181b', fontFamily: 'Inter, sans-serif' }}>
      {children}
    </div>
  );
}
