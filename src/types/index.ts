// ============================================
// جميع الواجهات (Interfaces) للمشروع
// ============================================

// ===== 1. Authentication & User =====
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "admin" | "teacher" | "student" | "parent" | "accountant";
  createdAt: Date;
  updatedAt: Date;
}

// ===== 2. Teacher (المعلم) =====
export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: "Active" | "On Leave" | "Inactive";
  authId?: string;
  phone?: string;
  qualifications?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 3. Student (الطالب) =====
export interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  status: "Active" | "Inactive" | "Graduated";
  authId?: string;
  parentId?: string; // ربط بالوالد
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 4. Class (الفصل) =====
export interface Class {
  id: string;
  name: string;
  grade: string;
  teacherId: string; // ربط بالمعلم
  teacherName: string;
  students: number; // عدد الطلاب
  schedule: string; // الجدول الزمني
  room?: string;
  capacity?: number;
  curriculumUrl?: string;
  curriculumFileName?: string;
  curriculumStoragePath?: string;
  curriculumUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 5. Schedule (الجدول الزمني) =====
export interface Schedule {
  id: string;
  classId: string;
  studentId?: string; // للطلاب
  teacherId?: string; // للمعلمين
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time: string; // مثل "9:00 AM"
  subject: string;
  teacher: string;
  room: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 6. Grade (الدرجة) =====
export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  subject: string;
  teacherId: string;
  score: number;
  maxScore: number;
  percentage: number;
  type: "Assignment" | "Quiz" | "Midterm" | "Final" | "Project";
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 7. Attendance (الحضور) =====
export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: "Present" | "Absent" | "Late" | "Excused";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 8. Parent (الوالد) =====
export interface Parent {
  id: string;
  name: string;
  email: string;
  authId?: string;
  phone?: string;
  childrenIds: string[]; // أبناء الوالد
  createdAt: Date;
  updatedAt: Date;
}

// ===== 9. Accountant (المحاسب) =====
export interface Accountant {
  id: string;
  name: string;
  email: string;
  nationalId: string;
  qualification: string;
  startDate: Date;
  authId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 10. Financial Accounts (الحسابات المالية) =====
export type FinancialPaymentMethod = "Cash" | "Bank Transfer" | "Credit Card";

export type FinancialAccountStatus = "onTrack" | "overdue" | "settled";

export interface FinancialPayment {
  id: string;
  accountId: string;
  amount: number;
  method: FinancialPaymentMethod;
  paymentDate: Date;
  note?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinancialAccount {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  currency: string;
  totalTuition: number;
  totalPaid: number;
  monthlyInstallment: number;
  installmentCount: number;
  planStartDate: Date;
  nextDueDate: Date;
  status: FinancialAccountStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===== 11. Enrollment (التسجيل) =====
export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  enrolledAt: Date;
  status: "Active" | "Dropped" | "Completed";
  createdAt: Date;
  updatedAt: Date;
}

// ===== 12. Announcement (الإعلان) =====
export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorRole: "admin" | "teacher";
  targetAudience: ("all" | "students" | "teachers" | "parents")[];
  createdAt: Date;
  updatedAt: Date;
}




