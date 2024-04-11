const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const app = express();
const env = require("dotenv");
const path = require("path");
const routes = require("./server/routes/recipeRoutes");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
env.config();

app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.use(express.json());
app.use(cookieParser("CookingBlogSecure"));
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		saveUninitialized: true,
		resave: false,
	})
);

app.use(function (req, res, next) {
	res.locals.userId = req.session.userId;
	res.locals.userName = req.session.username;
	res.locals.userImageURL = req.session.userImageURL;
	next();
});

app.use(flash());
app.use(fileUpload());

app.set("layout", "./layouts/main");
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/", routes);
require("./server/models/Category");
require("./server/models/Recipe");
require("./server/models/User");

// Serve static files from Amazon S3 bucket
app.use("/public", express.static("https://wongnok.s3.ap-east-1.amazonaws.com"));

app.listen(port, "0.0.0.0", () => {
	console.log(`Server running on port ${port}`);
	mongoose
		.connect(`${process.env.MONGOURI}`, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log("Connected to MongoDB");
		})
		.catch((err) => {
			console.error("Error connecting to MongoDB:", err);
		});
});
