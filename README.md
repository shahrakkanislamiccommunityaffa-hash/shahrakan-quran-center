# مركز شهركان الإسلامي لتعليم القرآن

نظام ويب لإدارة الطلاب والمعلمين وتسجيل الحضور، مبني باستخدام:

- Node.js + Express
- MongoDB + Mongoose
- HTML/CSS/JavaScript
- GitHub
- Render

## التشغيل محلياً

1. ثبّت Node.js 18 أو أحدث.
2. نفّذ:
   npm install
3. انسخ `.env.example` إلى `.env`.
4. ضع رابط MongoDB Atlas في `MONGODB_URI`.
5. غيّر `JWT_SECRET`.
6. شغّل:
   npm start
7. افتح:
   http://localhost:3000

الحساب الأول يتم إنشاؤه تلقائياً من:
ADMIN_USERNAME
ADMIN_PASSWORD

## النشر على Render

- ارفع المشروع إلى GitHub.
- في Render أنشئ Web Service واربط مستودع GitHub.
- Build Command:
  npm install
- Start Command:
  npm start
- أضف متغيرات البيئة الموجودة في `.env.example`.

## MongoDB Atlas

أنشئ Database باسم مثلاً:
shahrakan_quran

ثم استخدم Connection String داخل `MONGODB_URI`.

## المزايا الحالية

- تسجيل دخول آمن بالـ JWT داخل Cookie.
- إدارة الصفوف والملفات.
- إضافة الطلاب مع المستوى ورقم ولي الأمر والملاحظات.
- إضافة المعلمين.
- تسجيل حضور الطلاب حسب التاريخ والصف والأستاذ.
- حالات: حاضر، غائب، متأخر، بعذر.
- تسجيل حضور المعلمين.
- لوحة إحصائيات.
- واجهة عربية RTL ومتجاوبة مع الجوال.

ملاحظة: الشعار الموجود حالياً رمزي، ويمكن استبداله بشعار المركز الحقيقي داخل `public/logo.png`.
