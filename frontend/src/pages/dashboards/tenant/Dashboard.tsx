import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Grid,
  HStack,
  Icon,
  Image,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ElementType, ReactNode } from "react";
import {
  LuBuilding2,
  LuCalendarClock,
  LuFileText,
  LuHeart,
  LuMessageSquare,
  LuRefreshCw,
  LuWallet,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useGetTenantDashboard } from "@/features/dashboard/hooks/useGetTenantDashboard";
import type {
  ITenantRentRequest,
  ITenantRental,
  ITenantVisitBooking,
  ITenantWishlistItem,
} from "@/features/dashboard/types";
import { useDownloadLeaseAgreement } from "@/features/rentrequest/hooks/useDownloadLeaseAgreement";
import { rentRequestStatusMeta } from "@/features/rentrequest/utils/status";
import { bookingStatusMeta } from "@/features/booking/utils/status";
import type { RentRequestStatus } from "@/features/rentrequest/types";
import type { BookingStatus } from "@/features/booking/types";
import { useSocket } from "@/socket/useSocket";
import { useAppStore } from "@/app/store";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatCurrency } from "@/utils/format-currency";
import { formateDate } from "@/utils/format-date";

const propertyImageUrl = (image: string) =>
  `${import.meta.env.VITE_FILE_URL}/property-images/${image}`;

const PROPERTY_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "green",
  RENTED: "blue",
  RESERVED: "orange",
};

const daysUntil = (date: string) =>
  Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

/* ─── Shell: titled panel ─── */
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box bg="bg.panel" borderRadius="xl" border="1px solid" borderColor="border.muted" p={5}>
      <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="fg">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              {subtitle}
            </Text>
          )}
        </Box>
        {action}
      </Flex>
      {children}
    </Box>
  );
}

/* ─── Top summary card ─── */
function StatCard({
  label,
  value,
  hint,
  palette,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  palette: string;
  icon: ElementType;
}) {
  return (
    <Box bg="bg.panel" borderRadius="xl" border="1px solid" borderColor="border.muted" p={4}>
      <HStack justify="space-between" align="flex-start" gap={3} mb={2}>
        <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" fontWeight="semibold">
          {label}
        </Text>
        <Flex
          align="center"
          justify="center"
          boxSize="7"
          borderRadius="lg"
          flexShrink={0}
          bg={`${palette}.50`}
          color={`${palette}.600`}
          _dark={{ bg: `${palette}.950`, color: `${palette}.300` }}
        >
          <Icon as={icon} boxSize={4} />
        </Flex>
      </HStack>
      <Text fontSize="2xl" fontWeight="bold" color="fg" fontVariantNumeric="tabular-nums" lineClamp={1}>
        {value}
      </Text>
      <Text fontSize="xs" color="fg.muted" mt={1}>
        {hint}
      </Text>
    </Box>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Center py={8}>
      <Text fontSize="sm" color="fg.muted" textAlign="center">
        {label}
      </Text>
    </Center>
  );
}

/* ─── Current rental hero card ─── */
function CurrentRentalCard({
  rental,
  onDownload,
  isDownloading,
  onMessage,
}: {
  rental: ITenantRental | null;
  onDownload: () => void;
  isDownloading: boolean;
  onMessage: () => void;
}) {
  if (!rental) {
    return (
      <Box bg="bg.panel" borderRadius="xl" border="1px solid" borderColor="border.muted" p={5}>
        <Text fontSize="sm" fontWeight="semibold" color="fg" mb={4}>
          Current Rental
        </Text>
        <EmptyState label="You have no active lease right now. Browse properties to find your next home." />
        <Center>
          <Button size="sm" borderRadius="lg" colorPalette="blue" onClick={() => (window.location.href = "/properties")}>
            Browse properties
          </Button>
        </Center>
      </Box>
    );
  }

  const remainingDays = daysUntil(rental.endDate);

  return (
    <Box bg="bg.panel" borderRadius="xl" border="1px solid" borderColor="border.muted" overflow="hidden">
      <Flex direction={{ base: "column", md: "row" }}>
        <Box w={{ base: "full", md: "280px" }} h={{ base: "180px", md: "auto" }} flexShrink={0} bg="bg.subtle">
          {rental.propertyImage ? (
            <Image
              src={propertyImageUrl(rental.propertyImage)}
              alt={rental.propertyTitle}
              w="full"
              h="full"
              objectFit="cover"
            />
          ) : (
            <Center h="full" minH="180px" color="fg.muted">
              <Icon as={LuBuilding2} boxSize={8} />
            </Center>
          )}
        </Box>

        <Box flex={1} p={5} minW={0}>
          <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
            <Box minW={0}>
              <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" fontWeight="semibold">
                Current Rental
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="fg" truncate>
                {rental.propertyTitle}
              </Text>
              {rental.locationAddress && (
                <Text fontSize="sm" color="fg.muted" truncate>
                  {rental.locationAddress}
                </Text>
              )}
            </Box>
            <Button size="sm" variant="outline" borderRadius="lg" onClick={onMessage}>
              <LuMessageSquare />
              Message landlord
            </Button>
          </Flex>

          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mt={4}>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                Monthly rent
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="fg" fontVariantNumeric="tabular-nums">
                {formatCurrency(rental.monthlyRent)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                Deposit
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="fg" fontVariantNumeric="tabular-nums">
                {formatCurrency(rental.depositAmount)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                Lease start
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="fg">
                {formateDate(rental.startDate)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="fg.muted">
                Lease end
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="fg">
                {formateDate(rental.endDate)}
              </Text>
            </Box>
          </SimpleGrid>

          <Box mt={4}>
            <Flex justify="space-between" align="center" mb={1.5}>
              <Text fontSize="xs" color="fg.muted">
                {rental.progress.toFixed(0)}% of lease elapsed
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {remainingDays} day{remainingDays === 1 ? "" : "s"} remaining
              </Text>
            </Flex>
            <Progress.Root value={rental.progress} size="sm" colorPalette="blue">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          <HStack mt={4} gap={3} wrap="wrap">
            {rental.hasLease && (
              <Button size="sm" variant="outline" borderRadius="lg" loading={isDownloading} onClick={onDownload}>
                <LuFileText />
                Download lease
              </Button>
            )}
            <Button size="sm" variant="ghost" borderRadius="lg" onClick={() => (window.location.href = "/tenant/rent-requests")}>
              View rent request
            </Button>
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
}

/* ─── Wishlist list ─── */
function WishlistList({ items }: { items: ITenantWishlistItem[] }) {
  const navigate = useNavigate();

  if (items.length === 0) return <EmptyState label="Your wishlist is empty" />;

  return (
    <VStack align="stretch" divideY="1px" borderColor="border.muted">
      {items.map((item) => (
        <HStack
          key={item.id}
          gap={3}
          py={3}
          cursor="pointer"
          onClick={() => navigate(`/properties/${item.propertyId}`)}
        >
          <Box boxSize="44px" borderRadius="lg" overflow="hidden" bg="bg.subtle" flexShrink={0}>
            {item.image ? (
              <Image src={propertyImageUrl(item.image)} alt={item.title} w="full" h="full" objectFit="cover" />
            ) : (
              <Center h="full" color="fg.muted">
                <Icon as={LuBuilding2} boxSize={4} />
              </Center>
            )}
          </Box>
          <Box minW={0} flex={1}>
            <Text fontSize="sm" fontWeight="medium" color="fg" truncate>
              {item.title}
            </Text>
            <HStack gap={1}>
              <Text fontSize="xs" color="fg.muted" truncate>
                {item.propertyType}
              </Text>
              <Badge variant="subtle" colorPalette={PROPERTY_STATUS_BADGE[item.status] ?? "gray"} size="xs" borderRadius="full">
                {item.status}
              </Badge>
            </HStack>
          </Box>
          <Text fontSize="sm" fontWeight="semibold" color="fg" fontVariantNumeric="tabular-nums" flexShrink={0}>
            {formatCurrency(item.baseRentPrice)}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}

/* ─── Visit bookings list ─── */
function BookingList({ items }: { items: ITenantVisitBooking[] }) {
  const navigate = useNavigate();

  if (items.length === 0) return <EmptyState label="No visit bookings yet" />;

  return (
    <VStack align="stretch" divideY="1px" borderColor="border.muted">
      {items.map((item) => {
        const meta = bookingStatusMeta[item.status as BookingStatus] ?? { label: item.status, colorPalette: "gray" };
        const first = item.schedules[0];
        return (
          <HStack
            key={item.id}
            justify="space-between"
            gap={3}
            py={3}
            cursor="pointer"
            onClick={() => navigate("/tenant/bookings")}
          >
            <Box minW={0}>
              <Text fontSize="sm" fontWeight="medium" color="fg" truncate>
                {item.property.title}
              </Text>
              <Text fontSize="xs" color="fg.muted" truncate>
                {first?.date ? formateDate(first.date) : "Schedule pending"}
                {first?.time ? ` · ${first.time}` : ""}
              </Text>
            </Box>
            <Badge variant="subtle" colorPalette={meta.colorPalette} borderRadius="full" size="sm" px={2.5} flexShrink={0}>
              {meta.label}
            </Badge>
          </HStack>
        );
      })}
    </VStack>
  );
}

/* ─── Rent requests list ─── */
function RentRequestList({ items }: { items: ITenantRentRequest[] }) {
  const navigate = useNavigate();

  if (items.length === 0) return <EmptyState label="No rent requests yet" />;

  return (
    <VStack align="stretch" divideY="1px" borderColor="border.muted">
      {items.map((item) => {
        const meta = rentRequestStatusMeta[item.status as RentRequestStatus] ?? { label: item.status, colorPalette: "gray" };
        return (
          <HStack
            key={item.id}
            justify="space-between"
            gap={3}
            py={3}
            cursor="pointer"
            onClick={() => navigate("/tenant/rent-requests")}
          >
            <Box minW={0}>
              <Text fontSize="sm" fontWeight="medium" color="fg" truncate>
                {item.property.title}
              </Text>
              <Text fontSize="xs" color="fg.muted" truncate>
                {formateDate(item.startDate)} · {item.durationMonths}mo
              </Text>
            </Box>
            <HStack gap={2} flexShrink={0}>
              <Text fontSize="sm" fontWeight="semibold" color="fg" fontVariantNumeric="tabular-nums">
                {formatCurrency(item.amount)}
              </Text>
              <Badge variant="subtle" colorPalette={meta.colorPalette} borderRadius="full" size="sm" px={2.5}>
                {meta.label}
              </Badge>
            </HStack>
          </HStack>
        );
      })}
    </VStack>
  );
}

export function Dashboard() {
  const { data, isPending, isError, error, refetch, isFetching } = useGetTenantDashboard();
  const { socket, isConnected } = useSocket();
  const user = useAppStore((s) => s.user);
  const navigate = useNavigate();
  const downloadLease = useDownloadLeaseAgreement();

  if (isPending) {
    return (
      <Center minH="40vh">
        <VStack gap={4}>
          <Spinner color="blue.500" size="xl" borderWidth="3px" />
          <Text color="fg.muted" fontSize="sm">
            Loading dashboard...
          </Text>
        </VStack>
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Center minH="30vh" borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={8}>
        <VStack gap={3}>
          <Text color="red.500" fontSize="sm" textAlign="center">
            {getApiErrorMessage(error, "Could not load the dashboard")}
          </Text>
          <Button size="sm" variant="outline" borderRadius="lg" onClick={() => refetch()}>
            Try again
          </Button>
        </VStack>
      </Center>
    );
  }

  const { cards, rental } = data;

  const messageLandlord = () => {
    if (!rental || !user) return;
    if (!socket || !isConnected) {
      socket?.connect();
      toast.info("Connecting to chat... please click again in a moment.");
      return;
    }
    socket.emit("join_chat", {
      landlordId: rental.landlord.id,
      tenantId: user.id,
      propertyId: rental.propertyId,
    });
    navigate("/tenant/chat");
  };

  return (
    <Stack gap="6">
      <Flex alignItems={{ base: "start", md: "center" }} justify="space-between" gap="4" wrap="wrap">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="fg">
            Welcome back, {user?.username ?? "tenant"}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Your rental, wishlist, bookings, and requests in one place.
          </Text>
        </Box>
        <Button size="sm" variant="outline" borderRadius="lg" loading={isFetching} onClick={() => refetch()}>
          <LuRefreshCw />
          Refresh
        </Button>
      </Flex>

      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }} gap={4}>
        <StatCard
          label="Next Rent Due"
          value={cards.nextRentDue ? formatCurrency(cards.nextRentDue.amount) : "—"}
          hint={cards.nextRentDue ? `Due ${formateDate(cards.nextRentDue.dueDate)}` : "No active lease"}
          palette="blue"
          icon={LuCalendarClock}
        />
        <StatCard
          label="Wishlist"
          value={cards.wishlistCount.toLocaleString()}
          hint="Properties you saved"
          palette="pink"
          icon={LuHeart}
        />
        <StatCard
          label="Wallet Balance"
          value={formatCurrency(cards.walletBalance)}
          hint={`${formatCurrency(data.spending.totalSpent)} spent to date`}
          palette="teal"
          icon={LuWallet}
        />
        <StatCard
          label="Active Requests"
          value={cards.activeRequests.toLocaleString()}
          hint="Rent requests awaiting approval"
          palette="orange"
          icon={LuFileText}
        />
      </Grid>

      <CurrentRentalCard
        rental={rental}
        isDownloading={downloadLease.isPending}
        onDownload={() => rental && downloadLease.mutate(rental.id)}
        onMessage={messageLandlord}
      />

      <Grid templateColumns={{ base: "1fr", xl: "repeat(3, minmax(0, 1fr))" }} gap={4}>
        <Panel
          title="Wishlist"
          subtitle="Recently saved"
          action={
            <HStack gap={1}>
              <Badge colorPalette="pink" variant="subtle" borderRadius="full" size="sm">
                {cards.wishlistCount}
              </Badge>
              <Button size="2xs" variant="ghost" borderRadius="lg" onClick={() => navigate("/tenant/wishlist")}>
                View all
              </Button>
            </HStack>
          }
        >
          <WishlistList items={data.wishlist} />
        </Panel>

        <Panel title="Visit Bookings" subtitle="Your latest requests">
          <BookingList items={data.visitBookings} />
        </Panel>

        <Panel title="Rent Requests" subtitle="Your latest applications">
          <RentRequestList items={data.rentRequests} />
        </Panel>
      </Grid>
    </Stack>
  );
}
