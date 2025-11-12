# 🔐 قواعد الأمان الكاملة لـ Firestore

## 📋 القواعد الموصى بها

انسخ هذه القواعد وضعه في Firebase Console → Firestore Database → Rules:

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
      // Users can read their own data
      allow read: if isAuthenticated() && request.auth.uid == userId;
      // Only admins can write user data
      allow write: if isAdmin();
    }
    
    // Teachers collection
    match /teachers/{teacherId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Students collection
    match /students/{studentId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Classes collection
    match /classes/{classId} {
      // All authenticated users can read
      allow read: if isAuthenticated();
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Financial accounts collection
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

### 2. انسخ القواعد

انسخ القواعد الكاملة أعلاه والصقها في محرر القواعد.

### 3. انشر القواعد

1. اضغط **Publish** أو **Publish rules**
2. انتظر حتى تظهر رسالة "Rules published successfully"

---

## ✅ التحقق من القواعد

### 1. التحقق من وجود المستخدم في Firestore

1. اذهب إلى **Firestore Database** → **Data**
2. تأكد من وجود Collection `users`
3. تأكد من وجود document بحيث:
   - **Document ID** = User UID (من Authentication)
   - **Fields**:
     - `email`: string
     - `displayName`: string
     - `role`: `"admin"` (بأحرف صغيرة)
     - `createdAt`: timestamp
     - `updatedAt`: timestamp

### 2. التحقق من القواعد

1. اذهب إلى **Firestore Database** → **Rules**
2. تأكد من أن القواعد المذكورة أعلاه موجودة
3. تأكد من أن القواعد منشورة (Publish)

### 3. اختبار في التطبيق

1. سجل دخول بحساب Admin
2. تأكد من أن الصفحة `/dashboard/admin` تعمل
3. افتح Developer Console (F12) وابحث عن أي أخطاء

---

## 🆘 استكشاف الأخطاء

### خطأ: "Missing or insufficient permissions"

**السبب:** القواعد غير صحيحة أو المستخدم غير مسموح له بالوصول

**الحل:**
1. تحقق من قواعد الأمان في Firebase Console
2. تأكد من أن المستخدم لديه `role: "admin"` في Firestore
3. تأكد من أن المستخدم مسجل دخول (Authentication)

### خطأ: "User not found"

**السبب:** المستخدم غير موجود في Firestore Collection `users`

**الحل:**
1. اذهب إلى **Firestore Database** → **Data** → **users**
2. أنشئ document جديد بـ Document ID = User UID
3. أضف الحقول المطلوبة: `email`, `displayName`, `role`, `createdAt`, `updatedAt`

### خطأ: "Permission denied"

**السبب:** المستخدم ليس لديه الصلاحيات المطلوبة

**الحل:**
1. تأكد من أن المستخدم لديه `role: "admin"` في Firestore
2. تأكد من أن القواعد تستخدم `isAdmin()` function بشكل صحيح

---

## 📚 ملاحظات مهمة

1. **قواعد الأمان في Firestore حساسة لحالة الأحرف (Case-Sensitive)**
   - `role: "admin"` ✅ صحيح
   - `role: "Admin"` ❌ خطأ
   - `role: "ADMIN"` ❌ خطأ

2. **يجب أن يكون المستخدم مسجل دخول**
   - يجب أن يكون `request.auth != null` في القواعد
   - يجب أن يكون المستخدم موجود في Firebase Authentication

3. **Document ID في `users` يجب أن يكون User UID**
   - Document ID = User UID (من Firebase Authentication)
   - لا تستخدم أسماء عشوائية

---

## 🔍 مثال: إنشاء حساب Admin

### 1. في Firebase Authentication:

1. اذهب إلى **Authentication** → **Users** → **Add user**
2. أدخل:
   - Email: `admin@school.edu`
   - Password: `admin123456`
3. انسخ **User UID** (مثلاً: `abc123xyz...`)

### 2. في Firestore Database:

1. اذهب إلى **Firestore Database** → **Data** → **users**
2. اضغط **Add document**
3. أدخل:
   - **Document ID**: `abc123xyz...` (User UID من Authentication)
   - **Fields**:
     - `email`: `admin@school.edu` (String)
     - `displayName`: `Admin User` (String)
     - `role`: `admin` (String) - **مهم: بأحرف صغيرة**
     - `createdAt`: (اختر Timestamp) - الآن
     - `updatedAt`: (اختر Timestamp) - الآن
4. اضغط **Save**

### 3. اختبار تسجيل الدخول:

1. افتح التطبيق → `/login`
2. أدخل:
   - Email: `admin@school.edu`
   - Password: `admin123456`
3. يجب أن يتم التوجيه إلى `/dashboard/admin`

---

## ✅ قائمة التحقق

- [ ] القواعد منشورة في Firebase Console
- [ ] Collection `users` موجود في Firestore
- [ ] Document المستخدم موجود في `users` collection
- [ ] Document ID = User UID (من Authentication)
- [ ] `role` = `"admin"` (بأحرف صغيرة)
- [ ] جميع الحقول المطلوبة موجودة (`email`, `displayName`, `role`, `createdAt`, `updatedAt`)
- [ ] تسجيل الدخول يعمل
- [ ] الصفحة `/dashboard/admin` تعمل
- [ ] لا توجد أخطاء في Developer Console

---

**🎉 إذا تم التحقق من جميع النقاط، فالنظام جاهز للاستخدام!**





