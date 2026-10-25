"use client";

import { AppShell } from "@mantine/core";
import { DashboardNavbar } from "@/components/dashboard/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell
      navbar={{
        width: 80,
        breakpoint: "",
      }}
      padding="md"
    >
      <AppShell.Navbar>
        <DashboardNavbar />
      </AppShell.Navbar>

      <AppShell.Main bg={"var(--mantine-color-gray-0)"}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
