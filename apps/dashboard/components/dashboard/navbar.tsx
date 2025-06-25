"use client";
import {
  IconBug,
  IconHome2,
  IconFlag,
  IconLogout,
  IconMapPin,
  IconNotification,
  IconSettings,
  IconSpeakerphone,
} from "@tabler/icons-react";
import { Center, Stack, Tooltip, UnstyledButton } from "@mantine/core";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

interface NavbarLinkProps {
  icon: typeof IconHome2;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({
  icon: Icon,
  label,
  href,
  active,
  onClick,
}: NavbarLinkProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (href) {
      router.push(href);
    }
  };

  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton
        component={href ? "a" : "button"}
        onClick={handleClick}
        href={href}
        data-active={active || undefined}
        className={cn(
          "group flex items-center justify-center rounded-md",
          active ? "bg-UTColors-50" : "hover:bg-gray-50",
        )}
        h={50}
        w={50}
      >
        <Icon
          className={cn(active && "text-UTColors-filled")}
          size={20}
          stroke={1.5}
        />
      </UnstyledButton>
    </Tooltip>
  );
}

const mockdata = [
  { icon: IconMapPin, label: "Locations", href: "/dashboard" },
  {
    icon: IconSettings,
    label: "App Configuration",
    href: "/dashboard/configuration",
  },
  {
    icon: IconNotification,
    label: "Push Notifications",
    href: "/dashboard/notifications",
  },
  {
    icon: IconSpeakerphone,
    label: "Announcements",
    href: "/dashboard/announcements",
  },
  { icon: IconBug, label: "Issue Reporting", href: "/dashboard/issues" },
  { icon: IconFlag, label: "Feature Flags", href: "/dashboard/feature-flags" },
];

export function DashboardNavbar() {
  const pathname = usePathname();

  const links = mockdata.map((link) => (
    <NavbarLink
      {...link}
      key={link.label}
      active={
        link.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(link.href || "")
      }
    />
  ));

  return (
    <nav className="p-md flex h-[46.875rem] w-[5rem] flex-col border-r-1 border-gray-200 bg-white">
      <Center>
        <Image src={"/logo.png"} alt="Logo" width={40} height={40} />
      </Center>

      <div className="mt-[3.125rem] flex-1">
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
        <NavbarLink onClick={logout} icon={IconLogout} label="Logout" />
      </Stack>
    </nav>
  );
}
