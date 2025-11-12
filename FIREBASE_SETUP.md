# 🔥 إعداد Firebase للمشروع

## خطوات الربط مع Firebase

### 1. إنشاء مشروع Firebase جديد

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اضغط على "Add project" أو "إضافة مشروع"
3. أدخل اسم المشروع (مثلاً: "scholaris-dash")
4. اتبع التعليمات لإكمال إنشاء المشروع

### 2. إضافة Web App إلى المشروع

1. في Firebase Console، اضغط على أيقونة **Web** (</>) 
2. سجل اسم التطبيق (مثلاً: "Scholaris Dashboard")
3. يمكنك تفعيل "Also set up Firebase Hosting" أو تخطيه
4. اضغط على "Register app"

### 3. نسخ بيانات الإعدادات (Config)

بعد إنشاء التطبيق، ستظهر لك كود JavaScript يحتوي على بيانات الإعدادات:

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

### 4. إعداد ملف البيئة (.env)

1. انسخ ملف `.env.example` إلى `.env`:
   ```bash
   cp .env.example .env
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

### 5. تفعيل الخدمات المطلوبة

#### Authentication (المصادقة)
1. في Firebase Console، اذهب إلى **Authentication** > **Get started**
2. اضغط على **Sign-in method**
3. فعّل طرق المصادقة التي تريدها:
   - **Email/Password** (مطلوب)
   - **Google** (اختياري)
   - **Facebook** (اختياري)
   - وغيرها حسب الحاجة

#### Firestore Database (قاعدة البيانات)
1. اذهب إلى **Firestore Database** > **Create database**
2. اختر **Start in test mode** (للبدء)
3. اختر موقع قاعدة البيانات (مثلاً: `us-central`)

#### Storage (التخزين)
1. اذهب إلى **Storage** > **Get started**
2. اختر **Start in test mode**
3. اختر موقع التخزين

### 6. تثبيت التبعيات

تأكد من تثبيت Firebase SDK (موجود بالفعل في package.json):

```bash
npm install
```

### 7. التحقق من الإعدادات

بعد إعداد `.env`، تأكد من:
- إعادة تشغيل خادم التطوير (`npm run dev`)
- التحقق من عدم وجود أخطاء في Console
- فتح ملف `src/lib/firebase.ts` للتأكد من أن الإعدادات صحيحة

## 📝 ملاحظات مهمة

1. **لا تشارك ملف `.env`** - يحتوي على معلومات حساسة
2. **ملف `.env` موجود في `.gitignore`** - لن يتم رفعه إلى Git
3. **استخدم `.env.example`** كقالب للمساهمة في المشروع
4. **أعد تشغيل الخادم** بعد تعديل `.env`

## 🔗 روابط مفيدة

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

## ⚠️ استكشاف الأخطاء

### خطأ: "Missing Firebase configuration keys"
- تأكد من وجود جميع المتغيرات في `.env`
- تأكد من أن المتغيرات تبدأ بـ `VITE_`
- أعد تشغيل خادم التطوير

### خطأ: "Firebase: Error (auth/invalid-api-key)"
- تحقق من صحة `VITE_FIREBASE_API_KEY`
- تأكد من نسخ المفتاح بشكل صحيح

### خطأ: "Firebase: Error (auth/unauthorized-domain)"
- اذهب إلى Firebase Console > Authentication > Settings
- أضف النطاق الخاص بك إلى "Authorized domains"







