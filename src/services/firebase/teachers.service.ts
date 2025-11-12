// Service for Teachers Collection
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
import type { Teacher } from "@/types";

const COLLECTION_NAME = "teachers";

// Convert Firestore timestamp to Date
const convertTimestamp = (data: any): Teacher => {
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Teacher;
};

// Get all teachers
export const getAllTeachers = async (): Promise<Teacher[]> => {
  try {
    console.log("📥 Fetching teachers from Firestore...");
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const teachers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
    
    // Sort by createdAt in descending order (fallback if index is not available)
    teachers.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
    
    console.log(`✅ Loaded ${teachers.length} teachers successfully`);
    return teachers;
  } catch (error: any) {
    console.error("❌ Error getting teachers:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
    } else if (error.code === "failed-precondition") {
      console.error("⚠️ Index required! Please create a single-field index in Firestore.");
      console.error("   Collection: teachers");
      console.error("   Field: createdAt (descending)");
      
      // Fallback: try without orderBy
      console.log("🔄 Trying to fetch without orderBy...");
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackTeachers = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually
        fallbackTeachers.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Loaded ${fallbackTeachers.length} teachers without index`);
        return fallbackTeachers;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get teacher by ID
export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamp(docSnap.data()),
      } as Teacher;
    }
    return null;
  } catch (error) {
    console.error("Error getting teacher:", error);
    throw error;
  }
};

// Add new teacher
interface AddTeacherOptions {
  id?: string;
  authId?: string;
}

export const addTeacher = async (
  teacher: Omit<Teacher, "id" | "createdAt" | "updatedAt">,
  options: AddTeacherOptions = {}
): Promise<string> => {
  try {
    const now = Timestamp.now();
    const teacherData = {
      ...teacher,
      email: teacher.email.trim().toLowerCase(),
      ...(options.authId ? { authId: options.authId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    if (options.id) {
      const teacherDocRef = doc(db, COLLECTION_NAME, options.id);
      await setDoc(teacherDocRef, teacherData);
      return options.id;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), teacherData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding teacher:", error);
    throw error;
  }
};

// Get teacher by email (used to link auth users with teacher documents)
export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  try {
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Try normalized email first
    const emailCandidates = [normalizedEmail];
    if (normalizedEmail !== trimmedEmail) {
      emailCandidates.push(trimmedEmail);
    }

    for (const candidate of emailCandidates) {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("email", "==", candidate)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return {
          id: docSnap.id,
          ...convertTimestamp(docSnap.data()),
        } as Teacher;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting teacher by email:", error);
    throw error;
  }
};

interface TeacherIdentity {
  uid: string;
  email: string;
  displayName?: string | null;
}

export const ensureTeacherDocument = async ({
  uid,
  email,
  displayName,
}: TeacherIdentity): Promise<Teacher | null> => {
  if (!email) {
    console.warn("ensureTeacherDocument called without email.");
    return null;
  }

  try {
    const existingByEmail = await getTeacherByEmail(email);
    if (existingByEmail) {
      if (uid && existingByEmail.authId !== uid) {
        try {
          await updateTeacher(existingByEmail.id, { authId: uid } as Partial<Teacher>);
          return { ...existingByEmail, authId: uid };
        } catch (updateError) {
          console.warn("Failed to update teacher authId:", updateError);
        }
      }
      return existingByEmail;
    }

    if (uid) {
      const existingById = await getTeacherById(uid);
      if (existingById) {
        if (existingById.authId !== uid) {
          try {
            await updateTeacher(uid, { authId: uid } as Partial<Teacher>);
            return { ...existingById, authId: uid };
          } catch (updateError) {
            console.warn("Failed to update teacher authId by id:", updateError);
          }
        }
        return existingById;
      }
    }

    if (!uid) {
      console.warn("Cannot create teacher document without uid.");
      return null;
    }

    const fallbackName = displayName?.trim() || email.split("@")[0] || "Teacher";
    try {
      await addTeacher(
        {
          name: fallbackName,
          email,
          subject: "",
          status: "Active",
        },
        {
          id: uid,
          authId: uid,
        }
      );
      const created = await getTeacherById(uid);
      return created;
    } catch (creationError) {
      console.error("Failed to create teacher document:", creationError);
      return null;
    }
  } catch (error) {
    console.error("ensureTeacherDocument error:", error);
    return null;
  }
};

// Update teacher
export const updateTeacher = async (id: string, teacher: Partial<Omit<Teacher, "id" | "createdAt">>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...teacher,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating teacher:", error);
    throw error;
  }
};

// Delete teacher
export const deleteTeacher = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting teacher:", error);
    throw error;
  }
};

// Search teachers
export const searchTeachers = async (searchTerm: string): Promise<Teacher[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + "\uf8ff")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error) {
    console.error("Error searching teachers:", error);
    throw error;
  }
};

// Real-time listener for all teachers
export const subscribeToTeachers = (
  callback: (teachers: Teacher[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const teachers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort by createdAt in descending order
        teachers.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`🔄 Real-time update: ${teachers.length} teachers`);
        callback(teachers);
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
              const teachers = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamp(doc.data()),
              }));
              
              // Sort manually
              teachers.sort((a, b) => {
                const dateA = a.createdAt?.getTime() || 0;
                const dateB = b.createdAt?.getTime() || 0;
                return dateB - dateA;
              });
              
              callback(teachers);
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
    return () => {};
  }
};


