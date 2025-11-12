// Service for Grades Collection
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
import type { Grade } from "@/types";

const COLLECTION_NAME = "grades";

const convertTimestamp = (data: any): Grade => {
  return {
    ...data,
    date: data.date?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Grade;
};

// Get all grades
export const getAllGrades = async (): Promise<Grade[]> => {
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
    console.error("❌ Error getting all grades:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    // Check if index is required
    if (error.code === "failed-precondition") {
      console.warn("⚠️ Index required! Using fallback method (without orderBy)...");
      console.warn("   To improve performance, create a single-field index in Firestore:");
      console.warn("   Collection: grades");
      console.warn("   Field: createdAt (descending)");
      
      // Fallback: try without orderBy
      console.log("🔄 Fetching grades without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackGrades = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackGrades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackGrades.length} grades using fallback method (sorted manually)`);
        console.log("   Note: Consider creating the index for better performance.");
        return fallbackGrades;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get grades by teacher ID
export const getGradesByTeacher = async (teacherId: string): Promise<Grade[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting grades by teacher:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching grades without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("teacherId", "==", teacherId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackGrades = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackGrades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackGrades.length} grades using fallback method (sorted manually)`);
        return fallbackGrades;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get grades by class ID
export const getGradesByClass = async (classId: string): Promise<Grade[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("classId", "==", classId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting grades by class:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching grades without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("classId", "==", classId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackGrades = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackGrades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackGrades.length} grades using fallback method (sorted manually)`);
        return fallbackGrades;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get grades by student ID
export const getGradesByStudent = async (studentId: string): Promise<Grade[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting grades by student:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching grades without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("studentId", "==", studentId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackGrades = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackGrades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackGrades.length} grades using fallback method (sorted manually)`);
        return fallbackGrades;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get grades by student ID and class ID
export const getGradesByStudentAndClass = async (studentId: string, classId: string): Promise<Grade[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("studentId", "==", studentId),
      where("classId", "==", classId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting grades by student and class:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Fetching grades without orderBy (fallback mode)...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("studentId", "==", studentId),
          where("classId", "==", classId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackGrades = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by createdAt
        fallbackGrades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Successfully loaded ${fallbackGrades.length} grades using fallback method (sorted manually)`);
        return fallbackGrades;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Add a grade
export const addGrade = async (gradeData: Omit<Grade, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  try {
    console.log("📝 Adding grade to Firestore...");
    console.log("   Grade data:", gradeData);
    
    const now = Timestamp.now();
    const gradeDoc: any = {
      studentId: gradeData.studentId,
      classId: gradeData.classId,
      subject: gradeData.subject,
      teacherId: gradeData.teacherId,
      score: gradeData.score,
      maxScore: gradeData.maxScore,
      percentage: gradeData.percentage,
      type: gradeData.type,
      date: gradeData.date ? Timestamp.fromDate(gradeData.date) : now,
      createdAt: now,
      updatedAt: now,
    };
    
    // Only add optional fields if they exist
    if (gradeData.notes !== undefined && gradeData.notes !== null && gradeData.notes !== "") {
      gradeDoc.notes = gradeData.notes;
    }
    
    console.log("   Grade data with timestamps:", gradeDoc);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), gradeDoc);
    
    console.log(`✅ Grade added successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error: any) {
    console.error("❌ Error adding grade:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
      console.error("   Make sure admins can write to 'grades' collection.");
    }
    
    throw error;
  }
};

// Update a grade
export const updateGrade = async (id: string, gradeData: Partial<Omit<Grade, "id" | "createdAt">>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    // Only add fields that are defined (Firestore doesn't accept undefined)
    if (gradeData.studentId !== undefined) {
      updateData.studentId = gradeData.studentId;
    }
    if (gradeData.classId !== undefined) {
      updateData.classId = gradeData.classId;
    }
    if (gradeData.subject !== undefined) {
      updateData.subject = gradeData.subject;
    }
    if (gradeData.teacherId !== undefined) {
      updateData.teacherId = gradeData.teacherId;
    }
    if (gradeData.score !== undefined) {
      updateData.score = gradeData.score;
    }
    if (gradeData.maxScore !== undefined) {
      updateData.maxScore = gradeData.maxScore;
    }
    if (gradeData.percentage !== undefined) {
      updateData.percentage = gradeData.percentage;
    }
    if (gradeData.type !== undefined) {
      updateData.type = gradeData.type;
    }
    if (gradeData.date !== undefined) {
      updateData.date = gradeData.date ? Timestamp.fromDate(gradeData.date) : Timestamp.now();
    }
    if (gradeData.notes !== undefined) {
      updateData.notes = gradeData.notes || null;
    }
    
    await updateDoc(docRef, updateData);
    console.log(`✅ Grade updated successfully: ${id}`);
  } catch (error: any) {
    console.error("❌ Error updating grade:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

// Delete a grade
export const deleteGrade = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`✅ Grade deleted successfully: ${id}`);
  } catch (error) {
    console.error("Error deleting grade:", error);
    throw error;
  }
};

// Real-time listener for grades by teacher
export const subscribeToGradesByTeacher = (
  teacherId: string,
  callback: (grades: Grade[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const grades = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually if needed
        grades.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`🔄 Real-time update: ${grades.length} grades for teacher`);
        callback(grades);
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






