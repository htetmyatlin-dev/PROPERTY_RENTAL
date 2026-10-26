/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import {
  Box,
  Flex,
  Icon,
  Text,
  IconButton,
  HStack,
  VStack,
  Separator,
  Avatar,
  Badge,
} from "@chakra-ui/react";
import {
  LuMenu,
  LuX,
  LuLogOut,
  LuBell,
  LuChevronRight,
  LuHouse,
  LuArrowLeft,
} from "react-icons/lu";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ColorModeButton } from "../components/ui/color-mode";
import type { IconType } from "react-icons/lib";
import { useAppStore } from "@/app/store";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { notificationsPathFor, profilePathFor } from "@/utils/role-paths";

const profileImageUrl = (picture: string) =>
  `${import.meta.env.VITE_FILE_URL}/profile-images/${picture}`;

interface INavLink {
  icon: IconType;
  label: string;
  path: string;
}

/* ─── Sidebar Nav Item ─── */
const NavItem = ({
  icon,
  label,
  path,
  active,
  collapsed,
}: {
  icon: IconType;
  label: string;
  path: string;
  active: boolean;
  collapsed?: boolean;
}) => (
  <Link to={path} style={{ width: "100%", textDecoration: "none" }}>
    <HStack
      gap={3}
      px={3}
      py={2.5}
      borderRadius="xl"
      bg={active ? "white" : "transparent"}
      color={active ? "blue.700" : "blue.800"}
      fontWeight={active ? "semibold" : "normal"}
      position="relative"
      transition="all 0.2s cubic-bezier(.4,0,.2,1)"
      boxShadow={active ? "0 2px 8px rgba(59,130,246,0.13)" : "none"}
      _hover={{
        bg: active ? "white" : "whiteAlpha.600",
        color: "blue.700",
        transform: "translateX(2px)",
      }}
      _dark={{
        bg: active ? "blue.800" : "transparent",
        color: active ? "blue.100" : "blue.200",
        boxShadow: active ? "0 2px 8px rgba(59,130,246,0.25)" : "none",
        _hover: {
          bg: active ? "blue.800" : "whiteAlpha.100",
          color: "blue.100",
        },
      }}
      cursor="pointer"
      w="full"
    >
      {/* Active indicator bar */}
      {active && (
        <Box
          position="absolute"
          left="-16px"
          top="50%"
          transform="translateY(-50%)"
          w="4px"
          h="55%"
          bg="blue.500"
          borderRadius="full"
        />
      )}
      <Flex
        align="center"
        justify="center"
        w="34px"
        h="34px"
        borderRadius="lg"
        bg={active ? "blue.500" : "whiteAlpha.500"}
        color={active ? "white" : "blue.600"}
        transition="all 0.2s"
        flexShrink={0}
        _dark={{
          bg: active ? "blue.500" : "whiteAlpha.100",
          color: active ? "white" : "blue.300",
        }}
      >
        <Icon as={icon} boxSize={4} />
      </Flex>
      {!collapsed && (
        <Text fontSize="sm" letterSpacing="tight" flex={1} truncate>
          {label}
        </Text>
      )}
      {active && !collapsed && (
        <Icon as={LuChevronRight} boxSize={3.5} flexShrink={0} color="blue.400" />
      )}
    </HStack>
  </Link>
);

/* ─── Sidebar Brand / Logo ─── */
const SidebarBrand = () => (
  <HStack gap={3} px={1} py={1}>
    <Flex
      align="center"
      justify="center"
      w="40px"
      h="40px"
      borderRadius="xl"
      bg="blue.600"
      color="white"
      fontWeight="bold"
      fontSize="lg"
      flexShrink={0}
      boxShadow="0 4px 14px rgba(37,99,235,0.35)"
    >
      <Icon as={LuHouse} boxSize={5} />
    </Flex>
    <VStack gap={0} align="start">
      <Text fontWeight="bold" fontSize="lg" lineHeight="1.2" color="blue.900" _dark={{ color: "blue.50" }}>
        Rentify
      </Text>
      <Text fontSize="xs" color="blue.500" lineHeight="1" letterSpacing="wide">
        Property Manager
      </Text>
    </VStack>
  </HStack>
);

/* ─── Section Label ─── */
const SectionLabel = ({ label }: { label: string }) => (
  <Text
    fontSize="2xs"
    fontWeight="bold"
    textTransform="uppercase"
    letterSpacing="widest"
    color="blue.400"
    mb={2}
    px={3}
    _dark={{ color: "blue.400" }}
  >
    {label}
  </Text>
);

/* ─── Sidebar User Profile ─── */
const SidebarUserProfile = ({
  user,
  onLogout,
}: {
  user: any;
  onLogout: () => void;
}) => {
  const navigate = useNavigate();
  const profilePath = profilePathFor(user?.role);
  const openProfile = () => profilePath && navigate(profilePath);

  return (
    <Box>
      <Separator borderColor="blue.200" opacity={0.5} mb={4} _dark={{ borderColor: "blue.700" }} />
      <Flex
        align="center"
        gap={3}
        p={3}
        borderRadius="xl"
        bg="white"
        boxShadow="0 2px 8px rgba(59,130,246,0.10)"
        _dark={{ bg: "blue.900", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
      >
        <Flex
          align="center"
          gap={3}
          flex={1}
          minW={0}
          cursor={profilePath ? "pointer" : "default"}
          onClick={openProfile}
          title={profilePath ? "View profile" : undefined}
        >
          <Avatar.Root size="sm" flexShrink={0}>
            {user?.profilePicture && (
              <Avatar.Image src={profileImageUrl(user.profilePicture)} />
            )}
            <Avatar.Fallback
              name={user?.username}
              fontWeight="semibold"
              fontSize="xs"
            />
          </Avatar.Root>
          <VStack gap={0} align="start" flex={1} overflow="hidden">
            <Text fontSize="sm" fontWeight="semibold" lineClamp={1} color="blue.900" _dark={{ color: "blue.50" }}>
              {user?.username || "User"}
            </Text>
            <Text fontSize="xs" color="blue.500" lineClamp={1}>
              {user?.role || "Member"}
            </Text>
          </VStack>
        </Flex>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Logout"
          color="blue.400"
          _hover={{ color: "red.500", bg: "red.50" }}
          _dark={{ _hover: { bg: "red.950", color: "red.400" } }}
          onClick={onLogout}
          borderRadius="lg"
        >
          <LuLogOut />
        </IconButton>
      </Flex>
    </Box>
  );
};

/* ─── Sidebar Background Decoration ─── */
const SidebarDecoration = () => (
  <>
    <Box
      position="absolute"
      top="-40px"
      right="-40px"
      w="160px"
      h="160px"
      borderRadius="full"
      bg="blue.300"
      opacity={0.15}
      pointerEvents="none"
    />
    <Box
      position="absolute"
      bottom="60px"
      left="-60px"
      w="200px"
      h="200px"
      borderRadius="full"
      bg="blue.400"
      opacity={0.10}
      pointerEvents="none"
    />
  </>
);

/* ─── Desktop Sidebar Content ─── */
const SidebarContent = ({
  navLinks,
  location,
  user,
  onLogout,
}: {
  navLinks: INavLink[];
  location: any;
  user: any;
  onLogout: () => void;
}) => (
  <VStack h="full" p={5} align="stretch" gap={5} position="relative" overflow="hidden">
    <SidebarDecoration />

    {/* Fixed: Brand */}
    <Box flexShrink={0}>
      <SidebarBrand />
    </Box>

    <Separator borderColor="blue.200" opacity={0.5} flexShrink={0} _dark={{ borderColor: "blue.700" }} />

    {/* Scrollable nav area */}
    <Box
      flex={1}
      overflowY="auto"
      overflowX="hidden"
      css={{
        "&::-webkit-scrollbar": { width: "3px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(147,197,253,0.4)",
          borderRadius: "full",
        },
      }}
    >
      <SectionLabel label="Navigation" />
      <VStack align="stretch" gap={1}>
        {navLinks.map((link) => (
          <NavItem
            key={link.path}
            {...link}
            active={location.pathname === link.path}
          />
        ))}
      </VStack>
    </Box>

    {/* Fixed: User profile */}
    <Box flexShrink={0}>
      <SidebarUserProfile user={user} onLogout={onLogout} />
    </Box>
  </VStack>
);

/* ─── Sidebar shared styles ─── */
const SIDEBAR_WIDTH = "260px";

const sharedSidebarProps = {
  h: "full" as const,
  background: "linear-gradient(160deg, #dbeafe 0%, #eff6ff 60%, #e0f2fe 100%)",
  w: SIDEBAR_WIDTH,
  borderRight: "1px solid",
  borderColor: "blue.200",
  overflow: "hidden" as const,
  _dark: {
    background: "linear-gradient(160deg, #1e3a5f 0%, #1e3a8a 60%, #172554 100%)",
    borderColor: "blue.800",
  },
};

/* ─── Main Layout ─── */
export function DashboardLayout({ navLinks }: { navLinks: INavLink[] }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const user = useAppStore((s) => s.user);
  const notifications = useAppStore(s => s.notifications);
  const logout = useLogout();
  const navigate = useNavigate();

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead)?.length || 0;
  },[notifications])

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const handleLogout = () => logout.mutate();

  // Goes to the public landing page rather than through history: a dashboard
  // reached by a shared or bookmarked link has no in-app history to step back
  // through, and stepping back would otherwise drop the user out of the app.
  const goHome = () => {
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  const notificationsPath = notificationsPathFor(user?.role);
  const profilePath = profilePathFor(user?.role);
  const openProfile = () => {
    if (profilePath) navigate(profilePath);
  };

  return (
    <Box minH="100vh" bg="bg.canvas" color="fg">
      {/* ─── Desktop Sidebar ─── */}
      <Box
        as="nav"
        position="fixed"
        left="0"
        top="0"
        zIndex="100"
        boxShadow="sm"
        display={{ base: "none", lg: "block" }}
        {...sharedSidebarProps}
      >
        <SidebarContent
          navLinks={navLinks}
          location={location}
          user={user}
          onLogout={handleLogout}
        />
      </Box>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {isMobileMenuOpen && (
        <Box
          position="fixed"
          inset="0"
          bg="blackAlpha.500"
          backdropFilter="blur(6px)"
          zIndex="200"
          onClick={toggleMobileMenu}
          display={{ lg: "none" }}
          transition="opacity 0.3s"
        />
      )}

      {/* ─── Mobile Sidebar ─── */}
      <Box
        position="fixed"
        left={isMobileMenuOpen ? "0" : "-300px"}
        top="0"
        transition="left 0.3s cubic-bezier(.4,0,.2,1)"
        zIndex="201"
        display={{ lg: "none" }}
        boxShadow={isMobileMenuOpen ? "2xl" : "none"}
        {...sharedSidebarProps}
      >
        <VStack h="full" p={5} align="stretch" gap={5} position="relative" overflow="hidden">
          <SidebarDecoration />
          <Flex justify="space-between" align="center">
            <SidebarBrand />
            <IconButton
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              aria-label="Close menu"
              borderRadius="lg"
              color="blue.500"
              _hover={{ bg: "whiteAlpha.600", color: "blue.700" }}
            >
              <LuX />
            </IconButton>
          </Flex>
          <Separator borderColor="blue.200" opacity={0.5} flexShrink={0} _dark={{ borderColor: "blue.700" }} />
          <Box
            flex={1}
            overflowY="auto"
            overflowX="hidden"
            css={{
              "&::-webkit-scrollbar": { width: "3px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "rgba(147,197,253,0.4)",
                borderRadius: "full",
              },
            }}
          >
            <SectionLabel label="Navigation" />
            <VStack align="stretch" gap={1}>
              {navLinks.map((link) => (
                <NavItem
                  key={link.path}
                  {...link}
                  active={location.pathname === link.path}
                />
              ))}
            </VStack>
          </Box>
          <Box flexShrink={0}>
            <SidebarUserProfile user={user} onLogout={handleLogout} />
          </Box>
        </VStack>
      </Box>

      {/* ─── Main Content Area ─── */}
      <Box ml={{ base: 0, lg: SIDEBAR_WIDTH }} transition="margin 0.3s">
        {/* ─── Top Navbar ─── */}
        <Flex
          as="header"
          h="60px"
          bg="bg.panel/90"
          backdropFilter="blur(16px)"
          borderBottom="1px solid"
          borderColor="border.muted"
          px={{ base: 4, md: 8 }}
          align="center"
          justify="space-between"
          position="sticky"
          top="0"
          zIndex="90"
        >
          {/* Left side */}
          <HStack gap={3}>
            <IconButton
              display={{ base: "flex", lg: "none" }}
              variant="ghost"
              onClick={toggleMobileMenu}
              aria-label="Open menu"
              size="sm"
              borderRadius="lg"
            >
              <LuMenu />
            </IconButton>

            {/* Always available: the target is a fixed route, not history. */}
            <IconButton
              variant="ghost"
              onClick={goHome}
              aria-label="Back to home"
              title="Back to home"
              size="sm"
              borderRadius="lg"
              color="fg.muted"
              _hover={{ color: "fg", bg: "blue.50", _dark: { bg: "whiteAlpha.100" } }}
            >
              <LuArrowLeft />
            </IconButton>
          </HStack>

          {/* Right side */}
          <HStack gap={1}>
            <ColorModeButton />

            <Box position="relative">
              <IconButton
                variant="ghost"
                aria-label="Notifications"
                color="fg.muted"
                size="sm"
                borderRadius="lg"
                // Every role gets a notification inbox under its dashboard;
                // an unknown role still leaves the control inert.
                disabled={!notificationsPath}
                _hover={{ color: "fg", bg: "blue.50", _dark: { bg: "whiteAlpha.100" } }}
                onClick={() => notificationsPath && navigate(notificationsPath)}
              >
                <LuBell />
              </IconButton>
              {unreadCount > 0 && (
              <Badge
                position="absolute"
                top="1"
                right="1"
                size="xs"
                colorPalette="red"
                variant="solid"
                borderRadius="full"
                minW="16px"
                h="16px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="2xs"
              >
                { unreadCount }
              </Badge>
              )}
            </Box>

            <HStack
              gap={2}
              ml={2}
              pl={3}
              borderLeft="1px solid"
              borderColor="border.muted"
              display={{ base: "none", md: "flex" }}
              cursor={profilePath ? "pointer" : "default"}
              title={profilePath ? "View profile" : undefined}
              onClick={openProfile}
            >
              <VStack gap={0} align="end">
                <Text fontSize="sm" fontWeight="semibold" lineHeight="1.2">
                  {user?.username || "User"}
                </Text>
                <Text fontSize="xs" color="fg.muted" lineHeight="1.2">
                  {user?.role || "Member"}
                </Text>
              </VStack>
              <Avatar.Root size="sm">
                {user?.profilePicture && (
                  <Avatar.Image src={profileImageUrl(user.profilePicture)} />
                )}
                <Avatar.Fallback
                  name={user?.username}
                  fontWeight="semibold"
                  fontSize="xs"
                />
              </Avatar.Root>
            </HStack>

            <Box
              display={{ base: "block", md: "none" }}
              cursor={profilePath ? "pointer" : "default"}
              title={profilePath ? "View profile" : undefined}
              onClick={openProfile}
            >
              <Avatar.Root size="sm">
                {user?.profilePicture && (
                  <Avatar.Image src={profileImageUrl(user.profilePicture)} />
                )}
                <Avatar.Fallback
                  name={user?.username}
                  color="white"
                  fontWeight="semibold"
                  fontSize="xs"
                />
              </Avatar.Root>
            </Box>
          </HStack>
        </Flex>

        {/* ─── Page Content ─── */}
        <Box p={{ base: 4, md: 6, lg: 8 }} mx="auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}