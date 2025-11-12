// Service for Students Collection
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
  Timestamp,
  setDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Student } from "@/types";

const COLLECTION_NAME = "students";

const convertTimestamp = (data: any): Student => {
  // Helper function to safely convert Firestore Timestamp to Date
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    // If it's already a Date object, return it
    if (timestamp instanceof Date) return timestamp;
    // If it has toDate method (Firestore Timestamp), use it
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    // If it's a number (timestamp in milliseconds), convert it
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  };

  return {
    ...data,
    dateOfBirth: toDate(data.dateOfBirth),
    createdAt: toDate(data.createdAt) || new Date(),
    updatedAt: toDate(data.updatedAt) || new Date(),
  } as Student;
};

export const getAllStudents = async (): Promise<Student[]> => {
  try {
    console.log("📥 Fetching students from Firestore...");
    // Using single-field index for createdAt (no composite index needed)
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const students = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
    
    // Sort by createdAt in descending order (fallback if index is not available)
    students.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
    
    console.log(`✅ Loaded ${students.length} students successfully`);
    return students;
  } catch (error: any) {
    console.error("❌ Error getting students:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    // Check for specific Firestore errors
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
      console.error("   Make sure authenticated users can read 'students' collection.");
    } else if (error.code === "failed-precondition") {
      console.error("⚠️ Index required! Please create a single-field index in Firestore.");
      console.error("   Collection: students");
      console.error("   Field: createdAt (descending)");
      console.error("   Go to Firebase Console → Firestore Database → Indexes");
      console.error("   Or use the link provided in the error message.");
      
      // Fallback: try without orderBy
      console.log("🔄 Trying to fetch without orderBy...");
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackStudents = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually
        fallbackStudents.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Loaded ${fallbackStudents.length} students without index`);
        return fallbackStudents;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error; // Throw original error
      }
    }
    
    throw error;
  }
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamp(docSnap.data()),
      } as Student;
    }
    return null;
  } catch (error) {
    console.error("Error getting student:", error);
    throw error;
  }
};

export const getStudentsByParentId = async (parentId: string): Promise<Student[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("parentId", "==", parentId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting students by parent:", error);

    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching students by parent without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("parentId", "==", parentId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        return fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }

    throw error;
  }
};

interface AddStudentOptions {
  id?: string;
  authId?: string;
}

export const addStudent = async (
  student: Omit<Student, "id" | "createdAt" | "updatedAt">,
  options: AddStudentOptions = {}
): Promise<string> => {
  try {
    console.log("📝 Adding student to Firestore...");
    console.log("   Student data:", student);
    
    const now = Timestamp.now();
    const studentData: any = {
      name: student.name,
      email: student.email.trim().toLowerCase(),
      grade: student.grade,
      status: student.status,
      createdAt: now,
      updatedAt: now,
    };

    if (options.authId) {
      studentData.authId = options.authId;
    }
    
    // Only add dateOfBirth if it exists (Firestore doesn't accept undefined)
    if (student.dateOfBirth) {
      studentData.dateOfBirth = Timestamp.fromDate(student.dateOfBirth);
    }
    
    // Add optional fields only if they exist
    if (student.phone) {
      studentData.phone = student.phone;
    }
    if (student.address) {
      studentData.address = student.address;
    }
    if (student.parentId) {
      studentData.parentId = student.parentId;
    }
    
    console.log("   Student data with timestamps:", studentData);
    
    if (options.id) {
      const studentDocRef = doc(db, COLLECTION_NAME, options.id);
      await setDoc(studentDocRef, studentData);
      console.log(`✅ Student added successfully with custom ID: ${options.id}`);
      return options.id;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), studentData);
    
    console.log(`✅ Student added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    console.error("❌ Error adding student:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
      console.error("   Make sure admins can write to 'students' collection.");
    }
    
    throw error;
  }
};

export const updateStudent = async (id: string, student: Partial<Omit<Student, "id" | "createdAt">>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    // Only add fields that are defined (Firestore doesn't accept undefined)
    if (student.name !== undefined) {
      updateData.name = student.name;
    }
    if (student.email !== undefined) {
      updateData.email = student.email.trim().toLowerCase();
    }
    if (student.authId !== undefined) {
      updateData.authId = student.authId;
    }
    if (student.grade !== undefined) {
      updateData.grade = student.grade;
    }
    if (student.status !== undefined) {
      updateData.status = student.status;
    }
    
    // Handle dateOfBirth - only add if it's defined
    if (student.dateOfBirth !== undefined) {
      if (student.dateOfBirth === null) {
        // Allow null to remove the field
        updateData.dateOfBirth = null;
      } else if (student.dateOfBirth instanceof Date) {
        updateData.dateOfBirth = Timestamp.fromDate(student.dateOfBirth);
      }
    }
    
    // Handle optional fields
    if (student.phone !== undefined) {
      updateData.phone = student.phone || null;
    }
    if (student.address !== undefined) {
      updateData.address = student.address || null;
    }
    if (student.parentId !== undefined) {
      updateData.parentId = student.parentId || null;
    }
    
    await updateDoc(docRef, updateData);
  } catch (error: any) {
    console.error("❌ Error updating student:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

export const deleteStudent = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
};

export const getStudentsByGrade = async (grade: string): Promise<Student[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("grade", "==", grade),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error) {
    console.error("Error getting students by grade:", error);
    throw error;
  }
};

// Real-time listener for all students
export const subscribeToStudents = (
  callback: (students: Student[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const students = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort by createdAt in descending order
        students.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`🔄 Real-time update: ${students.length} students`);
        callback(students);
      },
      (error) => {
        console.error("❌ Error in real-time listener:", error);
        if (onError) {
          onError(error);
        }
        
        // Fallback: try without orderBy
        if (error.code === "failed-precondition") {
          console.log("🔄 Trying real-time listener without orderBy...");
          const fallbackQuery = query(collection(db, COLLECTION_NAME));
          return onSnapshot(
            fallbackQuery,
            (querySnapshot) => {
              const students = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamp(doc.data()),
              }));
              
              // Sort manually
              students.sort((a, b) => {
                const dateA = a.createdAt?.getTime() || 0;
                const dateB = b.createdAt?.getTime() || 0;
                return dateB - dateA;
              });
              
              callback(students);
            },
            (fallbackError) => {
              console.error("❌ Fallback listener also failed:", fallbackError);
              if (onError) {
                onError(fallbackError);
              }
            }
          );
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


