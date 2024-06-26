const Category = require("../models/Category");
const { Recipe, difficultyEnumValues } = require("../models/Recipe");
const { fetchCategories } = require("./categoryController");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const env = require("dotenv");
const { uploadFileToS3 } = require("../service/s3Service");
env.config();

exports = module.exports.homepage = async (req, res) => {
	try {
		// res.locals.user = await req.session.user;
		let userId = await req.session.userId;
		let userName = await req.session.username;
		const limitNumber = 5;
		const categories = await Category.find({}).limit(limitNumber);
		const latest = await Recipe.find({}).sort({ _id: -1 }).limit(limitNumber);

		const thai = await Recipe.find({ category: "Thai" }).limit(limitNumber);
		const chinese = await Recipe.find({ category: "Chinese" }).limit(limitNumber);
		const mexico = await Recipe.find({ category: "Mexico" }).limit(limitNumber);
		const indian = await Recipe.find({ category: "Indian" }).limit(limitNumber);
		const italian = await Recipe.find({ category: "Italian" }).limit(limitNumber);
		const american = await Recipe.find({ category: "American" }).limit(limitNumber);

		const food = { latest, thai, chinese, indian, mexico, italian, american };
		res.render("index", { title: "Wongnok Recipe - Home", categories, food, userId, userName });
	} catch (error) {
		res.status(500).send({ message: error.message || "Error Occured" });
	}
};

exports = module.exports.exploreCategories = async (req, res) => {
	try {
		const limitNumber = 20;
		const categories = await Category.find({}).limit(limitNumber);
		res.render("categories", { title: "Cooking Blog - Categories", categories });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.exploreCategoriesById = async (req, res) => {
	try {
		let categoryId = req.params.id;
		const limitNumber = 20;
		const categoriesId = await Recipe.find({ category: categoryId }).limit(limitNumber);

		res.render("categories", { title: "Cooking Blog - Category", categoriesId });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

module.exports.exploreRecipes = async (req, res) => {
	try {
		let recipeId = req.params.id;
		const recipe = await Recipe.findById(recipeId).populate("user", "name");

		// Calculate the total number of raters
		const totalRaters = recipe.ratings.length;

		// Calculate the average rating for the recipe
		let averageRating = 0;
		if (totalRaters > 0) {
			const totalRating = recipe.ratings.reduce((acc, rating) => acc + rating.value, 0);
			averageRating = totalRating / totalRaters;
		}

		averageRating = averageRating.toFixed(2);

		// Send the recipe data along with the totalRaters and averageRating to the rendering engine
		res.render("recipe", { title: "Cooking Blog - Recipe", recipe, totalRaters, averageRating });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occurred" });
	}
};

exports = module.exports.searchRecipe = async (req, res) => {
	try {
		let searchTerm = req.body.searchTerm;
		if (!searchTerm) {
			// Handle empty search term
			return res.render("search", { title: "Cooking Blog - Search", recipe: [] }); // Render with empty recipe array
		}
		// Find recipes whose titles contain the search term using a regular expression with diacritic sensitivity
		let recipe = await Recipe.find({ name: { $regex: new RegExp(searchTerm, "i") } });

		res.render("search", { title: "Cooking Blog - Search", recipe });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occurred" });
	}
};

exports = module.exports.exploreLatest = async (req, res) => {
	try {
		const limitNumber = 20;
		const recipe = await Recipe.find({}).sort({ _id: -1 }).limit(limitNumber);

		res.render("explore-latest", { title: "Cooking Blog - Explore Latest", recipe });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.exploreRandom = async (req, res) => {
	try {
		let count = await Recipe.find().countDocuments();
		let random = Math.floor(Math.random() * count);
		let recipe = await Recipe.findOne().skip(random).exec();
		res.render("explore-random", { title: "Cooking Blog - Explore Random", recipe });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.submitRecipe = async (req, res) => {
	try {
		const infoErrorsObj = req.flash("infoErrors");
		const infoSubmitObj = req.flash("infoSubmit");
		const categories = await fetchCategories();
		res.render("submit-recipe", { title: "Cooking Blog - Submit Recipe", infoErrorsObj, infoSubmitObj, difficultyEnumValues, categories });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};
exports = module.exports.submitRecipePost = async (req, res) => {
	try {
		let newImageName;

		if (!req.files || Object.keys(req.files).length === 0) {
			console.log("No Files were uploaded.");
		} else {
			const imageUploadFile = req.files.image;
			newImageName = await uploadFileToS3(imageUploadFile, `public/uploads/${Date.now()}_${imageUploadFile.name}`);
		}

		// Create a new recipe object
		const newRecipe = new Recipe({
			name: req.body.name,
			description: req.body.description,
			instructions: req.body.instructions,
			ingredients: req.body.ingredients,
			category: req.body.category,
			duration: req.body.duration,
			image: newImageName,
			user: req.session.userId,
			difficulty: req.body.difficulty,
		});

		// Save the new recipe object
		await newRecipe.save();

		req.flash("infoSubmit", "Recipe has been added.");
		res.redirect("/submit-recipe");
	} catch (error) {
		req.flash("infoErrors", error.message);
		res.redirect("/submit-recipe");
	}
};

exports = module.exports.signupPost = async (req, res) => {
	User.findOne({ email: req.body.email }).exec(async (error, user) => {
		if (user) {
			req.flash("infoErrors", "User already registered");
			return res.redirect("/signup");
		}
		const { name, email, password, description } = req.body;
		const hash_password = await bcrypt.hash(password, 10);
		const _user = new User({
			name,
			email,
			hash_password: hash_password,
			description: description,
		});
		await _user.save();

		req.flash("infoSubmit", "Registered Successfully");
		res.redirect("/signin");
	});
};

exports = module.exports.signUp = async (req, res) => {
	try {
		const infoErrorsObj = req.flash("infoErrors");
		const infoSubmitObj = req.flash("infoSubmit");
		res.render("signup", { title: "Cooking Blog - Sign Up", infoErrorsObj, infoSubmitObj });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.signIn = async (req, res) => {
	try {
		const infoErrorsObj = req.flash("infoErrors");
		const infoSubmitObj = req.flash("infoSubmit");
		console.log(infoErrorsObj, infoSubmitObj);
		res.render("signin", { title: "Cooking Blog - Sign In", infoErrorsObj, infoSubmitObj });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.signinPost = async (req, res) => {
	try {
		const user = await User.findOne({ email: req.body.email });

		if (!user) {
			req.flash("infoErrors", "User does not exist");
			return res.redirect("/signin");
		}

		const isPasswordValid = await user.authenticate(req.body.password);

		if (!isPasswordValid) {
			req.flash("infoErrors", "Email or password is incorrect");
			return res.redirect("/signin");
		}

		req.session.userId = user._id;
		req.session.username = user.name;
		req.session.userLoggedIn = true;
		req.session.userImageURL = user.image;

		res.redirect("/");
	} catch (error) {
		console.error("Error during signin:", error);
		req.flash("infoErrors", "An unexpected error occurred");
		res.redirect("/signin");
	}
};

module.exports.allRecipes = async (req, res) => {
	try {
		const recipes = await Recipe.find({});

		res.render("allrecipes", { title: "Cooking Blog - Recipes", recipes });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

module.exports.getAllRecipes = async (req, res) => {
	try {
		const recipes = await Recipe.find({});

		res.json(recipes);
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

module.exports.userProfile = (req, res) => {
	try {
		let count = 0;
		User.findOne({ _id: req.session.userId }).exec(async (error, user) => {
			if (error) console.log(error);
			if (user) {
				let recipe = await Recipe.find({ user: ObjectId(user._id) });
				if (recipe) {
					count = recipe.length;
				}
				const categories = await Category.find({}).exec();
				res.render("userProfile", { user, count, recipe, difficultyEnumValues, categories });
			} else {
				// req.flash('infoErrors', "Something went wrong")
				console.log(error);
			}
		});
	} catch (error) {
		console.log(error);
		req.flash("infoErrors", error);
	}
};

module.exports.Profile = async (req, res) => {
	try {
		let newImageName;

		if (!req.files || Object.keys(req.files).length === 0) {
			console.log("No Files were uploaded.");
		} else {
			const imageUploadFile = req.files.image;
			newImageName = await uploadFileToS3(imageUploadFile, `public/uploads/${Date.now()}_${imageUploadFile.name}`);
		}

		// Update the user's profile with the new image name
		await User.updateOne({ _id: ObjectId(req.session.userId) }, { $set: { image: newImageName } }, { upsert: true });

		res.redirect("/profile");
	} catch (error) {
		console.log(error);
		req.flash("infoErrors", error.message);
		res.redirect("/profile");
	}
};

exports = module.exports.viewRecipe = async (req, res) => {
	try {
		const recipe_id = req.params.id;
		const recipeItem = await Recipe.find({ _id: recipe_id });
		res.json({ status: true, result: recipeItem });
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

module.exports.editRecipes = async (req, res) => {
	const recipe_id = req.params.id;
	const recipeItem = await Recipe.findById(recipe_id); // Use findById directly since you are querying by ID
	let ingredientsArray;
	// Check if a new image file was uploaded
	let newImageName;
	if (!req.files || Object.keys(req.files).length === 0) {
		console.log("No Files were uploaded.");
	} else {
		const imageUploadFile = req.files.image;
		newImageName = await uploadFileToS3(imageUploadFile, `public/uploads/${Date.now()}_${imageUploadFile.name}`);
	}

	if (req.body.ingredients) {
		ingredientsArray = req.body.ingredients.split(",");
	}

	// Prepare the update object with the fields that need to be updated
	const updateObj = {
		name: req.body.name || recipeItem.name,
		description: req.body.description || recipeItem.description,
		instructions: req.body.instructions || recipeItem.instructions,
		ingredients: req.body.ingredients ? ingredientsArray : recipeItem.ingredients,
		category: req.body.category || recipeItem.category,
		duration: req.body.duration || recipeItem.duration,
		difficulty: req.body.difficulty || recipeItem.duration,
	};

	// Only update the image field if a new image was uploaded
	if (newImageName) {
		updateObj.image = newImageName;
	}

	// Update the recipe using findByIdAndUpdate
	const updatedRecipe = await Recipe.findByIdAndUpdate(recipe_id, updateObj, { new: true });

	res.redirect("/profile");
};

module.exports.deleteRecipe = async (req, res) => {
	let id = req.params.id;

	await Recipe.deleteOne({ _id: ObjectId(id) }).then((response) => {
		// console.log("response ", response)
		res.json({ status: true });
	});
};

module.exports.rating = async (req, res) => {
	try {
        let recipeId = req.params.recipeId;
        let userId = req.session.userId;
        let ratingValue = req.body.ratingValue;

        // Check if the user is the owner of the recipe
        const recipe = await Recipe.findById(recipeId);
        if (recipe.user.equals(userId)) {
            return res.status(400).json({ error: "You cannot rate your own recipe" });
        }

        // Check if the user has already rated the recipe
        const existingRating = recipe.ratings.find((rating) => rating.user.equals(userId));
        if (existingRating) {
            return res.status(400).json({ error: "You have already rated this recipe" });
        }

        // Add rating to the recipe
        await Recipe.findOneAndUpdate(
            { _id: recipeId },
            { $addToSet: { ratings: { user: userId, value: ratingValue } } },
            { upsert: true, new: true }
        );

        // Get the updated recipe with the latest ratings
        const updatedRecipe = await Recipe.findById(recipeId);
        const latestRatingScore = calculateAverageRating(updatedRecipe.ratings);
        const totalVoters = updatedRecipe.ratings.length;

        // Send the latest rating score to the client
        res.status(200).json({ message: "Rating added successfully", latestRating: latestRatingScore, totalVoters: totalVoters });
    } catch (error) {
        console.error("Error adding rating:", error);
        res.status(500).json({ error: "Error adding rating" });
    }
};

function calculateAverageRating(ratings) {
	if (ratings.length === 0) {
		return 0;
	}

	const totalRating = ratings.reduce((accumulator, rating) => accumulator + rating.value, 0);
	const averageRating = totalRating / ratings.length;
	return Math.round(averageRating * 100) / 100; // Round to two decimal places
}

module.exports.filterRating = async (req, res) => {
	try {
		const ratingValue = parseInt(req.params.minRating);
		const roundedRating = Math.floor(ratingValue); // Round down to the nearest integer

		const filteredResults = await Recipe.aggregate([
			{
				$addFields: {
					averageRating: {
						$avg: {
							$map: {
								input: "$ratings",
								as: "rating",
								in: { $floor: "$$rating.value" }, // Round down each rating value
							},
						},
					},
				},
			},
			{ $match: { averageRating: { $gte: ratingValue, $lt: ratingValue + 1 } } },
		]);
		res.json(filteredResults);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

module.exports.FindDuration = async (req, res) => {
	try {
		const durationValue = parseInt(req.params.duration);
		const minDuration = Math.floor(durationValue / 10) * 10; // Calculate the lower bound
		const maxDuration = minDuration + 9; // Calculate the upper bound

		const filteredResults = await Recipe.aggregate([
			{
				$match: { duration: { $gte: minDuration, $lt: maxDuration } }, // Match documents where the duration falls within the specified range
			},
		]);
		res.json(filteredResults);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

module.exports.FilterByDifficulty = async (req, res) => {
	const diffParams = req.body.difficulty;
	try {
		// Find recipes with the specified difficulty
		const recipes = await Recipe.find({ difficulty: diffParams });
		// Return the filtered recipes
		res.status(200).json({ success: true, recipes });
	} catch (error) {
		// Handle any errors
		console.error("Error filtering recipes by difficulty:", error);
		res.status(500).json({ success: false, message: "Internal server error" });
	}
};
