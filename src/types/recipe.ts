export interface Ingredient {
  id: string;
  text: string;
  checked: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  sourceUrl: string;
  servings: string;
  cookTime: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RecipeFormData = Omit<Recipe, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export interface ScrapedData {
  title?: string;
  image?: string;
  ingredients?: string[];
  instructions?: string[];
  servings?: string;
  cookTime?: string;
}
