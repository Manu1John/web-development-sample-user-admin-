const express = require("express")
const path = require("path")
const app = express()
const session = require("express-session")
const collection = require("./config")
const bcrypt = require("bcrypt")
const { error } = require("console")
app.listen(3000, () => console.log("server started"))

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static("public"))

app.set("view engine", "ejs")

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
  })
)

// disable cache
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  next()
})

// ================= ADMIN AUTH =================

const USERNAME = "admin"
const PASSWORD = "1234"

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    next()
  } else {
    res.redirect("/admin")
  }
}

app.get("/admin", (req, res) => {
  if (req.session.user) {
    res.redirect("/dashboard")
  } else {
    res.render("adminlogin", { error: null })
  }
})

app.post("/dashboard", (req, res) => {
  const { username, password } = req.body

  if (username === USERNAME && password === PASSWORD) {
    req.session.user = username
    res.redirect("/dashboard")
  } else {
    res.render("adminlogin", { error: "Invalid username or password" })
  }
})

app.post("/logout", (req, res) => {
  delete req.session.user
    res.redirect("/admin")
  
})

// ================= ADMIN DASHBOARD + CRUD =================

// READ + SEARCH users
app.get("/dashboard", isAuthenticated, async (req, res) => {
  const search = req.query.search || ""

  let query = {}

  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }
  }

  const users = await collection.find(query)

  // If AJAX request → return JSON
  if (req.headers["x-requested-with"] === "XMLHttpRequest") {
    return res.json(users)
  }

  // Normal page load
  res.render("dashboard", {
    admin: req.session.user,
    users,
    search,
  })
})

// CREATE user
app.post("/admin/create", isAuthenticated, async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.redirect("/dashboard")
  }

  const existingUser = await collection.findOne({ name })
  if (existingUser) {
    return res.redirect("/dashboard")
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await collection.insertMany({
    name,
    email,
    Password: hashedPassword,
  })

  res.redirect("/dashboard")
})

// UPDATE user
app.post("/admin/update/:id", isAuthenticated, async (req, res) => {
  const { name, email } = req.body

  await collection.findByIdAndUpdate(req.params.id, {
    name,
    email,
  })

  res.redirect("/dashboard")
})

// DELETE user
app.post("/admin/delete/:id", isAuthenticated, async (req, res) => {
  await collection.findByIdAndDelete(req.params.id)
  res.redirect("/dashboard")
})

// ================= USER AUTH =================

app.get("/", (req, res) => {
  if (req.session.users) {
    res.redirect("/home")
  } else {
    res.render("login", { error: null })
  }
})

//  force logout if user deleted
async function authenticatedUser(req, res, next) {
  if (!req.session.users) {
    return res.redirect("/")
  }

  const userExists = await collection.findById(req.session.users.id)

  if (!userExists) {
    return req.session.destroy(() => {
      res.redirect("/")
    })
  }

  next()
}

app.get("/home", authenticatedUser, (req, res) => {
  res.render("home", { user: req.session.users })
})

app.get("/signup", (req, res) => {
  if (req.session.users) {
    res.redirect("/")
  } else {
    res.render("signup", { error: null })
  }
})

// SIGNUP
app.post("/", async (req, res) => {
  const { Username, Password, Email, confirmPassword } = req.body

  const existUsername = await collection.findOne({ name: Username })
  const existEmail = await collection.findOne({email:Email})
  if (existUsername && existEmail) {
    return res.render("signup", {
      error: "email and username is already taken!!"
    })
  }else if(existEmail){
    return res.render("signup",{
      error:"Email is already taken"
    })
  }else if (existUsername){
    return res.render("signup",{
      error:"username already taken"
    })
  }

  const hashedPassword = await bcrypt.hash(Password, 10)

  await collection.insertMany({
    name: Username,
    email: Email,
    Password: hashedPassword,
  })

return res.render("signup", {
  success: "Account created successfully! Redirecting to login...",
})
})
// LOGIN
app.post("/home", async (req, res) => {
  const { Username, Password } = req.body

  const user = await collection.findOne({ name: Username })
  if (!user) {
    return res.render("login", { error: "Invalid username or password" })
  }

  const isMatch = await bcrypt.compare(Password, user.Password)
  if (!isMatch) {
    return res.render("login", { error: "Invalid username or password" })
  }

  req.session.users = {
    id: user._id,
    name: user.name,
    email: user.email,
  }

  res.render("login",{
    success:"login success"
  })
})

app.post("/logoutuser", (req, res) => {
 delete req.session.users
    res.redirect("/")
  
})