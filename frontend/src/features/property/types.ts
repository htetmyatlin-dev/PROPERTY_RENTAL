import type { IUser } from "../auth/types";

export interface IPropertyFormSlice {
  currentStep: number;
  totalSteps: number;

  nextStep: () => void;
  prevStep: () => void;
  resetStep: () => void;
}

export interface IProperty {
  id: string;
  title: string;
  description: string;
  baseRentPrice: number;
  beds: number;
  baths: number;
  area: number;
  propertyType: string;
  status: string;
  locationAddress?: string;
  coordinates: [number, number];
  images: string[];
  nearTransitType?: string;
  nearTransitDist?: number;
  parkingSpaces: number;
  rating: number;
  yearBuilt?: number;
  petAllowed: boolean;
  appliances?: string[];
  availableDate: string;
  internetName?: string;
  internetSpeed?: string;
  leaseTermMonths: number;
  user: IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWishlistProperty {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  baseRentPrice: number;
  beds: number | null;
  baths: number | null;
  area: number | null;
  propertyType: string;
  status: string;
  locationAddress?: string | null;
  coordinates: number[];
  images: string[];
  nearTransitType?: string | null;
  nearTransitDist?: number | null;
  parkingSpaces: number;
  yearBuilt?: number | null;
  petAllowed: boolean;
  appliances: string[];
  availableDate?: string | null;
  internetName?: string | null;
  internetSpeed?: string | null;
  leaseTermMonths?: number | null;
  createdAt: string;
  updatedAt: string;
  landlord: {
    id: string;
    username: string;
    profilePicture: string | null;
  };
}

export interface IWishlistItem {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
  property: IWishlistProperty;
}

export interface IWishlistResponse {
  wishlist: IWishlistItem[];
}
