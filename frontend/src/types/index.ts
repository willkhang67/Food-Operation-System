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

export interface Food {
  id: string;
  name: string;
  price: number;
  description: string | null;
  is_available: boolean;
  status: number;
  categories: Category[];
  images?: FoodImage[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}