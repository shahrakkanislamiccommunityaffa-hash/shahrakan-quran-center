let classes=[],students=[],teachers=[];
const today=new Date().toISOString().slice(0,10);
document.getElementById('studentDate').value=today;
document.getElementById('teacherDate').value=today;

const api=async(path,opts={})=>{
 const r=await fetch(path,{headers:{'Content-Type':'application/json'},...opts});
 if(r.status===401){location.href='/login.html';throw new Error('unauthorized')}
 const d=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error(d.error||'حدث خطأ');
 return d;
};
const esc=s=>(s??'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showTab(name){
 ['students','teachers','manage'].forEach(x=>document.getElementById(x+'Tab').classList.toggle('hidden',x!==name));
 document.querySelectorAll('.menu-btn').forEach((b,i)=>b.classList.toggle('active',['students','teachers','manage'][i]===name));
 if(name==='teachers') loadTeacherRows();
 if(name==='manage') renderManagement();
}
async function logout(){await api('/api/logout',{method:'POST'});location.href='/login.html'}

async function init(){
 const me=await api('/api/me'); document.getElementById('userBadge').textContent=me.username;
 await Promise.all([loadClasses(),loadStudents(),loadTeachers(),loadStats()]);
 loadStudentRows();
}
async function loadStats(){
 const s=await api('/api/stats');
 ['students','teachers','classes'].forEach(k=>document.getElementById('s'+k[0].toUpperCase()+k.slice(1)).textContent=s[k]);
}
async function loadClasses(){
 classes=await api('/api/classes');
 const opts='<option value="">اختر الصف / الملف</option>'+classes.map(c=>`<option value="${c._id}">${esc(c.grade)} — ${esc(c.name)}</option>`).join('');
 ['studentClass','newStudentClass','newTeacherClass'].forEach(id=>document.getElementById(id).innerHTML=opts);
}
async function loadStudents(){
 students=await api('/api/students');
}
async function loadTeachers(){teachers=await api('/api/teachers')}

function loadStudentRows(){
 const id=document.getElementById('studentClass').value;
 const rows=students.filter(s=>s.classId===id);
 document.getElementById('studentRows').innerHTML=rows.length?rows.map(s=>`
 <tr data-id="${s._id}">
 <td><b>${esc(s.name)}</b></td><td>${esc(s.level)}</td><td>${esc(s.parentPhone)}</td>
 <td><select class="status"><option value="present">حاضر</option><option value="absent">غائب</option><option value="late">متأخر</option><option value="excused">بعذر</option></select></td>
 <td><input class="row-note" placeholder="ملاحظة" value="${esc(s.notes||'')}"></td>
 </tr>`).join(''):'<tr><td colspan="5" class="empty">اختر الصف لعرض الطلاب</td></tr>';
}
async function saveStudentAttendance(){
 const classId=document.getElementById('studentClass').value;
 if(!classId){alert('اختر الصف أولاً');return}
 const records=[...document.querySelectorAll('#studentRows tr[data-id]')].map(tr=>({
  studentId:tr.dataset.id,status:tr.querySelector('.status').value,notes:tr.querySelector('.row-note').value
 }));
 const d=await api('/api/student-attendance/bulk',{method:'POST',body:JSON.stringify({
  date:document.getElementById('studentDate').value,classId,
  teacher:document.getElementById('studentTeacher').value,
  file:document.getElementById('studentFile').value,records
 })});
 document.getElementById('studentMsg').textContent=`تم حفظ ${d.saved} سجل`;
 setTimeout(()=>document.getElementById('studentMsg').textContent='',3000);
}
function loadTeacherRows(){
 document.getElementById('teacherRows').innerHTML=teachers.length?teachers.map(t=>{
  const c=classes.find(x=>x._id===t.classId);
  return `<tr data-id="${t._id}"><td><b>${esc(t.name)}</b></td><td>${c?esc(c.name):'—'}</td><td>${esc(t.phone)}</td>
  <td><select class="status"><option value="present">حاضر</option><option value="absent">غائب</option><option value="late">متأخر</option><option value="excused">بعذر</option></select></td>
  <td><input class="row-note" placeholder="ملاحظة"></td></tr>`}).join(''):'<tr><td colspan="5" class="empty">لا يوجد معلمون</td></tr>';
}
async function saveTeacherAttendance(){
 const records=[...document.querySelectorAll('#teacherRows tr[data-id]')].map(tr=>({
  teacherId:tr.dataset.id,status:tr.querySelector('.status').value,notes:tr.querySelector('.row-note').value
 }));
 const d=await api('/api/teacher-attendance/bulk',{method:'POST',body:JSON.stringify({date:document.getElementById('teacherDate').value,records})});
 document.getElementById('teacherMsg').textContent=`تم حفظ ${d.saved} سجل`;
 setTimeout(()=>document.getElementById('teacherMsg').textContent='',3000);
}
async function addClass(){
 const grade=document.getElementById('classGrade').value.trim(),name=document.getElementById('className').value.trim(),teacher=document.getElementById('classTeacher').value.trim();
 if(!name){alert('أدخل اسم الصف / الملف');return}
 await api('/api/classes',{method:'POST',body:JSON.stringify({grade,name,teacher})});
 document.getElementById('classGrade').value='';document.getElementById('className').value='';document.getElementById('classTeacher').value='';
 await loadClasses();renderManagement();await loadStats();
}
async function addStudent(){
 const body={name:document.getElementById('newStudentName').value.trim(),level:document.getElementById('newStudentLevel').value.trim(),parentPhone:document.getElementById('newParentPhone').value.trim(),classId:document.getElementById('newStudentClass').value,notes:document.getElementById('newStudentNotes').value.trim()};
 if(!body.name||!body.classId){alert('اسم الطالب والصف مطلوبان');return}
 await api('/api/students',{method:'POST',body:JSON.stringify(body)});
 alert('تمت إضافة الطالب');document.getElementById('newStudentName').value='';
 await loadStudents();await loadStats();loadStudentRows();
}
async function addTeacher(){
 const body={name:document.getElementById('newTeacherName').value.trim(),phone:document.getElementById('newTeacherPhone').value.trim(),classId:document.getElementById('newTeacherClass').value||null,notes:document.getElementById('newTeacherNotes').value.trim()};
 if(!body.name){alert('أدخل اسم المعلم');return}
 await api('/api/teachers',{method:'POST',body:JSON.stringify(body)});
 alert('تمت إضافة المعلم');document.getElementById('newTeacherName').value='';
 await loadTeachers();await loadStats();loadTeacherRows();
}
function renderManagement(){
 document.getElementById('classesList').innerHTML=classes.map(c=>`<div class="list-row"><span>${esc(c.grade)} — <b>${esc(c.name)}</b><small>${c.teacher?' | '+esc(c.teacher):''}</small></span><button class="danger small" onclick="deleteClass('${c._id}')">حذف</button></div>`).join('')||'<p class="muted">لا توجد صفوف بعد.</p>';
}
async function deleteClass(id){if(!confirm('حذف الصف؟'))return;await api('/api/classes/'+id,{method:'DELETE'});await loadClasses();renderManagement();await loadStats();}
init();