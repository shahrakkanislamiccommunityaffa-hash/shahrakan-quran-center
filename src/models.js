const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:{type:String,unique:true,required:true},
  passwordHash:{type:String,required:true},
  role:{type:String,default:'admin'}
},{timestamps:true});

const ClassRoomSchema = new mongoose.Schema({
  grade:String,
  name:{type:String,required:true},
  teacher:String
},{timestamps:true});

const StudentSchema = new mongoose.Schema({
  name:{type:String,required:true},
  level:String,
  parentPhone:String,
  notes:String,
  classId:{type:mongoose.Schema.Types.ObjectId,ref:'ClassRoom',required:true}
},{timestamps:true});

const TeacherSchema = new mongoose.Schema({
  name:{type:String,required:true},
  phone:String,
  classId:{type:mongoose.Schema.Types.ObjectId,ref:'ClassRoom',default:null},
  notes:String
},{timestamps:true});

const StudentAttendanceSchema = new mongoose.Schema({
  date:{type:String,required:true},
  classId:{type:mongoose.Schema.Types.ObjectId,ref:'ClassRoom',required:true},
  studentId:{type:mongoose.Schema.Types.ObjectId,ref:'Student',required:true},
  teacher:String,
  status:{type:String,enum:['present','absent','late','excused'],default:'present'},
  notes:String
},{timestamps:true});
StudentAttendanceSchema.index({date:1,classId:1,studentId:1},{unique:true});

const TeacherAttendanceSchema = new mongoose.Schema({
  date:{type:String,required:true},
  teacherId:{type:mongoose.Schema.Types.ObjectId,ref:'Teacher',required:true},
  status:{type:String,enum:['present','absent','late','excused'],default:'present'},
  notes:String
},{timestamps:true});
TeacherAttendanceSchema.index({date:1,teacherId:1},{unique:true});

module.exports={
  User:mongoose.model('User',UserSchema),
  ClassRoom:mongoose.model('ClassRoom',ClassRoomSchema),
  Student:mongoose.model('Student',StudentSchema),
  Teacher:mongoose.model('Teacher',TeacherSchema),
  StudentAttendance:mongoose.model('StudentAttendance',StudentAttendanceSchema),
  TeacherAttendance:mongoose.model('TeacherAttendance',TeacherAttendanceSchema)
};