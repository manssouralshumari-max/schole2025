import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Accountant } from "@/types";

const COLLECTION_NAME = "accountants";

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

const convertAccountant = (data: any, id: string): Accountant => ({
  id,
  name: data.name || "",
  email: data.email || "",
  nationalId: data.nationalId || "",
  qualification: data.qualification || "",
  startDate: toDate(data.startDate),
  authId: data.authId,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

export const getAllAccountants = async (): Promise<Accountant[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => convertAccountant(docSnapshot.data(), docSnapshot.id));
};

interface AddAccountantOptions {
  id?: string;
  authId?: string;
}

export const addAccountant = async (
  accountant: Omit<Accountant, "id" | "createdAt" | "updatedAt">,
  options: AddAccountantOptions = {}
): Promise<string> => {
  const now = Timestamp.now();
  const accountantData: Record<string, any> = {
    name: accountant.name,
    email: accountant.email.trim().toLowerCase(),
    nationalId: accountant.nationalId,
    qualification: accountant.qualification,
    startDate: accountant.startDate ? Timestamp.fromDate(accountant.startDate) : now,
    createdAt: now,
    updatedAt: now,
  };

  if (accountant.authId) {
    accountantData.authId = accountant.authId;
  }
  if (options.authId) {
    accountantData.authId = options.authId;
  }

  if (options.id) {
    const ref = doc(db, COLLECTION_NAME, options.id);
    await setDoc(ref, accountantData);
    return options.id;
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), accountantData);
  return docRef.id;
};

export const updateAccountant = async (
  id: string,
  accountant: Partial<Omit<Accountant, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id);
  const updateData: Record<string, any> = {
    updatedAt: Timestamp.now(),
  };

  if (accountant.name !== undefined) updateData.name = accountant.name;
  if (accountant.email !== undefined) updateData.email = accountant.email.trim().toLowerCase();
  if (accountant.nationalId !== undefined) updateData.nationalId = accountant.nationalId;
  if (accountant.qualification !== undefined) updateData.qualification = accountant.qualification;
  if (accountant.startDate !== undefined) {
    updateData.startDate =
      accountant.startDate instanceof Date
        ? Timestamp.fromDate(accountant.startDate)
        : Timestamp.fromDate(new Date(accountant.startDate));
  }
  if (accountant.authId !== undefined) updateData.authId = accountant.authId;

  await updateDoc(ref, updateData);
};

export const deleteAccountant = async (id: string): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id);
  await deleteDoc(ref);
};

export const subscribeToAccountants = (
  callback: (accountants: Accountant[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accountants = snapshot.docs.map((docSnapshot) =>
          convertAccountant(docSnapshot.data(), docSnapshot.id)
        );
        callback(accountants);
      },
      (error) => {
        console.error("❌ Error in accountants listener:", error);
        if (onError) onError(error as unknown as Error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error("❌ Error setting up accountants listener:", error);
    if (onError) onError(error);
    return () => {};
  }
};


