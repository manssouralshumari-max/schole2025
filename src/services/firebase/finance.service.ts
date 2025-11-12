import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  FinancialAccount,
  FinancialAccountStatus,
  FinancialPayment,
  FinancialPaymentMethod,
} from "@/types";

const ACCOUNTS_COLLECTION = "financialAccounts";
const PAYMENTS_SUBCOLLECTION = "payments";

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

const convertAccount = (id: string, data: any): FinancialAccount => ({
  id,
  studentId: data.studentId || "",
  studentName: data.studentName || "",
  grade: data.grade || "",
  currency: data.currency || "SAR",
  totalTuition: Number(data.totalTuition ?? 0),
  totalPaid: Number(data.totalPaid ?? 0),
  monthlyInstallment: Number(data.monthlyInstallment ?? 0),
  installmentCount: Number(data.installmentCount ?? 0),
  planStartDate: data.planStartDate ? toDate(data.planStartDate) : new Date(),
  nextDueDate: data.nextDueDate ? toDate(data.nextDueDate) : new Date(),
  status: (data.status as FinancialAccountStatus) || "onTrack",
  notes: data.notes || "",
  createdAt: data.createdAt ? toDate(data.createdAt) : new Date(),
  updatedAt: data.updatedAt ? toDate(data.updatedAt) : new Date(),
});

const convertPayment = (accountId: string, id: string, data: any): FinancialPayment => ({
  id,
  accountId,
  amount: Number(data.amount ?? 0),
  method: (data.method as FinancialPaymentMethod) || "Cash",
  paymentDate: data.paymentDate ? toDate(data.paymentDate) : new Date(),
  note: data.note || "",
  createdBy: data.createdBy,
  createdAt: data.createdAt ? toDate(data.createdAt) : new Date(),
  updatedAt: data.updatedAt ? toDate(data.updatedAt) : new Date(),
});

const determineStatus = ({
  totalTuition,
  totalPaid,
  nextDueDate,
}: {
  totalTuition: number;
  totalPaid: number;
  nextDueDate: Date;
}): FinancialAccountStatus => {
  if (totalPaid >= totalTuition) {
    return "settled";
  }
  const now = new Date();
  if (nextDueDate < now) {
    return "overdue";
  }
  return "onTrack";
};

export const subscribeToFinancialAccounts = (
  callback: (accounts: FinancialAccount[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const accounts = snapshot.docs.map((docSnapshot) => convertAccount(docSnapshot.id, docSnapshot.data()));
      callback(accounts);
    },
    (error) => {
      console.error("❌ Error in financial accounts listener:", error);
      if (onError) onError(error as unknown as Error);
    }
  );
};

export const getFinancialAccountById = async (accountId: string): Promise<FinancialAccount | null> => {
  const ref = doc(db, ACCOUNTS_COLLECTION, accountId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return convertAccount(snapshot.id, snapshot.data());
};

export interface CreateFinancialAccountInput {
  id?: string;
  studentId: string;
  studentName: string;
  grade: string;
  currency?: string;
  totalTuition: number;
  monthlyInstallment: number;
  installmentCount: number;
  planStartDate: Date;
  nextDueDate?: Date;
  notes?: string;
  totalPaid?: number;
}

export const createFinancialAccount = async (input: CreateFinancialAccountInput): Promise<string> => {
  const now = serverTimestamp();
  const accountData = {
    studentId: input.studentId,
    studentName: input.studentName,
    grade: input.grade,
    currency: input.currency || "SAR",
    totalTuition: Number(input.totalTuition || 0),
    totalPaid: Number(input.totalPaid || 0),
    monthlyInstallment: Number(input.monthlyInstallment || 0),
    installmentCount: Number(input.installmentCount || 0),
    planStartDate: Timestamp.fromDate(input.planStartDate),
    nextDueDate: Timestamp.fromDate(input.nextDueDate || input.planStartDate),
    status: determineStatus({
      totalTuition: Number(input.totalTuition || 0),
      totalPaid: Number(input.totalPaid || 0),
      nextDueDate: input.nextDueDate || input.planStartDate,
    }),
    notes: input.notes || "",
    createdAt: now,
    updatedAt: now,
  };

  if (input.id) {
    await setDoc(doc(db, ACCOUNTS_COLLECTION, input.id), accountData, { merge: true });
    return input.id;
  }

  const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), accountData);
  return docRef.id;
};

export interface UpdateFinancialAccountInput {
  studentName?: string;
  grade?: string;
  currency?: string;
  totalTuition?: number;
  totalPaid?: number;
  monthlyInstallment?: number;
  installmentCount?: number;
  planStartDate?: Date;
  nextDueDate?: Date;
  status?: FinancialAccountStatus;
  notes?: string;
}

export const updateFinancialAccount = async (accountId: string, input: UpdateFinancialAccountInput): Promise<void> => {
  const ref = doc(db, ACCOUNTS_COLLECTION, accountId);
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.studentName !== undefined) updateData.studentName = input.studentName;
  if (input.grade !== undefined) updateData.grade = input.grade;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.totalTuition !== undefined) updateData.totalTuition = Number(input.totalTuition);
  if (input.totalPaid !== undefined) updateData.totalPaid = Number(input.totalPaid);
  if (input.monthlyInstallment !== undefined) updateData.monthlyInstallment = Number(input.monthlyInstallment);
  if (input.installmentCount !== undefined) updateData.installmentCount = Number(input.installmentCount);
  if (input.planStartDate !== undefined) updateData.planStartDate = Timestamp.fromDate(input.planStartDate);
  if (input.nextDueDate !== undefined) updateData.nextDueDate = Timestamp.fromDate(input.nextDueDate);
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.totalTuition !== undefined || input.totalPaid !== undefined || input.nextDueDate !== undefined) {
    const snapshot = await getDoc(ref);
    const data = snapshot.data() || {};
    const totalTuition = input.totalTuition !== undefined ? Number(input.totalTuition) : Number(data.totalTuition ?? 0);
    const totalPaid = input.totalPaid !== undefined ? Number(input.totalPaid) : Number(data.totalPaid ?? 0);
    const nextDueDate =
      input.nextDueDate !== undefined
        ? input.nextDueDate
        : data.nextDueDate
        ? toDate(data.nextDueDate)
        : new Date();

    updateData.status = determineStatus({
      totalTuition,
      totalPaid,
      nextDueDate,
    });
  }

  await updateDoc(ref, updateData);
};

export const addPaymentToAccount = async (accountId: string, payment: {
  amount: number;
  method: FinancialPaymentMethod;
  paymentDate: Date;
  note?: string;
  createdBy?: string;
}): Promise<void> => {
  const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
  await runTransaction(db, async (transaction) => {
    const accountSnapshot = await transaction.get(accountRef);
    if (!accountSnapshot.exists()) {
      throw new Error("Account does not exist");
    }

    const accountData = accountSnapshot.data() || {};
    const totalTuition = Number(accountData.totalTuition ?? 0);
    const existingTotalPaid = Number(accountData.totalPaid ?? 0);
    const nextDueDate = accountData.nextDueDate ? toDate(accountData.nextDueDate) : new Date();
    const monthlyInstallment = Number(accountData.monthlyInstallment ?? 0);

    const newTotalPaid = existingTotalPaid + Number(payment.amount || 0);
    const updatedNextDueDate =
      newTotalPaid >= totalTuition
        ? nextDueDate
        : new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, nextDueDate.getDate());

    const updatedStatus = determineStatus({
      totalTuition,
      totalPaid: newTotalPaid,
      nextDueDate: updatedNextDueDate,
    });

    const paymentsRef = collection(accountRef, PAYMENTS_SUBCOLLECTION);
    transaction.set(doc(paymentsRef), {
      amount: Number(payment.amount || 0),
      method: payment.method,
      paymentDate: Timestamp.fromDate(payment.paymentDate),
      note: payment.note || "",
      createdBy: payment.createdBy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(accountRef, {
      totalPaid: newTotalPaid,
      nextDueDate: updatedNextDueDate ? Timestamp.fromDate(updatedNextDueDate) : Timestamp.fromDate(new Date()),
      status: updatedStatus,
      updatedAt: serverTimestamp(),
      lastPaymentAmount: Number(payment.amount || 0),
      lastPaymentDate: Timestamp.fromDate(payment.paymentDate),
      monthlyInstallment: monthlyInstallment || Number(payment.amount || 0),
    });
  });
};

export const getPaymentsByAccount = async (accountId: string): Promise<FinancialPayment[]> => {
  const paymentsRef = collection(db, ACCOUNTS_COLLECTION, accountId, PAYMENTS_SUBCOLLECTION);
  const q = query(paymentsRef, orderBy("paymentDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => convertPayment(accountId, docSnapshot.id, docSnapshot.data()));
};

export const subscribeToPaymentsByAccount = (
  accountId: string,
  callback: (payments: FinancialPayment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const paymentsRef = collection(db, ACCOUNTS_COLLECTION, accountId, PAYMENTS_SUBCOLLECTION);
  const q = query(paymentsRef, orderBy("paymentDate", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const payments = snapshot.docs.map((docSnapshot) => convertPayment(accountId, docSnapshot.id, docSnapshot.data()));
      callback(payments);
    },
    (error) => {
      console.error("❌ Error in payments listener:", error);
      if (onError) onError(error as unknown as Error);
    }
  );
};

export const subscribeToAllPayments = (
  callback: (payments: FinancialPayment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(collectionGroup(db, PAYMENTS_SUBCOLLECTION), orderBy("paymentDate", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const payments: FinancialPayment[] = snapshot.docs.map((docSnapshot) => {
        const parentAccountId = docSnapshot.ref.parent.parent?.id || "";
        return convertPayment(parentAccountId, docSnapshot.id, docSnapshot.data());
      });
      callback(payments);
    },
    (error) => {
      console.error("❌ Error in payments collection group listener:", error);
      if (onError) onError(error as unknown as Error);
    }
  );
};

export const getPaymentsByMonth = async (year: number, month: number): Promise<FinancialPayment[]> => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);
  const q = query(
    collectionGroup(db, PAYMENTS_SUBCOLLECTION),
    where("paymentDate", ">=", Timestamp.fromDate(startDate)),
    where("paymentDate", "<", Timestamp.fromDate(endDate)),
    orderBy("paymentDate", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => {
    const parentAccountId = docSnapshot.ref.parent.parent?.id || "";
    return convertPayment(parentAccountId, docSnapshot.id, docSnapshot.data());
  });
};

