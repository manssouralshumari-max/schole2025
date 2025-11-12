import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User as AppUser } from "@/types";

const COLLECTION_NAME = "users";

export interface UserProfileInput {
  uid: string;
  email: string;
  displayName: string;
  role: AppUser["role"];
}

export const createUserProfile = async ({ uid, email, displayName, role }: UserProfileInput) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  const now = Timestamp.now();

  await setDoc(userRef, {
    email: email.trim().toLowerCase(),
    displayName,
    role,
    createdAt: now,
    updatedAt: now,
  });
};

export const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfileInput, "uid">>) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.email !== undefined) {
    updateData.email = data.email.trim().toLowerCase();
  }
  if (data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }

  await updateDoc(userRef, updateData);
};

export const deleteUserProfile = async (uid: string) => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  await deleteDoc(userRef);
};

export const getUserProfile = async (uid: string): Promise<AppUser | null> => {
  const userRef = doc(db, COLLECTION_NAME, uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    uid: snapshot.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as AppUser;
};





