// Service for Classes Collection
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
import type { Class } from "@/types";

const COLLECTION_NAME = "classes";

const convertTimestamp = (data: any): Class => {
  return {
    ...data,
    curriculumUpdatedAt: data.curriculumUpdatedAt?.toDate() || data.curriculumUpdatedAt || undefined,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Class;
};

export const getAllClasses = async (): Promise<Class[]> => {
  try {
    console.log("📥 Fetching classes from Firestore...");
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const classes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
    
    // Sort by createdAt in descending order (fallback if index is not available)
    classes.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA;
    });
    
    console.log(`✅ Loaded ${classes.length} classes successfully`);
    return classes;
  } catch (error: any) {
    console.error("❌ Error getting classes:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
    } else if (error.code === "failed-precondition") {
      console.error("⚠️ Index required! Please create a single-field index in Firestore.");
      console.error("   Collection: classes");
      console.error("   Field: createdAt (descending)");
      
      // Fallback: try without orderBy
      console.log("🔄 Trying to fetch without orderBy...");
      try {
        const fallbackQuery = query(collection(db, COLLECTION_NAME));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackClasses = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually
        fallbackClasses.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`✅ Loaded ${fallbackClasses.length} classes without index`);
        return fallbackClasses;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

export const getClassById = async (id: string): Promise<Class | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...convertTimestamp(docSnap.data()),
      } as Class;
    }
    return null;
  } catch (error) {
    console.error("Error getting class:", error);
    throw error;
  }
};

export const addClass = async (classData: Omit<Class, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  try {
    console.log("📝 Adding class to Firestore...");
    console.log("   Class data:", classData);
    
    const now = Timestamp.now();
    const classDoc: any = {
      name: classData.name,
      grade: classData.grade,
      teacherId: classData.teacherId,
      teacherName: classData.teacherName,
      students: classData.students,
      schedule: classData.schedule,
      createdAt: now,
      updatedAt: now,
    };
    
    // Only add optional fields if they exist (Firestore doesn't accept undefined)
    if (classData.room !== undefined && classData.room !== null && classData.room !== "") {
      classDoc.room = classData.room;
    }
    if (classData.capacity !== undefined && classData.capacity !== null) {
      classDoc.capacity = classData.capacity;
    }
    if (classData.curriculumUrl) {
      classDoc.curriculumUrl = classData.curriculumUrl;
    }
    if (classData.curriculumFileName) {
      classDoc.curriculumFileName = classData.curriculumFileName;
    }
    if (classData.curriculumStoragePath) {
      classDoc.curriculumStoragePath = classData.curriculumStoragePath;
    }
    if (classData.curriculumUpdatedAt) {
      classDoc.curriculumUpdatedAt = Timestamp.fromDate(classData.curriculumUpdatedAt);
    }
    
    console.log("   Class data with timestamps:", classDoc);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), classDoc);
    
    console.log(`✅ Class added successfully with ID: ${docRef.id}`);
    
    // Create schedules from the class
    try {
      const { createSchedulesFromClass } = await import("./schedules.service");
      const classWithId = { ...classData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Class;
      await createSchedulesFromClass(classWithId);
    } catch (scheduleError: any) {
      console.warn("⚠️ Failed to create schedules from class:", scheduleError);
      console.warn("   Class was created successfully, but schedules were not created.");
      console.warn("   You can create schedules manually later.");
    }
    
    return docRef.id;
  } catch (error: any) {
    console.error("❌ Error adding class:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    
    if (error.code === "permission-denied") {
      console.error("⚠️ Permission denied! Please check Firestore Security Rules.");
      console.error("   Make sure admins can write to 'classes' collection.");
    }
    
    throw error;
  }
};

export const updateClass = async (id: string, classData: Partial<Omit<Class, "id" | "createdAt">>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    // Only add fields that are defined (Firestore doesn't accept undefined)
    if (classData.name !== undefined) {
      updateData.name = classData.name;
    }
    if (classData.grade !== undefined) {
      updateData.grade = classData.grade;
    }
    if (classData.teacherId !== undefined) {
      updateData.teacherId = classData.teacherId;
    }
    if (classData.teacherName !== undefined) {
      updateData.teacherName = classData.teacherName;
    }
    if (classData.students !== undefined) {
      updateData.students = classData.students;
    }
    if (classData.schedule !== undefined) {
      updateData.schedule = classData.schedule;
    }
    
    // Handle optional fields
    if (classData.room !== undefined) {
      updateData.room = classData.room || null;
    }
    if (classData.capacity !== undefined) {
      updateData.capacity = classData.capacity || null;
    }
    if (classData.curriculumUrl !== undefined) {
      updateData.curriculumUrl = classData.curriculumUrl || null;
    }
    if (classData.curriculumFileName !== undefined) {
      updateData.curriculumFileName = classData.curriculumFileName || null;
    }
    if (classData.curriculumStoragePath !== undefined) {
      updateData.curriculumStoragePath = classData.curriculumStoragePath || null;
    }
    if (classData.curriculumUpdatedAt !== undefined) {
      updateData.curriculumUpdatedAt = classData.curriculumUpdatedAt
        ? Timestamp.fromDate(classData.curriculumUpdatedAt)
        : null;
    }
    
    await updateDoc(docRef, updateData);
    
    // Update schedules if schedule field was updated
    if (classData.schedule !== undefined) {
      try {
        const classDoc = await getDoc(docRef);
        if (classDoc.exists()) {
          const { createSchedulesFromClass } = await import("./schedules.service");
          const updatedClass = {
            id,
            ...classDoc.data(),
            ...updateData,
            createdAt: classDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: new Date(),
          } as Class;
          await createSchedulesFromClass(updatedClass);
        }
      } catch (scheduleError: any) {
        console.warn("⚠️ Failed to update schedules from class:", scheduleError);
        console.warn("   Class was updated successfully, but schedules were not updated.");
      }
    }
  } catch (error: any) {
    console.error("❌ Error updating class:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

export const updateClassCurriculum = async (
  id: string,
  data: {
    curriculumUrl: string;
    curriculumFileName: string;
    curriculumStoragePath: string;
    curriculumUpdatedAt: Date;
  }
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      curriculumUrl: data.curriculumUrl,
      curriculumFileName: data.curriculumFileName,
      curriculumStoragePath: data.curriculumStoragePath,
      curriculumUpdatedAt: Timestamp.fromDate(data.curriculumUpdatedAt),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating class curriculum:", error);
    throw error;
  }
};

export const deleteClass = async (id: string): Promise<void> => {
  try {
    // Delete associated schedules first
    try {
      const { deleteSchedulesByClassId } = await import("./schedules.service");
      await deleteSchedulesByClassId(id);
      console.log(`✅ Deleted schedules for class ${id}`);
    } catch (scheduleError: any) {
      console.warn("⚠️ Failed to delete schedules for class:", scheduleError);
      console.warn("   Continuing with class deletion...");
    }
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`✅ Class deleted successfully: ${id}`);
  } catch (error) {
    console.error("Error deleting class:", error);
    throw error;
  }
};

export const getClassesByTeacher = async (teacherId: string): Promise<Class[]> => {
  try {
    console.log("📥 Fetching classes for teacher:", teacherId);
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    const classes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
    
    console.log(`✅ Loaded ${classes.length} classes for teacher`);
    return classes;
  } catch (error: any) {
    // Check if index is required BEFORE logging error
    if (error.code === "failed-precondition") {
      // Silently handle index requirement - use fallback immediately
      console.log("📋 Index not found. Using fallback method (this is normal if index wasn't created yet)...");
      
      // Fallback: try without orderBy
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("teacherId", "==", teacherId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackClasses = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually by name
        fallbackClasses.sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        });
        
        console.log(`✅ Successfully loaded ${fallbackClasses.length} classes (fallback mode - sorted manually)`);
        console.log("💡 Tip: To improve performance, create a composite index:");
        console.log("   Collection: classes, Fields: teacherId (ascending), name (ascending)");
        return fallbackClasses;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        console.error("   Returning empty array as last resort...");
        return [];
      }
    }
    
    // For other errors, log and throw
    console.error("❌ Error getting classes by teacher:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

export const getClassesByGrade = async (grade: string): Promise<Class[]> => {
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
    console.error("Error getting classes by grade:", error);
    throw error;
  }
};

// Real-time listener for all classes
export const subscribeToClasses = (
  callback: (classes: Class[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const classes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort by createdAt in descending order
        classes.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });
        
        console.log(`🔄 Real-time update: ${classes.length} classes`);
        callback(classes);
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
              const classes = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamp(doc.data()),
              }));
              
              // Sort manually
              classes.sort((a, b) => {
                const dateA = a.createdAt?.getTime() || 0;
                const dateB = b.createdAt?.getTime() || 0;
                return dateB - dateA;
              });
              
              callback(classes);
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


export const subscribeToClassesByTeacher = (
  teacherId: string,
  callback: (classes: Class[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const classQuery = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId)
    );

    const unsubscribe = onSnapshot(
      classQuery,
      (snapshot) => {
        const classes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));

        classes.sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        });

        callback(classes);
      },
      (error) => {
        console.error("❌ Error in teacher classes listener:", error);
        if (onError) {
          onError(error as unknown as Error);
        }
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error("❌ Error setting up teacher classes listener:", error);
    if (onError) {
      onError(error);
    }
    return () => {};
  }
};


