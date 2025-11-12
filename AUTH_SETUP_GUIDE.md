# 🔐 دليل إعداد Authentication - خطوة بخطوة

## ✅ ما تم إنجازه

تم إضافة نظام Authentication كامل باستخدام Firebase Authentication!

### ✅ الملفات المنشأة:

1. **`src/contexts/AuthContext.tsx`** - Auth Context و Provider
2. **`src/components/ProtectedRoute.tsx`** - Protected Route Component
3. **`src/pages/Login.tsx`** - تم تحديثه لاستخدام Firebase Auth
4. **`src/components/DashboardLayout.tsx`** - تم تحديثه لاستخدام Auth
5. **`src/App.tsx`** - تم تحديثه لإضافة AuthProvider

---

## 🚀 الميزات المضافة

### 1. Auth Context
- ✅ إدارة حالة Authentication
- ✅ Login/Signup/Logout
- ✅ Password Reset
- ✅ جلب بيانات المستخدم من Firestore
- ✅ مراقبة حالة Authentication

### 2. Protected Routes
- ✅ حماية الصفحات حسب الدور (Role)
- ✅ إعادة توجيه تلقائي للصفحات غير المصرح بها
- ✅ Loading states أثناء التحقق

### 3. Login Page
- ✅ استخدام Firebase Authentication
- ✅ معالجة الأخطاء
- ✅ Loading states
- ✅ رسائل خطأ واضحة

### 4. Dashboard Layout
- ✅ عرض معلومات المستخدم
- ✅ Logout functionality
- ✅ استخدام بيانات المستخدم من Auth

---

## 📋 خطوات الإعداد في Firebase

### الخطوة 1: تفعيل Authentication

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك
3. في القائمة الجانبية، اضغط على **Authentication**
4. اضغط على **Get started**

### الخطوة 2: تفعيل Email/Password Sign-in

1. في Authentication، اضغط على **Sign-in method**
2. اضغط على **Email/Password**
3. فعّل **Enable** للـ Email/Password
4. اضغط **Save**

### الخطوة 3: إنشاء Collection: **users**

في Firestore، أنشئ Collection باسم `users`:

**البنية (Structure):**
```
users/
  {userId}/
    - email: string
    - displayName: string
    - role: string ("admin" | "teacher" | "student" | "parent")
    - createdAt: timestamp
    - updatedAt: timestamp
```

**الحقول:**
- `email` - String
- `displayName` - String
- `role` - String (اختر: admin, teacher, student, parent)
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

---

## 👤 إنشاء حساب مستخدم

### الطريقة 1: من خلال Firebase Console

1. اذهب إلى **Authentication** > **Users**
2. اضغط **Add user**
3. أدخل Email و Password
4. اضغط **Add user**

ثم يجب إضافة بيانات المستخدم في Firestore:
- اذهب إلى **Firestore Database**
- أضف document في Collection `users` بـ ID = User UID
- أضف الحقول: email, displayName, role

### الطريقة 2: من خلال التطبيق (Sign Up)

يمكنك إضافة صفحة Sign Up لاحقاً. حالياً يمكنك إنشاء المستخدمين من Firebase Console.

---

## 🔧 كيفية الاستخدام

### 1. تسجيل الدخول

1. افتح `/login`
2. اختر الدور (Admin/Teacher/Student/Parent)
3. أدخل Email و Password
4. اضغط **Sign In**

### 2. الوصول إلى Dashboard

بعد تسجيل الدخول، سيتم التوجيه تلقائياً إلى Dashboard المناسب حسب الدور:
- Admin → `/dashboard/admin`
- Teacher → `/dashboard/teacher`
- Student → `/dashboard/student`
- Parent → `/dashboard/parent`

### 3. Protected Routes

جميع صفحات Dashboard محمية:
- يجب تسجيل الدخول للوصول
- يجب أن يكون الدور صحيحاً
- إذا كان الدور غير صحيح، سيتم التوجيه تلقائياً

### 4. Logout

- اضغط على زر **Logout** في Dashboard
- سيتم تسجيل الخروج وإعادة التوجيه إلى `/login`

---

## 📝 مثال: إنشاء حساب Admin

### 1. في Firebase Console:

1. **Authentication** > **Users** > **Add user**
   - Email: `admin@school.edu`
   - Password: `admin123456`

2. انسخ **User UID** (مثلاً: `abc123xyz...`)

3. **Firestore Database** > **users** > **Add document**
   - Document ID: `abc123xyz...` (User UID)
   - الحقول:
     - `email`: `admin@school.edu`
     - `displayName`: `Admin User`
     - `role`: `admin`
     - `createdAt`: (اختر Timestamp)
     - `updatedAt`: (اختر Timestamp)

### 2. تسجيل الدخول:

1. افتح `/login`
2. اختر **Admin** tab
3. Email: `admin@school.edu`
4. Password: `admin123456`
5. اضغط **Sign In**

---

## 🔐 قواعد الأمان (Security Rules)

⚠️ **مهم**: هذه القواعد **جزئية فقط** لـ `users` collection. 

**لا تستخدم هذه القواعد وحدها!** استخدم القواعد الكاملة من ملف `FIREBASE_FINAL_SECURITY_RULES.md` بدلاً من ذلك.

القواعد الكاملة تتضمن:
- ✅ Users collection (مع أمان أفضل)
- ✅ Teachers collection
- ✅ Students collection
- ✅ Classes collection
- ✅ Other collections

**👉 راجع ملف `FIREBASE_FINAL_SECURITY_RULES.md` للقواعد الكاملة والنهائية.**

---

## 🆘 استكشاف الأخطاء

### خطأ: "User not found"
- تأكد من إنشاء المستخدم في Firebase Authentication
- تأكد من إضافة بيانات المستخدم في Firestore Collection `users`

### خطأ: "Insufficient permissions"
- تحقق من قواعد الأمان في Firestore
- تأكد من أن المستخدم لديه الدور الصحيح

### خطأ: "Invalid email or password"
- تحقق من صحة Email و Password
- تأكد من تفعيل Email/Password في Firebase Authentication

---

## 📚 الملفات المرتبطة

- `src/contexts/AuthContext.tsx` - Auth Context
- `src/components/ProtectedRoute.tsx` - Protected Routes
- `src/pages/Login.tsx` - Login Page
- `src/components/DashboardLayout.tsx` - Dashboard Layout
- `src/App.tsx` - App with Auth Provider

---

## ✅ قائمة التحقق

- [ ] تفعيل Authentication في Firebase
- [ ] تفعيل Email/Password Sign-in
- [ ] إنشاء Collection `users` في Firestore
- [ ] إنشاء حساب مستخدم تجريبي
- [ ] إضافة بيانات المستخدم في Firestore
- [ ] تحديث قواعد الأمان
- [ ] اختبار تسجيل الدخول
- [ ] اختبار Protected Routes

---

**🎉 نظام Authentication جاهز للاستخدام!**

