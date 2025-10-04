import LogProvider from "./_components/log/provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LogProvider>{children}</LogProvider>;
}
