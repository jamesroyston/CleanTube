import { AuthMobileLayout } from "@/components/AuthMobileLayout";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthMobileLayout>{children}</AuthMobileLayout>;
}
