# 🔥 إعداد Firebase للمشروع

## ✅ ما تم إنجازه

تم إنشاء ملفات إعدادات Firebase التالية:

1. ✅ `src/lib/firebase.ts` - ملف إعدادات Firebase الرئيسي
2. ✅ `.env.example` - قالب ملف البيئة
3. ✅ `.gitignore` - تم تحديثه لإضافة `.env`
4. ✅ `FIREBASE_SETUP.md` - دليل الإعداد الكامل

## 📋 الخطوات التالية للربط مع حسابك في Firebase

### الخطوة 1: إنشاء/الوصول إلى مشروع Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. إذا لم يكن لديك مشروع، اضغط **"Add project"** أو **"إضافة مشروع"**
3. أدخل اسم المشروع (مثلاً: `scholaris-dash`)

### الخطوة 2: إضافة Web App

1. في Firebase Console، اضغط على أيقونة **Web** `</>`
2. سجل اسم التطبيق (مثلاً: `Scholaris Dashboard`)
3. اضغط **"Register app"**

### الخطوة 3: نسخ بيانات الإعدادات

بعد إنشاء التطبيق، ستظهر لك بيانات الإعدادات مثل:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};
```

### الخطوة 4: إنشاء ملف `.env`

1. انسخ `.env.example` إلى `.env`:
   ```bash
   # في Windows PowerShell
   Copy-Item .env.example .env
   ```

2. افتح ملف `.env` واملأ البيانات من Firebase Config:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### الخطوة 5: تفعيل الخدمات المطلوبة

#### 🔐 Authentication (المصادقة)
1. اذهب إلى **Authentication** > **Get started**
2. اضغط على **Sign-in method**
3. فعّل **Email/Password** على الأقل

#### 💾 Firestore Database
1. اذهب إلى **Firestore Database** > **Create database**
2. اختر **Start in test mode** (للبدء)
3. اختر موقع قاعدة البيانات

#### 📦 Storage
1. اذهب إلى **Storage** > **Get started**
2. اختر **Start in test mode**

### الخطوة 6: التحقق من الإعدادات

1. تأكد من تثبيت التبعيات:
   ```bash
   npm install
   ```

2. أعد تشغيل خادم التطوير:
   ```bash
   npm run dev
   ```

3. افتح Console المتصفح - يجب ألا تظهر أخطاء متعلقة بـ Firebase

## 📝 استخدام Firebase في الكود

بعد إعداد `.env`، يمكنك استخدام Firebase في أي ملف:

```typescript
import { auth, db, storage } from "@/lib/firebase";

// استخدام Authentication
import { signInWithEmailAndPassword } from "firebase/auth";

// استخدام Firestore
import { collection, addDoc } from "firebase/firestore";

// استخدام Storage
import { ref, uploadBytes } from "firebase/storage";
```

## ⚠️ ملاحظات مهمة

1. **لا تشارك ملف `.env`** - يحتوي على معلومات حساسة
2. **ملف `.env` موجود في `.gitignore`** - لن يتم رفعه إلى Git
3. **أعد تشغيل الخادم** بعد تعديل `.env`

## 🔍 التحقق من الربط

افتح ملف `src/lib/firebase.ts` وتحقق من:
- ✅ لا توجد أخطاء TypeScript
- ✅ المتغيرات البيئية موجودة
- ✅ التحقق من إعدادات Firebase في Console

## 🆘 استكشاف الأخطاء

### خطأ: "Missing Firebase configuration keys"
- تأكد من وجود جميع المتغيرات في `.env`
- تأكد من أن المتغيرات تبدأ بـ `VITE_`
- أعد تشغيل خادم التطوير

### خطأ: "Firebase: Error (auth/invalid-api-key)"
- تحقق من صحة `VITE_FIREBASE_API_KEY`
- تأكد من نسخ المفتاح بشكل صحيح من Firebase Console

## 📚 الملفات المرتبطة

- `src/lib/firebase.ts` - إعدادات Firebase
- `.env` - بيانات الإعدادات (لا تشاركها)
- `.env.example` - قالب ملف البيئة
- `FIREBASE_SETUP.md` - دليل إعداد مفصل







