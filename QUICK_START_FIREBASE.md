# ⚡ دليل البدء السريع - Firebase

## 🎯 ما تم إنجازه

### ✅ الملفات المنشأة:

1. **`src/types/index.ts`** - جميع الواجهات (10 واجهات)
2. **`src/services/firebase/teachers.service.ts`** - خدمة المعلمين
3. **`src/services/firebase/students.service.ts`** - خدمة الطلاب
4. **`src/services/firebase/classes.service.ts`** - خدمة الفصول
5. **`src/services/firebase/index.ts`** - فهرس الخدمات

### 📚 الأدلة:

1. **`FIREBASE_SETUP_AR.md`** - إعداد Firebase الأساسي
2. **`FIREBASE_COLLECTIONS_SETUP.md`** - إعداد Collections خطوة بخطوة
3. **`FIREBASE_COMPLETE_GUIDE_AR.md`** - الدليل الكامل

---

## 🚀 البدء السريع (5 خطوات)

### 1️⃣ إنشاء Firebase Project
- اذهب إلى [Firebase Console](https://console.firebase.google.com/)
- أنشئ مشروع جديد

### 2️⃣ إعداد `.env`
```bash
# انسخ .env.example إلى .env
Copy-Item .env.example .env

# املأ بيانات Firebase من Console
```

### 3️⃣ إنشاء Firestore Database
- Firestore Database > Create database
- Start in test mode
- اختر الموقع

### 4️⃣ إنشاء Collections
- راجع `FIREBASE_COLLECTIONS_SETUP.md`
- أنشئ الـ Collections المطلوبة

### 5️⃣ استخدام الخدمات
```typescript
import { getAllTeachers, addTeacher } from "@/services/firebase";
```

---

## 📋 الواجهات الموجودة

| الواجهة | الوصف | الملف |
|---------|-------|-------|
| **Teacher** | المعلمين | `src/types/index.ts` |
| **Student** | الطلاب | `src/types/index.ts` |
| **Class** | الفصول | `src/types/index.ts` |
| **Schedule** | الجداول الزمنية | `src/types/index.ts` |
| **Grade** | الدرجات | `src/types/index.ts` |
| **Attendance** | الحضور | `src/types/index.ts` |
| **Parent** | الآباء | `src/types/index.ts` |
| **Enrollment** | التسجيلات | `src/types/index.ts` |
| **Announcement** | الإعلانات | `src/types/index.ts` |
| **User** | المستخدمين | `src/types/index.ts` |

---

## 🔧 الخدمات المتوفرة

### Teachers Service
- `getAllTeachers()` - جميع المعلمين
- `getTeacherById(id)` - معلم محدد
- `addTeacher(teacher)` - إضافة معلم
- `updateTeacher(id, teacher)` - تحديث معلم
- `deleteTeacher(id)` - حذف معلم
- `searchTeachers(term)` - البحث

### Students Service
- `getAllStudents()` - جميع الطلاب
- `getStudentById(id)` - طالب محدد
- `addStudent(student)` - إضافة طالب
- `updateStudent(id, student)` - تحديث طالب
- `deleteStudent(id)` - حذف طالب
- `getStudentsByGrade(grade)` - طلاب صف معين

### Classes Service
- `getAllClasses()` - جميع الفصول
- `getClassById(id)` - فصل محدد
- `addClass(class)` - إضافة فصل
- `updateClass(id, class)` - تحديث فصل
- `deleteClass(id)` - حذف فصل
- `getClassesByTeacher(teacherId)` - فصول معلم
- `getClassesByGrade(grade)` - فصول صف معين

---

## 📖 اقرأ المزيد

- **`FIREBASE_COMPLETE_GUIDE_AR.md`** - الدليل الكامل
- **`FIREBASE_COLLECTIONS_SETUP.md`** - إعداد Collections
- **`FIREBASE_SETUP_AR.md`** - الإعداد الأساسي

---

**🎉 جاهز للبدء! اتبع الخطوات أعلاه.**







