export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  targetCalories: number;
  targetProtein: number; // grams
  targetCarbs: number;   // grams
  targetFats: number;    // grams
  createdAt: string;
}

export interface FoodScan {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  weightGrams: number;
  imageUrl?: string;
  analysisText: string;
  scannedAt: string;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealLog {
  id: string;
  userId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  weightGrams: number;
  mealType: MealType;
  loggedAt: string; // ISO string
}
