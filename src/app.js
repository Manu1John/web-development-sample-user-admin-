const express = require("express")
const path = require("path")
const app = express()
const session = require("express-session")
const collection = require("./config")
const bcrypt = require("bcrypt")

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

  const users = await collection.find({
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  })

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

// IMPORTANT: force logout if user deleted
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

  // Check empty fields
  if (!Username || !Email || !Password || !confirmPassword) {
    return res.render("signup", {
      error: "All fields are required",
    })
  }

  // Confirm password match
  if (Password !== confirmPassword) {
    return res.render("signup", {
      error: "Passwords do not match",
    })
  }

  // Strong password validation
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/

  if (!strongPassword.test(Password)) {
    return res.render("signup", {
      error:
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
    })
  }

  const existUser = await collection.findOne({ name: Username })
  if (existUser) {
    return res.render("signup", {
      error: "Username is already taken",
    })
  }

  const hashedPassword = await bcrypt.hash(Password, 10)

  await collection.insertMany({
    name: Username,
    email: Email,
    Password: hashedPassword,
  })

  res.render("signup", {
    success: "Account created successfully. Please log in.",
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

  res.redirect("/home")
})

app.post("/logoutuser", (req, res) => {
 delete req.session.users
    res.redirect("/")
  
})