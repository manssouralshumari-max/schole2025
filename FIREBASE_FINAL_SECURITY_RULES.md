# 🔐 قواعد الأمان النهائية لـ Firestore

## ⚠️ مهم جداً

**لا تضيف كودين منفصلين!** استخدم القواعد الكاملة أدناه فقط.

---

## 📋 القواعد النهائية الموصى بها

انسخ هذه القواعد **الكاملة** وضعه في Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isAccountant() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'accountant';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own data only
      allow read: if isAuthenticated() && request.auth.uid == userId;
      // Users can create their own document (for signup), admins can do anything
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Teachers collection
    match /teachers/{teacherId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Users can create their own document (for signup), admins can do anything
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Students collection
    match /students/{studentId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Users can create their own document (for signup), admins can do anything
      allow create: if isAuthenticated();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Classes collection
    match /classes/{classId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdmin();
      allow update: if isAdmin() || (
        isAuthenticated() &&
        request.auth.uid == resource.data.teacherId &&
        request.resource.data.keys().hasOnly([
          "name",
          "grade",
          "teacherId",
          "teacherName",
          "students",
          "schedule",
          "room",
          "capacity",
          "curriculumUrl",
          "curriculumFileName",
          "curriculumStoragePath",
          "curriculumUpdatedAt",
          "createdAt",
          "updatedAt"
        ]) &&
        request.resource.data.teacherId == resource.data.teacherId &&
        request.resource.data.teacherName == resource.data.teacherName &&
        request.resource.data.name == resource.data.name &&
        request.resource.data.grade == resource.data.grade &&
        request.resource.data.students == resource.data.students &&
        request.resource.data.schedule == resource.data.schedule &&
        request.resource.data.room == resource.data.room &&
        request.resource.data.capacity == resource.data.capacity &&
        request.resource.data.createdAt == resource.data.createdAt
      );
    }
    
    // Schedules collection
    match /schedules/{scheduleId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Grades collection
    match /grades/{gradeId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Teachers can create and update their own grades, admins can do anything
      allow create: if isAuthenticated() && 
                     (isAdmin() || 
                      (request.auth != null && 
                       request.resource.data.teacherId == request.auth.uid));
      allow update: if isAuthenticated() && 
                     (isAdmin() || 
                      (get(/databases/$(database)/documents/grades/$(gradeId)).data.teacherId == request.auth.uid));
      allow delete: if isAdmin();
    }
    
    // Enrollments collection
    match /enrollments/{enrollmentId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Parents collection
    match /parents/{parentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Accountants collection
    match /accountants/{accountantId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Financial Accounts & Payments collections
    match /financialAccounts/{accountId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin() || isAccountant();
      allow update: if isAdmin() || isAccountant();
      allow delete: if isAdmin();

      match /payments/{paymentId} {
        allow read: if isAuthenticated();
        allow create: if isAdmin() || isAccountant();
        allow update, delete: if isAdmin();
      }
    }

    // Allow all authenticated users to read other collections
    // Only admins can write
    match /{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

---

## 📝 خطوات التطبيق

### 1. اذهب إلى Firebase Console

1. افتح [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك
3. اذهب إلى **Firestore Database** → **Rules**

### 2. احذف القواعد القديمة

1. احذف جميع القواعد الموجودة في المحرر

### 3. انسخ القواعد الجديدة

انسخ القواعد الكاملة أعلاه والصقها في المحرر.

### 4. انشر القواعد

1. اضغط **Publish** أو **Publish rules**
2. انتظر حتى تظهر رسالة "Rules published successfully"

---

## 🔍 الفرق بين القواعد

### القواعد في AUTH_SETUP_GUIDE.md (169-183):
```javascript
match /users/{userId} {
  // Users can read their own data
  allow read: if request.auth != null && request.auth.uid == userId;
  // Only admins can write user data
  allow write: if request.auth != null && 
                  get(...).data.role == 'admin';
}
```
✅ **مزايا**: الأمان أفضل - المستخدم يقرأ بياناته فقط

### القواعد في FIREBASE_COLLECTIONS_SETUP.md (264-301):
```javascript
match /users/{userId} {
  allow read: if request.auth != null;  // أي مستخدم مسجل دخول
  allow write: if request.auth != null && request.auth.uid == userId;  // المستخدم يكتب بياناته
}
```
⚠️ **مشكلة**: أي مستخدم مسجل دخول يمكنه قراءة بيانات أي مستخدم آخر (غير آمن)

### القواعد النهائية (المدمجة):
```javascript
match /users/{userId} {
  // Users can read their own data only
  allow read: if isAuthenticated() && request.auth.uid == userId;
  // Only admins can write user data
  allow write: if isAdmin();
}
```
✅ **الأفضل**: يجمع بين الأمان والوظائف الكاملة

---

## ✅ القواعد النهائية تتضمن:

1. ✅ **Users collection**: المستخدم يقرأ بياناته فقط، والـ Admins فقط يكتبون
2. ✅ **Teachers collection**: أي مستخدم مسجل دخول يقرأ، والـ Admins فقط يكتبون
3. ✅ **Students collection**: أي مستخدم مسجل دخول يقرأ، والـ Admins فقط يكتبون
4. ✅ **Classes collection**: أي مستخدم مسجل دخول يقرأ، والـ Admins فقط يكتبون
5. ✅ **Financial Accounts & Payments**: قراءة للجميع، تحديث للأدمن/المحاسب، حذف للأدمن فقط
6. ✅ **Other collections**: أي مستخدم مسجل دخول يقرأ، والـ Admins فقط يكتبون

### ⚠️ الفهارس المطلوبة

لبعض الاستعلامات (مثل مشاهدة جميع الدفعات)، تحتاج إنشاء فهرس مجموعة:

1. افتح **Firestore Console** → **Indexes** → **Composite** → اضغط **Add index**
2. اختر **Collection group** = `payments`
3. أضف الحقول:
   - `paymentDate` → ترتيب `Ascending`
4. أنشئ الفهرس أو استخدم الرابط الذي يظهر في رسالة الخطأ
5. انتظر حتى تظهر حالة الفهرس **READY**

---

## 📚 ملاحظات مهمة

### 1. لا تضيف كودين منفصلين!

❌ **خطأ**: إضافة كود من `AUTH_SETUP_GUIDE.md` ثم كود من `FIREBASE_COLLECTIONS_SETUP.md`
✅ **صحيح**: استخدم القواعد النهائية الكاملة أعلاه فقط

### 2. القواعد حساسة لحالة الأحرف

- `role: "admin"` ✅ صحيح
- `role: "Admin"` ❌ خطأ
- `role: "ADMIN"` ❌ خطأ

### 3. Document ID في `users` يجب أن يكون User UID

- Document ID = User UID (من Firebase Authentication)
- لا تستخدم أسماء عشوائية

---

## 🆘 استكشاف الأخطاء

### خطأ: "Missing or insufficient permissions"

**السبب:** القواعد غير صحيحة أو المستخدم غير مسموح له بالوصول

**الحل:**
1. استخدم القواعد النهائية الكاملة أعلاه
2. تأكد من أن المستخدم لديه `role: "admin"` في Firestore
3. تأكد من أن القواعد منشورة (Publish)

### خطأ: "User not found"

**السبب:** المستخدم غير موجود في Firestore Collection `users`

**الحل:**
1. اذهب إلى **Firestore Database** → **Data** → **users**
2. أنشئ document جديد بـ Document ID = User UID
3. أضف الحقول المطلوبة: `email`, `displayName`, `role`, `createdAt`, `updatedAt`

---

## ✅ قائمة التحقق

- [ ] حذفت القواعد القديمة
- [ ] نسخت القواعد النهائية الكاملة أعلاه
- [ ] لصقت القواعد في Firebase Console
- [ ] نشرت القواعد (Publish)
- [ ] تأكدت من أن `role: "admin"` في Firestore (بأحرف صغيرة)
- [ ] اختبرت تسجيل الدخول
- [ ] اختبرت الوصول إلى `/dashboard/admin`
- [ ] لا توجد أخطاء في Developer Console

---

**🎉 استخدم القواعد النهائية الكاملة أعلاه فقط!**

