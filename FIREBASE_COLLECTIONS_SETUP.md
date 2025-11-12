# 🔥 إعداد Collections في Firebase Firestore - خطوة بخطوة

## 📋 نظرة عامة على Collections المطلوبة

المشروع يحتاج إلى Collections التالية في Firestore:

1. **users** - المستخدمين (Authentication)
2. **teachers** - المعلمين
3. **students** - الطلاب
4. **classes** - الفصول
5. **schedules** - الجداول الزمنية
6. **grades** - الدرجات
7. **attendances** - الحضور والغياب
8. **parents** - الآباء
9. **enrollments** - التسجيلات
10. **announcements** - الإعلانات

---

## 🚀 خطوات الإعداد خطوة بخطوة

### الخطوة 1: إنشاء Firestore Database

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك أو أنشئ مشروع جديد
3. في القائمة الجانبية، اضغط على **Firestore Database**
4. اضغط على **Create database**
5. اختر **Start in test mode** (للبدء السريع)
   - ⚠️ **ملاحظة**: ستحتاج لاحقاً لتحديد قواعد الأمان
6. اختر موقع قاعدة البيانات (مثلاً: `us-central1` أو `europe-west1`)
7. اضغط **Enable**

---

### الخطوة 2: إنشاء Collections

#### 2.1 Collection: **teachers**

**البنية (Structure):**
```
teachers/
  {teacherId}/
    - name: string
    - email: string
    - subject: string
    - status: string ("Active" | "On Leave" | "Inactive")
    - phone: string (optional)
    - qualifications: string (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

**كيفية الإنشاء:**
1. في Firestore Console، اضغط **Start collection**
2. Collection ID: `teachers`
3. Document ID: اضغط **Auto-ID** (سيتم إنشاؤه تلقائياً)
4. أضف الحقول التالية:
   - `name` - String
   - `email` - String
   - `subject` - String
   - `status` - String
   - `phone` - String (اختياري)
   - `qualifications` - String (اختياري)
   - `createdAt` - Timestamp
   - `updatedAt` - Timestamp

---

#### 2.2 Collection: **students**

**البنية (Structure):**
```
students/
  {studentId}/
    - name: string
    - email: string
    - grade: string
    - status: string ("Active" | "Inactive" | "Graduated")
    - parentId: string (optional)
    - phone: string (optional)
    - address: string (optional)
    - dateOfBirth: timestamp (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

**الحقول:**
- `name` - String
- `email` - String
- `grade` - String
- `status` - String
- `parentId` - String (اختياري)
- `phone` - String (اختياري)
- `address` - String (اختياري)
- `dateOfBirth` - Timestamp (اختياري)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

---

#### 2.3 Collection: **classes**

**البنية (Structure):**
```
classes/
  {classId}/
    - name: string
    - grade: string
    - teacherId: string
    - teacherName: string
    - students: number
    - schedule: string
    - room: string (optional)
    - capacity: number (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

**الحقول:**
- `name` - String
- `grade` - String
- `teacherId` - String
- `teacherName` - String
- `students` - Number
- `schedule` - String
- `room` - String (اختياري)
- `capacity` - Number (اختياري)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

---

#### 2.4 Collection: **schedules**

**البنية (Structure):**
```
schedules/
  {scheduleId}/
    - classId: string
    - studentId: string (optional)
    - teacherId: string (optional)
    - day: string ("Monday" | "Tuesday" | ...)
    - time: string
    - subject: string
    - teacher: string
    - room: string
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

#### 2.5 Collection: **grades**

**البنية (Structure):**
```
grades/
  {gradeId}/
    - studentId: string
    - classId: string
    - subject: string
    - teacherId: string
    - score: number
    - maxScore: number
    - percentage: number
    - type: string ("Assignment" | "Quiz" | "Midterm" | "Final" | "Project")
    - date: timestamp
    - notes: string (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

#### 2.6 Collection: **attendances**

**البنية (Structure):**
```
attendances/
  {attendanceId}/
    - studentId: string
    - classId: string
    - date: timestamp
    - status: string ("Present" | "Absent" | "Late" | "Excused")
    - notes: string (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

#### 2.7 Collection: **parents**

**البنية (Structure):**
```
parents/
  {parentId}/
    - name: string
    - email: string
    - phone: string (optional)
    - childrenIds: array of strings
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

#### 2.8 Collection: **enrollments**

**البنية (Structure):**
```
enrollments/
  {enrollmentId}/
    - studentId: string
    - classId: string
    - enrolledAt: timestamp
    - status: string ("Active" | "Dropped" | "Completed")
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

#### 2.9 Collection: **announcements**

**البنية (Structure):**
```
announcements/
  {announcementId}/
    - title: string
    - content: string
    - authorId: string
    - authorRole: string ("admin" | "teacher")
    - targetAudience: array of strings
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

### الخطوة 3: إعداد Indexes (الفهارس)

Firestore قد يطلب منك إنشاء indexes عند استخدام queries معقدة:

1. اذهب إلى **Firestore Database** > **Indexes**
2. إذا ظهرت رسالة "Create index"، اضغط عليها
3. أو أنشئ indexes يدوياً حسب الحاجة

**Indexes الموصى بها:**
- `teachers` - للبحث بالاسم
- `students` - للبحث بالـ grade
- `classes` - للبحث بالـ teacherId و grade

---

### الخطوة 4: إعداد قواعد الأمان (Security Rules)

⚠️ **مهم**: استخدم القواعد النهائية الكاملة من ملف `FIREBASE_FINAL_SECURITY_RULES.md`

**⚠️ لا تستخدم القواعد القديمة أدناه!** القواعد الجديدة أكثر أماناً وتشمل:
- ✅ Users collection (مع أمان أفضل - المستخدم يقرأ بياناته فقط)
- ✅ Teachers collection
- ✅ Students collection
- ✅ Classes collection
- ✅ Other collections

**👉 راجع ملف `FIREBASE_FINAL_SECURITY_RULES.md` للقواعد الكاملة والنهائية.**

1. اذهب إلى **Firestore Database** > **Rules**
2. انسخ القواعد من `FIREBASE_FINAL_SECURITY_RULES.md`
3. اضغط **Publish**

---

### الخطوة 5: إنشاء بيانات تجريبية (اختياري)

يمكنك إنشاء بيانات تجريبية يدوياً في Firestore Console، أو استخدام الكود:

```typescript
// مثال: إضافة معلم تجريبي
import { addTeacher } from "@/services/firebase/teachers.service";

await addTeacher({
  name: "Dr. Robert Johnson",
  email: "robert.j@school.edu",
  subject: "Mathematics",
  status: "Active",
});
```

---

## ✅ التحقق من الإعداد

1. ✅ تأكد من وجود جميع Collections في Firestore
2. ✅ تحقق من وجود الحقول الصحيحة
3. ✅ اختبر إضافة بيانات تجريبية
4. ✅ تحقق من قواعد الأمان

---

## 📚 الملفات المرتبطة

- `src/types/index.ts` - جميع الواجهات (Interfaces)
- `src/services/firebase/teachers.service.ts` - خدمة المعلمين
- `src/services/firebase/students.service.ts` - خدمة الطلاب
- `src/services/firebase/classes.service.ts` - خدمة الفصول
- `src/lib/firebase.ts` - إعدادات Firebase

---

## 🆘 استكشاف الأخطاء

### خطأ: "Missing or insufficient permissions"
- تحقق من قواعد الأمان في Firestore
- تأكد من تسجيل الدخول

### خطأ: "Index not found"
- اذهب إلى Firestore > Indexes
- أنشئ الـ Index المطلوب

---

## 📝 ملاحظات

1. **Test Mode**: في البداية، استخدم Test Mode للتنمية
2. **Security Rules**: قم بتحديث قواعد الأمان قبل النشر
3. **Indexes**: قد تحتاج لإنشاء indexes عند استخدام queries معقدة


