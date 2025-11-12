import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Parent } from "@/types";

const COLLECTION_NAME = "parents";

const convertTimestamp = (data: any): Parent => {
  const toDate = (value: any): Date => {
    if (value instanceof Date) return value;
    if (value?.toDate) return value.toDate();
    if (typeof value === "number") return new Date(value);
    if (typeof value === "string") {
      const parsed = new Date(value);
      return isNaN(parsed.valueOf()) ? new Date() : parsed;
    }
    return new Date();
  };

  return {
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Parent;
};

export const getAllParents = async (): Promise<Parent[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const parents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamp(doc.data()),
  }));

  parents.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return parents;
};

export const getParentById = async (id: string): Promise<Parent | null> => {
  const ref = doc(db, COLLECTION_NAME, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    ...convertTimestamp(snapshot.data()),
  } as Parent;
};

interface AddParentOptions {
  id?: string;
  authId?: string;
}

export const addParent = async (
  parent: Omit<Parent, "id" | "createdAt" | "updatedAt">,
  options: AddParentOptions = {}
): Promise<string> => {
  const now = Timestamp.now();
  const parentData: any = {
    name: parent.name,
    email: parent.email.trim().toLowerCase(),
    phone: parent.phone || "",
    childrenIds: parent.childrenIds || [],
    createdAt: now,
    updatedAt: now,
  };

  if (options.authId) {
    parentData.authId = options.authId;
  }

  if (options.id) {
    const ref = doc(db, COLLECTION_NAME, options.id);
    await setDoc(ref, parentData);
    return options.id;
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), parentData);
  return docRef.id;
};

export const updateParent = async (
  id: string,
  parent: Partial<Omit<Parent, "id" | "createdAt">>
): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id);
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };

  if (parent.name !== undefined) updateData.name = parent.name;
  if (parent.email !== undefined) updateData.email = parent.email.trim().toLowerCase();
  if (parent.phone !== undefined) updateData.phone = parent.phone;
  if (parent.childrenIds !== undefined) updateData.childrenIds = parent.childrenIds;
  if (parent.authId !== undefined) updateData.authId = parent.authId;

  await updateDoc(ref, updateData);
};

export const deleteParent = async (id: string): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id);
  await deleteDoc(ref);
};

export const subscribeToParents = (
  callback: (parents: Parent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        parents.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        callback(parents);
      },
      (error) => {
        console.error("❌ Error in parents listener:", error);
        if (onError) onError(error as unknown as Error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error("❌ Error setting up parents listener:", error);
    if (onError) onError(error);
    return () => {};
  }
};


interface ParentIdentity {
  uid: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
}

export const ensureParentDocument = async ({
  uid,
  email,
  displayName,
  phone,
}: ParentIdentity): Promise<Parent | null> => {
  if (!email) {
    console.warn("ensureParentDocument called without email.");
    return null;
  }

  try {
    const existing = await getParentById(uid);
    if (existing) {
      if (phone && existing.phone !== phone) {
        try {
          await updateParent(uid, { phone });
          return { ...existing, phone };
        } catch (updateError) {
          console.warn("Failed to update parent phone:", updateError);
        }
      }
      return existing;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const fallbackName = displayName?.trim() || normalizedEmail.split("@")[0] || "Parent";

    await addParent(
      {
        name: fallbackName,
        email: normalizedEmail,
        phone: phone || "",
        childrenIds: [],
      },
      {
        id: uid,
        authId: uid,
      }
    );

    return await getParentById(uid);
  } catch (error) {
    console.error("ensureParentDocument error:", error);
    return null;
  }
};


