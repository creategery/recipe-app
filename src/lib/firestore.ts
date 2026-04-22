import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Recipe, RecipeFormData } from '@/types/recipe';

const COL = 'recipes';

export function subscribeToRecipes(callback: (recipes: Recipe[]) => void): () => void {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snapshot => {
    const recipes = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (d.data().updatedAt as Timestamp)?.toDate() ?? new Date(),
    })) as Recipe[];
    callback(recipes);
  });
}

export async function addRecipe(data: RecipeFormData, userId: string): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecipe(id: string, data: Partial<RecipeFormData>): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
