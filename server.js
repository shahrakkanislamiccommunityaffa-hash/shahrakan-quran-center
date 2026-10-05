require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');

const { User, Group, Student, Attendance, Teacher, TeacherAttendance } = require('./src/models');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('./src/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.redirect('/login.html'));

// ---------- الاتصال بقاعدة البيانات وتجهيز حساب الأدمن الوحيد ----------
async function bootstrap() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ متصل بقاعدة البيانات');

  const adminExists = await User.findOne({});
  if (!adminExists && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await User.create({ username: process.env.ADMIN_USERNAME, passwordHash });
    console.log(`✅ تم إنشاء حساب الأدمن: ${process.env.ADMIN_USERNAME}`);
  }
}

// ---------- تسجيل الدخول ----------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ username: user.username });
});

app.post('/api/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

// ---------- الصفوف/الملفات (Groups) ----------
app.get('/api/groups', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.stage) filter.stage = req.query.stage;
  const groups = await Group.find(filter)
    .collation({ locale: 'ar', numericOrdering: true })
    .sort({ name: 1 });
  res.json(groups);
});

app.post('/api/groups', requireAuth, async (req, res) => {
  const { name, stage, teacher } = req.body || {};
  if (!name || !stage) return res.status(400).json({ error: 'الاسم والمرحلة مطلوبين' });
  if (!['صفوف', 'ملفات'].includes(stage)) return res.status(400).json({ error: 'مرحلة غير صحيحة' });
  const group = await Group.create({ name: name.trim(), stage, teacher: (teacher || '').trim() });
  res.json(group);
});

app.put('/api/groups/:id', requireAuth, async (req, res) => {
  const { name, teacher } = req.body || {};
  const group = await Group.findByIdAndUpdate(
    req.params.id,
    { ...(name ? { name: name.trim() } : {}), ...(teacher !== undefined ? { teacher: teacher.trim() } : {}) },
    { new: true }
  );
  if (!group) return res.status(404).json({ error: 'غير موجود' });
  res.json(group);
});

app.delete('/api/groups/:id', requireAuth, async (req, res) => {
  const studentsCount = await Student.countDocuments({ groupId: req.params.id });
  if (studentsCount > 0) {
    return res.status(400).json({ error: `ما تقدر تحذفه، فيه ${studentsCount} طالب مسجّل فيه. احذف الطلاب أولاً.` });
  }
  await Group.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- الطلاب ----------
app.get('/api/students', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.groupId) filter.groupId = req.query.groupId;
  const students = await Student.find(filter).sort({ name: 1 });
  res.json(students);
});

app.post('/api/students', requireAuth, async (req, res) => {
  const { name, groupId, level, parentPhone, notes } = req.body || {};
  if (!name || !groupId) return res.status(400).json({ error: 'الاسم والصف/الملف مطلوبين' });
  const student = await Student.create({
    name: name.trim(), groupId,
    level: (level || '').trim(),
    parentPhone: (parentPhone || '').replace(/[^0-9]/g, ''),
    notes: (notes || '').trim()
  });
  res.json(student);
});

app.put('/api/students/:id', requireAuth, async (req, res) => {
  const { name, groupId, level, parentPhone, notes } = req.body || {};
  const update = {};
  if (name !== undefined) update.name = name.trim();
  if (groupId !== undefined) update.groupId = groupId;
  if (level !== undefined) update.level = level.trim();
  if (parentPhone !== undefined) update.parentPhone = parentPhone.replace(/[^0-9]/g, '');
  if (notes !== undefined) update.notes = notes.trim();
  const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!student) return res.status(404).json({ error: 'غير موجود' });
  res.json(student);
});

app.delete('/api/students/:id', requireAuth, async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  await Attendance.deleteMany({ studentId: req.params.id });
  res.json({ ok: true });
});

// ---------- حضور الطلاب ----------
// يرجع حضور يوم معيّن لصف/ملف معيّن (أو فاضي لو ما فيه تسجيل لهذا اليوم بعد)
app.get('/api/attendance', requireAuth, async (req, res) => {
  const { groupId, date } = req.query;
  if (!groupId || !date) return res.status(400).json({ error: 'الصف/الملف والتاريخ مطلوبين' });
  const records = await Attendance.find({ groupId, date });
  res.json(records);
});

// حفظ حضور يوم كامل دفعة وحدة: [{studentId, status, level, notes}, ...]
app.post('/api/attendance/bulk', requireAuth, async (req, res) => {
  const { groupId, date, records } = req.body || {};
  if (!groupId || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  const ops = records.map(r => ({
    updateOne: {
      filter: { studentId: r.studentId, date },
      update: {
        $set: {
          studentId: r.studentId, groupId, date,
          status: r.status === 'غائب' ? 'غائب' : 'حاضر',
          level: (r.level || '').trim(),
          notes: (r.notes || '').trim()
        }
      },
      upsert: true
    }
  }));
  if (ops.length) await Attendance.bulkWrite(ops);
  res.json({ ok: true, count: ops.length });
});

// سجل حضور طالب معيّن عبر كل التواريخ (لمتابعة تاريخه)
app.get('/api/students/:id/history', requireAuth, async (req, res) => {
  const records = await Attendance.find({ studentId: req.params.id }).sort({ date: -1 });
  res.json(records);
});

// ---------- قائمة المعلمين ----------
app.get('/api/teachers', requireAuth, async (req, res) => {
  const teachers = await Teacher.find().collation({ locale: 'ar' }).sort({ name: 1 });
  res.json(teachers);
});

app.post('/api/teachers', requireAuth, async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم المعلم مطلوب' });
  const exists = await Teacher.findOne({ name });
  if (exists) return res.status(400).json({ error: 'هذا المعلم موجود مسبقاً' });
  const teacher = await Teacher.create({ name });
  res.json(teacher);
});

app.delete('/api/teachers/:id', requireAuth, async (req, res) => {
  await Teacher.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- حضور المعلمين ----------
app.get('/api/teacher-attendance', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  const records = await TeacherAttendance.find(filter).sort({ date: -1, teacherName: 1 });
  res.json(records);
});

app.post('/api/teacher-attendance', requireAuth, async (req, res) => {
  const { teacherName, date } = req.body || {};
  if (!teacherName || !date) return res.status(400).json({ error: 'اسم المعلم والتاريخ مطلوبين' });
  const name = teacherName.trim();
  // لا نكرر نفس المعلم بنفس اليوم
  const existing = await TeacherAttendance.findOne({ teacherName: name, date });
  if (existing) return res.json(existing);
  const record = await TeacherAttendance.create({ teacherName: name, date });
  res.json(record);
});

app.delete('/api/teacher-attendance/:id', requireAuth, async (req, res) => {
  await TeacherAttendance.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
bootstrap().then(() => {
  app.listen(PORT, () => console.log(`🚀 السيرفر شغال على المنفذ ${PORT}`));
}).catch(err => {
  console.error('فشل بدء التشغيل:', err);
  process.exit(1);
});
