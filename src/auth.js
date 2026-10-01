const jwt=require('jsonwebtoken');
function signToken(user){
  return jwt.sign({id:user._id,username:user.username,role:user.role},
    process.env.JWT_SECRET||'dev-secret',{expiresIn:'7d'});
}
function setAuthCookie(res,token){
  res.cookie('auth',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*24*60*60*1000});
}
function clearAuthCookie(res){res.clearCookie('auth');}
function requireAuth(req,res,next){
  try{
    const token=req.cookies.auth;
    if(!token) return res.status(401).json({error:'غير مسجل الدخول'});
    req.user=jwt.verify(token,process.env.JWT_SECRET||'dev-secret');
    next();
  }catch(e){return res.status(401).json({error:'انتهت الجلسة'});}
}
module.exports={signToken,setAuthCookie,clearAuthCookie,requireAuth};