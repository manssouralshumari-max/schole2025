// Service for Enrollments Collection
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Enrollment } from "@/types";

const COLLECTION_NAME = "enrollments";

const convertTimestamp = (data: any): Enrollment => {
  return {
    ...data,
    enrolledAt: data.enrolledAt?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Enrollment;
};

// Get all enrollments
export const getAllEnrollments = async (): Promise<Enrollment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting all enrollments:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching enrollments without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackEnrollments = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackEnrollments.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackEnrollments.length} enrollments using fallback method (sorted manually)`);
        return fallbackEnrollments;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get enrollments by class ID
export const getEnrollmentsByClass = async (classId: string): Promise<Enrollment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("classId", "==", classId),
      where("status", "==", "Active"),
      orderBy("enrolledAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting enrollments by class:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching enrollments without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("classId", "==", classId),
          where("status", "==", "Active")
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackEnrollments = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by enrolledAt
        fallbackEnrollments.sort((a, b) => {
          const dateA = a.enrolledAt?.getTime() || 0;
          const dateB = b.enrolledAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackEnrollments.length} enrollments using fallback method (sorted manually)`);
        return fallbackEnrollments;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get enrollments by student ID
export const getEnrollmentsByStudent = async (studentId: string): Promise<Enrollment[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("studentId", "==", studentId),
      where("status", "==", "Active"),
      orderBy("enrolledAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting enrollments by student:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching enrollments without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("studentId", "==", studentId),
          where("status", "==", "Active")
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackEnrollments = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by enrolledAt
        fallbackEnrollments.sort((a, b) => {
          const dateA = a.enrolledAt?.getTime() || 0;
          const dateB = b.enrolledAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackEnrollments.length} enrollments using fallback method (sorted manually)`);
        return fallbackEnrollments;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get student IDs enrolled in a class
export const getStudentIdsByClass = async (classId: string): Promise<string[]> => {
  try {
    const enrollments = await getEnrollmentsByClass(classId);
    return enrollments.map((e) => e.studentId);
  } catch (error: any) {
    console.error("❌ Error getting student IDs by class:", error);
    throw error;
  }
};

// Add an enrollment
export const addEnrollment = async (enrollmentData: Omit<Enrollment, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  try {
    console.log("📝 Adding enrollment to Firestore...");
    console.log("   Enrollment data:", enrollmentData);
    
    const now = Timestamp.now();
    const enrollmentDoc: any = {
      studentId: enrollmentData.studentId,
      classId: enrollmentData.classId,
      enrolledAt: enrollmentData.enrolledAt ? Timestamp.fromDate(enrollmentData.enrolledAt) : now,
      status: enrollmentData.status || "Active",
      createdAt: now,
      updatedAt: now,
    };
    
    console.log("   Enrollment data with timestamps:", enrollmentDoc);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), enrollmentDoc);
    
    console.log(`✅ Enrollment added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    console.error("❌ Error adding enrollment:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
      console.error("   Make sure admins can write to 'enrollments' collection.");
    }
    
    throw error;
  }
};

// Update an enrollment
export const updateEnrollment = async (id: string, enrollmentData: Partial<Omit<Enrollment, "id" | "createdAt">>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    // Only add fields that are defined (Firestore doesn't accept undefined)
    if (enrollmentData.studentId !== undefined) {
      updateData.studentId = enrollmentData.studentId;
    }
    if (enrollmentData.classId !== undefined) {
      updateData.classId = enrollmentData.classId;
    }
    if (enrollmentData.enrolledAt !== undefined) {
      updateData.enrolledAt = enrollmentData.enrolledAt ? Timestamp.fromDate(enrollmentData.enrolledAt) : Timestamp.now();
    }
    if (enrollmentData.status !== undefined) {
      updateData.status = enrollmentData.status;
    }
    
    await updateDoc(docRef, updateData);
    console.log(`✅ Enrollment updated successfully: ${id}`);
  } catch (error: any) {
    console.error("❌ Error updating enrollment:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

// Delete an enrollment
export const deleteEnrollment = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`✅ Enrollment deleted successfully: ${id}`);
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    throw error;
  }
};

// Check if student is enrolled in class
export const isStudentEnrolled = async (studentId: string, classId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("studentId", "==", studentId),
      where("classId", "==", classId),
      where("status", "==", "Active")
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error: any) {
    console.error("❌ Error checking enrollment:", error);
    return false;
  }
};

// Real-time listener for enrollments by class
export const subscribeToEnrollmentsByClass = (
  classId: string,
  callback: (enrollments: Enrollment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("classId", "==", classId),
      where("status", "==", "Active"),
      orderBy("enrolledAt", "desc")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const enrollments = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually if needed
        enrollments.sort((a, b) => {
          const dateA = a.enrolledAt?.getTime() || 0;
          const dateB = b.enrolledAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`🔄 Real-time update: ${enrollments.length} enrollments for class`);
        callback(enrollments);
      },
      (error) => {
        console.error("❌ Error in real-time listener:", error);
        if (onError) {
          onError(error);
        }
      }
    );
    
    return unsubscribe;
  } catch (error: any) {
    console.error("❌ Error setting up real-time listener:", error);
    if (onError) {
      onError(error);
    }
    // Return a no-op unsubscribe function
    return () => {};
  }
};






