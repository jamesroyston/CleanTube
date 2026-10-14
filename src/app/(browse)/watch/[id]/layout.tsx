import { WatchLandscapeViewportFit } from "@/components/WatchLandscapeViewportFit";

export default function WatchIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WatchLandscapeViewportFit />
      {children}
    </>
  );
}
