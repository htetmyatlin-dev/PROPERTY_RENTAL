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
  Skeleton,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  LuBath,
  LuBed,
  LuBuilding2,
  LuHeart,
  LuMapPin,
  LuRefreshCw,
  LuSquare,
  LuTrash2,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useGetWishlist } from "../hooks/useGetWishlist";
import { useRemoveFromWishlist } from "../hooks/useRemoveFromWishlist";
import type { IWishlistItem, IWishlistProperty } from "../types";
import { getApiErrorMessage } from "@/utils/api-error";
import { formatCurrency } from "@/utils/format-currency";

const propertyImageUrl = (image: string) =>
  `${import.meta.env.VITE_FILE_URL}/property-images/${image}`;

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "green",
  RENTED: "blue",
  RESERVED: "orange",
};

function WishlistCard({
  item,
  onRemove,
  removing,
}: {
  item: IWishlistItem;
  onRemove: (propertyId: string) => void;
  removing: boolean;
}) {
  const navigate = useNavigate();
  const property: IWishlistProperty = item.property;
  const image = property.images?.[0];

  return (
    <Box
      bg="bg.panel"
      border="1px solid"
      borderColor="border.muted"
      borderRadius="2xl"
      overflow="hidden"
      transition="all 0.2s ease"
      _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
    >
      <Box position="relative" h="48" bg="bg.subtle">
        {image ? (
          <Image
            src={propertyImageUrl(image)}
            alt={property.title}
            w="full"
            h="full"
            objectFit="cover"
          />
        ) : (
          <Center h="full" color="fg.muted">
            <Icon as={LuBuilding2} boxSize={9} />
          </Center>
        )}

        <Flex position="absolute" top="3" left="3" right="3" justify="space-between" align="flex-start">
          <Badge
            colorPalette={STATUS_BADGE[property.status] ?? "gray"}
            variant="solid"
            size="sm"
            borderRadius="full"
            px="2.5"
          >
            {property.status}
          </Badge>
          <Button
            size="xs"
            variant="solid"
            colorPalette="red"
            borderRadius="full"
            loading={removing}
            onClick={() => onRemove(property.id)}
            aria-label="Remove from wishlist"
          >
            <LuTrash2 />
          </Button>
        </Flex>
      </Box>

      <Box p="4">
        <Flex justify="space-between" align="flex-start" gap="2">
          <Box minW={0} flex="1">
            <Text
              fontWeight="semibold"
              fontSize="md"
              lineClamp={1}
              cursor="pointer"
              _hover={{ color: "blue.600", textDecoration: "underline" }}
              onClick={() => navigate(`/properties/${property.id}`)}
            >
              {property.title}
            </Text>
            {property.locationAddress && (
              <HStack gap="1" color="fg.muted" mt="1">
                <LuMapPin size={11} />
                <Text fontSize="xs" lineClamp={1}>
                  {property.locationAddress}
                </Text>
              </HStack>
            )}
          </Box>
          <Badge variant="subtle" colorPalette="blue" borderRadius="full" size="sm" flexShrink={0}>
            {property.propertyType}
          </Badge>
        </Flex>

        {property.description && (
          <Text fontSize="xs" color="fg.muted" mt="2" lineClamp={2}>
            {property.description}
          </Text>
        )}

        <HStack gap="3" color="fg.muted" mt="3" wrap="wrap">
          {property.beds != null && (
            <HStack gap="1">
              <LuBed size={13} />
              <Text fontSize="xs">{property.beds} beds</Text>
            </HStack>
          )}
          {property.baths != null && (
            <HStack gap="1">
              <LuBath size={13} />
              <Text fontSize="xs">{property.baths} baths</Text>
            </HStack>
          )}
          {property.area != null && (
            <HStack gap="1">
              <LuSquare size={13} />
              <Text fontSize="xs">{property.area.toLocaleString()} sqft</Text>
            </HStack>
          )}
        </HStack>

        <Flex align="center" justify="space-between" gap="3" mt="4">
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="fg" fontVariantNumeric="tabular-nums">
              {formatCurrency(property.baseRentPrice)}
            </Text>
            <Text fontSize="2xs" color="fg.muted">
              per month
            </Text>
          </Box>
          <Button
            size="sm"
            variant="subtle"
            colorPalette="blue"
            borderRadius="lg"
            onClick={() => navigate(`/properties/${property.id}`)}
          >
            View property
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}

function WishlistSkeleton() {
  return (
    <Box bg="bg.panel" border="1px solid" borderColor="border.muted" borderRadius="2xl" overflow="hidden">
      <Skeleton h="48" />
      <Box p="4">
        <Skeleton h="4" mb="2" />
        <Skeleton h="3" w="60%" mb="4" />
        <Skeleton h="8" />
      </Box>
    </Box>
  );
}

export function WishlistPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useGetWishlist();
  const { mutate: removeFromWishlist, isPending: isRemoving, variables } = useRemoveFromWishlist();

  const items = data?.content?.wishlist ?? [];
  const navigate = useNavigate();

  return (
    <Stack gap="6">
      <Flex alignItems={{ base: "start", md: "center" }} justify="space-between" gap="4" wrap="wrap">
        <Box>
          <HStack gap="2">
            <Icon as={LuHeart} color="pink.500" boxSize={5} fill="currentColor" />
            <Text fontSize="xl" fontWeight="bold" color="fg">
              My Wishlist
            </Text>
            <Badge colorPalette="pink" variant="subtle" borderRadius="full" px="2">
              {items.length}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="fg.muted" mt="0.5">
            Properties you saved for later. Remove one any time.
          </Text>
        </Box>
        <HStack gap="2">
          <Button size="sm" variant="outline" borderRadius="lg" loading={isFetching} onClick={() => refetch()}>
            <LuRefreshCw />
            Refresh
          </Button>
          <Button size="sm" colorPalette="blue" borderRadius="lg" onClick={() => navigate("/properties")}>
            Browse properties
          </Button>
        </HStack>
      </Flex>

      {isPending ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }} gap={4}>
          {Array.from({ length: 3 }).map((_, index) => (
            <WishlistSkeleton key={index} />
          ))}
        </Grid>
      ) : isError ? (
        <Center minH="30vh" borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={8}>
          <VStack gap={3}>
            <Text color="red.500" fontSize="sm" textAlign="center">
              {getApiErrorMessage(error, "Could not load your wishlist")}
            </Text>
            <Button size="sm" variant="outline" borderRadius="lg" onClick={() => refetch()}>
              Try again
            </Button>
          </VStack>
        </Center>
      ) : items.length === 0 ? (
        <Center borderWidth="1px" borderColor="border.muted" borderRadius="xl" py="14" px="6" bg="bg.panel">
          <VStack gap={3}>
            <Flex align="center" justify="center" boxSize="14" borderRadius="2xl" bg="pink.50" _dark={{ bg: "pink.950" }}>
              <Icon as={LuHeart} boxSize={6} color="pink.500" />
            </Flex>
            <Text fontWeight="semibold" color="fg">
              Your wishlist is empty
            </Text>
            <Text fontSize="sm" color="fg.muted" textAlign="center" maxW="sm">
              Tap the heart on any property to save it here and compare your options later.
            </Text>
            <Button size="sm" colorPalette="blue" borderRadius="lg" onClick={() => navigate("/properties")}>
              Find a property
            </Button>
          </VStack>
        </Center>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }} gap={4}>
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={removeFromWishlist}
              removing={isRemoving && variables === item.propertyId}
            />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
