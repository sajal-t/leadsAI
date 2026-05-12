import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="mx-auto flex w-full max-w-[1500px] gap-6 p-4 md:p-6">
        <Sidebar />
        <div className="w-full">
          <Topbar />
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
