const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  passwordHash: { type: String, required: true }
});

// مجموعة تعليمية: إما "صف" (ضمن مرحلة الصفوف) أو "ملف" (حلقة مصغرة)
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  stage: { type: String, enum: ['صفوف', 'ملفات'], required: true },
  teacher: { type: String, trim: true, default: '' }
});

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  level: { type: String, trim: true, default: '' },
  parentPhone: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' }
});

// سجل حضور طالب بتاريخ معيّن
const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['حاضر', 'غائب'], required: true },
  level: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' }
}, { timestamps: true });
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// سجل حضور معلم: اسمه وتاريخه بس
const TeacherAttendanceSchema = new mongoose.Schema({
  teacherName: { type: String, required: true, trim: true },
  date: { type: String, required: true } // YYYY-MM-DD
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Group: mongoose.model('Group', GroupSchema),
  Student: mongoose.model('Student', StudentSchema),
  Attendance: mongoose.model('Attendance', AttendanceSchema),
  TeacherAttendance: mongoose.model('TeacherAttendance', TeacherAttendanceSchema)
};
