export * from "./api-error";
export * from "./auth";
export * from "./cart";
export * from "./order";

export interface FoodBasic {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  status: number;
  cook_time: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodImage {
  id: string;
  url: string;
  foodId?: string;
  nextImageId?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodImage {
  id: string;
  url: string;
}

/** Mirrors the API's FoodBasicDto, returned by the admin availability toggle. */
export interface FoodSummary {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  status: number;
  cook_time: number;
}

export interface Food {
  id: string;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  status: number;
<<<<<<< HEAD
  cookTime?: number;
=======
  cook_time: number;
>>>>>>> bea23d3 (feat: entity with cook time)
  categories: Category[];
  images?: FoodImage[];
  createdAt: string;
  updatedAt: string;
}