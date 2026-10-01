require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');
const { User, Student, Teacher, ClassRoom, StudentAttendance, TeacherAttendance } = require('./src/models');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('./src/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req,res)=>res.redirect('/login.html'));

async function bootstrap(){
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  if(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD){
    const exists = await User.findOne({username: process.env.ADMIN_USERNAME});
    if(!exists){
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD,10);
      await User.create({username:process.env.ADMIN_USERNAME,passwordHash,role:'admin'});
      console.log('Initial admin created:', process.env.ADMIN_USERNAME);
    }
  }
}

app.post('/api/login', async (req,res)=>{
  try{
    const {username,password}=req.body||{};
    if(!username||!password) return res.status(400).json({error:'أدخل اسم المستخدم وكلمة المرور'});
    const user=await User.findOne({username});
    if(!user || !(await bcrypt.compare(password,user.passwordHash)))
      return res.status(401).json({error:'بيانات الدخول غير صحيحة'});
    setAuthCookie(res,signToken(user));
    res.json({username:user.username,role:user.role});
  }catch(e){res.status(500).json({error:'حدث خطأ في الخادم'});}
});

app.post('/api/logout', (req,res)=>{clearAuthCookie(res);res.json({ok:true});});
app.get('/api/me',requireAuth,(req,res)=>res.json({username:req.user.username,role:req.user.role}));

// Classes
app.get('/api/classes',requireAuth,async(req,res)=>{
  res.json(await ClassRoom.find().sort({grade:1,name:1}));
});
app.post('/api/classes',requireAuth,async(req,res)=>{
  const {grade,name,teacher}=req.body||{};
  if(!name) return res.status(400).json({error:'اسم الصف مطلوب'});
  res.json(await ClassRoom.create({grade:grade||'',name,teacher:teacher||''}));
});
app.delete('/api/classes/:id',requireAuth,async(req,res)=>{
  await ClassRoom.findByIdAndDelete(req.params.id); res.json({ok:true});
});

// Students
app.get('/api/students',requireAuth,async(req,res)=>{
  const filter={};
  if(req.query.classId) filter.classId=req.query.classId;
  res.json(await Student.find(filter).sort({name:1}));
});
app.post('/api/students',requireAuth,async(req,res)=>{
  const {name,level,parentPhone,notes,classId}=req.body||{};
  if(!name||!classId) return res.status(400).json({error:'اسم الطالب والصف مطلوبان'});
  res.json(await Student.create({name,level:level||'',parentPhone:parentPhone||'',notes:notes||'',classId}));
});
app.put('/api/students/:id',requireAuth,async(req,res)=>{
  res.json(await Student.findByIdAndUpdate(req.params.id,req.body,{new:true}));
});
app.delete('/api/students/:id',requireAuth,async(req,res)=>{
  await Student.findByIdAndDelete(req.params.id);
  await StudentAttendance.deleteMany({studentId:req.params.id});
  res.json({ok:true});
});

// Teachers
app.get('/api/teachers',requireAuth,async(req,res)=>{
  res.json(await Teacher.find().sort({name:1}));
});
app.post('/api/teachers',requireAuth,async(req,res)=>{
  const {name,phone,classId,notes}=req.body||{};
  if(!name) return res.status(400).json({error:'اسم المعلم مطلوب'});
  res.json(await Teacher.create({name,phone:phone||'',classId:classId||null,notes:notes||''}));
});
app.delete('/api/teachers/:id',requireAuth,async(req,res)=>{
  await Teacher.findByIdAndDelete(req.params.id);
  await TeacherAttendance.deleteMany({teacherId:req.params.id});
  res.json({ok:true});
});

// Student attendance
app.get('/api/student-attendance',requireAuth,async(req,res)=>{
  const {date,classId}=req.query;
  const filter={};
  if(date) filter.date=date;
  if(classId) filter.classId=classId;
  res.json(await StudentAttendance.find(filter).populate('studentId').sort({createdAt:1}));
});

app.post('/api/student-attendance/bulk',requireAuth,async(req,res)=>{
  const {date,classId,teacher,records}=req.body||{};
  if(!date||!classId||!Array.isArray(records))
    return res.status(400).json({error:'البيانات ناقصة'});
  let saved=0;
  for(const r of records){
    if(!r.studentId) continue;
    await StudentAttendance.findOneAndUpdate(
      {date,classId,studentId:r.studentId},
      {date,classId,studentId:r.studentId,teacher:teacher||'',status:r.status||'present',notes:r.notes||''},
      {upsert:true,new:true}
    );
    saved++;
  }
  res.json({saved});
});

// Teacher attendance
app.get('/api/teacher-attendance',requireAuth,async(req,res)=>{
  const filter={};
  if(req.query.date) filter.date=req.query.date;
  res.json(await TeacherAttendance.find(filter).populate('teacherId').sort({createdAt:1}));
});
app.post('/api/teacher-attendance/bulk',requireAuth,async(req,res)=>{
  const {date,records}=req.body||{};
  if(!date||!Array.isArray(records)) return res.status(400).json({error:'البيانات ناقصة'});
  for(const r of records){
    if(!r.teacherId) continue;
    await TeacherAttendance.findOneAndUpdate(
      {date,teacherId:r.teacherId},
      {date,teacherId:r.teacherId,status:r.status||'present',notes:r.notes||''},
      {upsert:true,new:true}
    );
  }
  res.json({saved:records.length});
});

// Simple dashboard statistics
app.get('/api/stats',requireAuth,async(req,res)=>{
  const [students,teachers,classes]=await Promise.all([
    Student.countDocuments(),Teacher.countDocuments(),ClassRoom.countDocuments()
  ]);
  res.json({students,teachers,classes});
});

const PORT=process.env.PORT||3000;
bootstrap()
  .then(()=>app.listen(PORT,()=>console.log(`Server running on ${PORT}`)))
  .catch(err=>{console.error('Startup error:',err);process.exit(1);});