const express = require('express')
const path = require('path')
const app = express()
const session = require('express-session')
const { error } = require('console')
const collection = require("./config")
const bcrypt = require('bcrypt')
app.listen(3000,()=>(console.log("server started")))
app.use(express.urlencoded({extended:false}))
app.use(express.static("public"))
//app.set("views",path.join(__dirname,"views"))
app.set("view engine","ejs")

app.use(express.json())



app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Disable cache for all pages
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

//login for admin with predefind credentils
const USERNAME= 'admin'
const PASSWORD = '1234'


function isAuthenticated(req,res,next){
    if(req.session.user){
        next()
    }else{
        res.redirect('/admin')
    }
}


app.get("/dashboard",isAuthenticated,function(req,res){
    res.render("dashboard",{user:req.session.user})
})

app.get("/admin",(req,res)=>{
    if(req.session.user){
        res.redirect("/dashboard")
    }else{
        res.render("adminlogin",{error:null})
    }
    
})  

app.post('/dashboard',(req,res)=>{
    const {username,password} = req.body
    console.log(req.body)
    if(username === USERNAME && password === PASSWORD){
        req.session.user = username
        res.redirect('/dashboard')
    }else{
        res.render('adminlogin',{error:"invalid password or username"})
    }
})


app.post("/logout",(req,res)=>{
       delete req.session.user
       res.redirect("/admin")
})

///login for user

app.get("/",(req,res)=>{
    if(req.session.users){
        res.redirect("/home")
    }else{
        res.render("login",{error:null})
    }
    
})

function authenticatedUser(req,res,next){
    if(req.session.users){
        next()
    }else{
        res.render("login")
    }
}



app.get('/home',authenticatedUser,(req,res)=>{
    res.render('home',{user:req.session.users})
})


app.get("/signup",(req,res)=>{
    if(req.session.users){
        res.redirect("/login")
    }else{
        res.render("signup")
    }   
})

app.post("/",async(req,res)=>{
    const {Username,Password,Email} = req.body
    const existUser = await collection.findOne({name:Username})
     
    if(existUser){
        res.render("signup",{error:"username is already taken!!"})
    }else{
    const saltRounds = 10
    const hashedPassword =await bcrypt.hash(Password,saltRounds)
    const user ={
        name:Username,
        email:Email,
        Password:hashedPassword

    }

    const userData = await collection.insertMany(user)
    console.log(userData)
    res.redirect("/")
    }
    
})



app.post("/home",async(req,res)=>{
    const {Username,Password} = req.body
    const user = await collection.findOne({name:Username})
  


    if(!user){
       return res.render('login',{error:"invalid  Username or Password"})
    }
  const isMatch = await bcrypt.compare(Password,user.Password)
    if(!isMatch){
       return res.render("login",{error:"invalid Password or Password"})
    }

        req.session.users = {
            id:user._id,
            name:user.name,
            email:user.email
           // password:user.Password
        }
        res.redirect("/home")
    
})

app.post("/logoutuser",(req,res)=>{
   delete req.session.users
        res.redirect("/")

    
})






