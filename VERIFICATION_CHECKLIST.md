# ✅ قائمة التحقق من الإعداد

## 🔍 التحقق من Firebase Authentication

### 1. التحقق من تفعيل Email/Password

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك
3. اذهب إلى **Authentication** → **Sign-in method**
4. تأكد من تفعيل **Email/Password** ✅

### 2. التحقق من وجود المستخدم

1. اذهب إلى **Authentication** → **Users**
2. تأكد من وجود المستخدم الذي تريد استخدامه
3. انسخ **User UID** (مثلاً: `abc123xyz...`)

---

## 🔍 التحقق من Firestore Database

### 1. التحقق من Collection `users`

1. اذهب إلى **Firestore Database** → **Data**
2. تأكد من وجود Collection باسم `users` ✅

### 2. التحقق من Document المستخدم

1. في Collection `users`، ابحث عن Document بـ **Document ID** = User UID (من Authentication)
2. تأكد من وجود الحقول التالية:

   | الحقل | النوع | القيمة المطلوبة |
   |-------|------|-----------------|
   | `email` | String | email المستخدم (مثلاً: `admin@school.edu`) |
   | `displayName` | String | اسم المستخدم (مثلاً: `Admin User`) |
   | `role` | String | **`admin`** (بأحرف صغيرة) ⚠️ مهم جداً |
   | `createdAt` | Timestamp | تاريخ الإنشاء |
   | `updatedAt` | Timestamp | تاريخ التحديث الأخير |

3. **مهم جداً**: تأكد من أن `role` = `"admin"` (بأحرف صغيرة فقط) ✅

---

## 🔍 التحقق من قواعد الأمان (Security Rules)

### 1. التحقق من القواعد

1. اذهب إلى **Firestore Database** → **Rules**
2. تأكد من أن القواعد تحتوي على:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      // Only admins can write user data
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Other collections...
  }
}
```

3. تأكد من أن القواعد منشورة (Publish) ✅

**ملاحظة**: يمكنك نسخ القواعد الكاملة من ملف `FIREBASE_SECURITY_RULES.md`

---

## 🔍 التحقق من الكود

### 1. التحقق من ملف `.env`

1. تأكد من وجود ملف `.env` في جذر المشروع
2. تأكد من وجود جميع المتغيرات:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. التحقق من Developer Console

1. افتح التطبيق
2. اضغط **F12** لفتح Developer Console
3. اذهب إلى **Console** tab
4. سجل دخول بحساب Admin
5. تحقق من الرسائل:

   - ✅ `🔐 Auth state changed: User logged in`
   - ✅ `📥 Fetching user data for UID: [your-uid]`
   - ✅ `✅ User data loaded: {email, displayName, role: "admin", ...}`
   - ✅ `✅ User data set: {email, displayName, role: "admin", ...}`

6. إذا ظهرت رسائل خطأ أو تحذير، اتبع التعليمات في الرسائل

---

## 🔍 التحقق من الصفحة

### 1. التحقق من تسجيل الدخول

1. افتح `/login`
2. أدخل Email و Password
3. اضغط **Sign In**
4. يجب أن يتم التوجيه تلقائياً إلى `/dashboard/admin`

### 2. التحقق من Dashboard

1. بعد تسجيل الدخول، يجب أن تظهر الصفحة `/dashboard/admin`
2. يجب أن تظهر:
   - ✅ Sidebar مع القائمة
   - ✅ Header مع معلومات المستخدم
   - ✅ محتوى Dashboard (StatCards, Recent Activity, etc.)

### 3. إذا كانت الصفحة فارغة

**تحقق من:**

1. **Developer Console** (F12) → ابحث عن أخطاء
2. **Network** tab → تحقق من الطلبات إلى Firebase
3. **Application** tab → **Local Storage** → تحقق من وجود بيانات

**الأخطاء الشائعة:**

- ❌ `User document not found` → يجب إنشاء Document في Firestore
- ❌ `Missing or insufficient permissions` → يجب تحديث قواعد الأمان
- ❌ `role is undefined` → يجب التأكد من أن `role` موجود في Firestore
- ❌ `role is not "admin"` → يجب التأكد من أن `role = "admin"` (بأحرف صغيرة)

---

## 📋 قائمة التحقق النهائية

### Firebase Authentication
- [ ] Email/Password مفعل
- [ ] المستخدم موجود في Authentication
- [ ] User UID معروف

### Firestore Database
- [ ] Collection `users` موجود
- [ ] Document المستخدم موجود (Document ID = User UID)
- [ ] الحقل `email` موجود وصحيح
- [ ] الحقل `displayName` موجود
- [ ] الحقل `role` = `"admin"` (بأحرف صغيرة) ⚠️
- [ ] الحقل `createdAt` موجود (Timestamp)
- [ ] الحقل `updatedAt` موجود (Timestamp)

### Security Rules
- [ ] القواعد منشورة في Firebase Console
- [ ] القواعد تحتوي على `users` collection rules
- [ ] القواعد تسمح للمستخدم بقراءة بياناته

### الكود
- [ ] ملف `.env` موجود ويحتوي على جميع المتغيرات
- [ ] لا توجد أخطاء في Developer Console
- [ ] تسجيل الدخول يعمل
- [ ] الصفحة `/dashboard/admin` تعمل وتظهر المحتوى

---

## 🆘 إذا كان هناك مشكلة

### 1. افتح Developer Console (F12)

### 2. ابحث عن الرسائل:

- ✅ `✅ User data loaded` → كل شيء يعمل
- ⚠️ `⚠️ User document not found` → يجب إنشاء Document في Firestore
- ❌ `❌ Error fetching user data` → تحقق من قواعد الأمان

### 3. اتبع التعليمات في الرسائل

---

## 📞 للمساعدة

إذا واجهت مشكلة، تحقق من:

1. **FIREBASE_SECURITY_RULES.md** - قواعد الأمان الكاملة
2. **AUTH_SETUP_GUIDE.md** - دليل إعداد Authentication
3. **Developer Console** - الرسائل والأخطاء

---

**🎉 إذا تم التحقق من جميع النقاط، فالنظام جاهز للاستخدام!**






