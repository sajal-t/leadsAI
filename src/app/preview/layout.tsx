export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh w-full flex-col overflow-hidden bg-white">{children}</div>;
}
