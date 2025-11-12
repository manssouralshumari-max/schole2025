// Service for Schedules Collection
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
import type { Schedule } from "@/types";
import type { Class } from "@/types";

const COLLECTION_NAME = "schedules";

const convertTimestamp = (data: any): Schedule => {
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Schedule;
};

// Convert day abbreviation to full day name
const dayAbbrToFull: Record<string, "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"> = {
  "Sun": "Sunday",
  "Mon": "Monday",
  "Tue": "Tuesday",
  "Wed": "Wednesday",
  "Thu": "Thursday",
  "Fri": "Friday",
  "Sat": "Saturday",
};

// Create schedules from a class
export const createSchedulesFromClass = async (classItem: Class): Promise<void> => {
  try {
    console.log("📅 Creating schedules from class:", classItem.id);
    
    // First, delete existing schedules for this class
    await deleteSchedulesByClassId(classItem.id);
    
    if (!classItem.schedule) {
      console.log("⚠️ No schedule found for class, skipping schedule creation");
      return;
    }
    
    // Parse schedule format: "Mon, Wed, Fri - 9:00 AM"
    const parts = classItem.schedule.split(" - ");
    if (parts.length < 2) {
      console.log("⚠️ Invalid schedule format, skipping schedule creation");
      return;
    }
    
    const daysPart = parts[0];
    const timePart = parts[1];
    
    // Parse days
    const days = daysPart.split(", ").map(day => day.trim());
    
    // Get enrolled students for this class
    let enrolledStudentIds: string[] = [];
    try {
      const { getEnrollmentsByClass } = await import("./enrollments.service");
      const enrollments = await getEnrollmentsByClass(classItem.id);
      enrolledStudentIds = enrollments.map((e) => e.studentId);
      console.log(`📋 Found ${enrolledStudentIds.length} enrolled students for class`);
    } catch (error: any) {
      console.warn("⚠️ Could not load enrollments, creating schedules without student IDs:", error);
    }
    
    const now = Timestamp.now();
    const schedules: Omit<Schedule, "id" | "createdAt" | "updatedAt">[] = [];
    
    // Create a schedule entry for each day and each enrolled student
    for (const dayAbbr of days) {
      const fullDayName = dayAbbrToFull[dayAbbr];
      if (fullDayName) {
        if (enrolledStudentIds.length > 0) {
          // Create schedule for each enrolled student
          for (const studentId of enrolledStudentIds) {
            schedules.push({
              classId: classItem.id,
              studentId: studentId,
              teacherId: classItem.teacherId,
              day: fullDayName,
              time: timePart,
              subject: classItem.name,
              teacher: classItem.teacherName,
              room: classItem.room || "TBD",
              createdAt: now,
              updatedAt: now,
            });
          }
        } else {
          // Create general schedule (without studentId) if no enrollments
          schedules.push({
            classId: classItem.id,
            teacherId: classItem.teacherId,
            day: fullDayName,
            time: timePart,
            subject: classItem.name,
            teacher: classItem.teacherName,
            room: classItem.room || "TBD",
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
    
    // Add all schedules to Firestore
    for (const scheduleData of schedules) {
      const scheduleDoc: any = {
        classId: scheduleData.classId,
        teacherId: scheduleData.teacherId,
        day: scheduleData.day,
        time: scheduleData.time,
        subject: scheduleData.subject,
        teacher: scheduleData.teacher,
        room: scheduleData.room,
        createdAt: now,
        updatedAt: now,
      };
      
      // Only add studentId if it exists
      if (scheduleData.studentId) {
        scheduleDoc.studentId = scheduleData.studentId;
      }
      
      await addDoc(collection(db, COLLECTION_NAME), scheduleDoc);
    }
    
    console.log(`✅ Created ${schedules.length} schedule entries for class ${classItem.id}`);
  } catch (error: any) {
    console.error("❌ Error creating schedules from class:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    throw error;
  }
};

// Delete schedules by class ID
export const deleteSchedulesByClassId = async (classId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("classId", "==", classId)
    );
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    if (querySnapshot.docs.length > 0) {
      console.log(`✅ Deleted ${querySnapshot.docs.length} schedule entries for class ${classId}`);
    }
  } catch (error: any) {
    console.error("❌ Error deleting schedules by class ID:", error);
    throw error;
  }
};

// Get schedules by teacher ID
export const getSchedulesByTeacher = async (teacherId: string): Promise<Schedule[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId),
      orderBy("day", "asc"),
      orderBy("time", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting schedules by teacher:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Trying to fetch schedules without orderBy...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("teacherId", "==", teacherId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackSchedules = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        fallbackSchedules.sort((a, b) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });
        
        console.log(`✅ Loaded ${fallbackSchedules.length} schedules without index (sorted manually)`);
        return fallbackSchedules;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get schedules by student ID
export const getSchedulesByStudent = async (studentId: string): Promise<Schedule[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("studentId", "==", studentId),
      orderBy("day", "asc"),
      orderBy("time", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting schedules by student:", error);
    
    // Fallback: try without orderBy
    if (error.code === "failed-precondition") {
      console.log("🔄 Trying to fetch schedules without orderBy...");
      try {
        const fallbackQuery = query(
          collection(db, COLLECTION_NAME),
          where("studentId", "==", studentId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackSchedules = fallbackSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        fallbackSchedules.sort((a, b) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });
        
        console.log(`✅ Loaded ${fallbackSchedules.length} schedules without index (sorted manually)`);
        return fallbackSchedules;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError);
        throw error;
      }
    }
    
    throw error;
  }
};

// Get schedules by class ID
export const getSchedulesByClassId = async (classId: string): Promise<Schedule[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("classId", "==", classId),
      orderBy("day", "asc"),
      orderBy("time", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamp(doc.data()),
    }));
  } catch (error: any) {
    console.error("❌ Error getting schedules by class ID:", error);
    throw error;
  }
};

// Real-time listener for schedules by teacher
export const subscribeToSchedulesByTeacher = (
  teacherId: string,
  callback: (schedules: Schedule[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherId", "==", teacherId),
      orderBy("day", "asc"),
      orderBy("time", "asc")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const schedules = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamp(doc.data()),
        }));
        
        // Sort manually if needed
        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        schedules.sort((a, b) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });
        
        console.log(`🔄 Real-time update: ${schedules.length} schedules for teacher`);
        callback(schedules);
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

// Create schedules from all existing classes (helper function for initial setup)
export const createSchedulesFromAllClasses = async (): Promise<void> => {
  try {
    console.log("📅 Creating schedules from all existing classes...");
    
    const { getAllClasses } = await import("./classes.service");
    const classes = await getAllClasses();
    
    let totalCreated = 0;
    for (const classItem of classes) {
      try {
        await createSchedulesFromClass(classItem);
        totalCreated++;
      } catch (error: any) {
        console.warn(`⚠️ Failed to create schedules for class ${classItem.id}:`, error);
      }
    }
    
    console.log(`✅ Created schedules for ${totalCreated} out of ${classes.length} classes`);
  } catch (error: any) {
    console.error("❌ Error creating schedules from all classes:", error);
    throw error;
  }
};

