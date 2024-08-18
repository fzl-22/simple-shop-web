const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const errorController = require("./controllers/error");
const DB_URL = require("./util/database");
const User = require("./models/user");

const app = express();
const store = new MongoDBStore({
  uri: DB_URL,
  collection: "sessions",
});
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const now = Date.now().toString();
    cb(null, `${now}-${file.originalname}`);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
// for any non-get request, this protection will look for the existence of a csrf token
// in the  views
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  // if the operation is sync, use throw
  // throw new Error("Sync Dummy");
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }

      // recreate mongoose User object from plain user object the from session
      req.user = user;
      next();
    })
    .catch((err) => {
      // if the operation is async, use next
      next(err);
    });
});

app.use(shopRoutes);
// use /admin filter for admin-related routes
app.use("/admin", adminRoutes);
app.use(authRoutes);
app.get("/500", errorController.get500);

app.use(errorController.get404);

// error handling middleware
app.use((error, req, res, next) => {
  // can lead to infinite loop request
  // res.redirect("/500")

  // can also doing it like this
  // res.status(error.httpStatusCode).render(...);

  res.status(500).render("500", {
    pageTitle: "Server Error",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(DB_URL)
  .then(() => {
    app.listen(process.env.PORT, process.env.HOST, () => {
      console.log(
        `Server running at http://${process.env.HOST}:${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.log(err);
  });
