const Category = require("../models/Category");
const { Recipe, difficultyEnumValues, categoryEnumValues } = require("../models/Recipe");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { uploadFileToS3 } = require("../service/s3Service");
const { ObjectId } = require("mongodb");

exports = module.exports.exploreCategories = async (req, res) => {
	try {
		const limitNumber = 20;
		const categories = await Category.find({}).limit(limitNumber);
		res.status(200).json(categories);
	} catch (err) {
		res.status(500).send({ message: err.message || "Error Occured" });
	}
};

exports = module.exports.signupPost = async (req, res) => {
	try {
		const { name, email, password, description } = req.body;

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "User already exists" });
		}

		// Hash the password
		const hashPassword = await bcrypt.hash(password, 10);

		// Create new user
		const newUser = new User({
			name,
			email,
			hash_password: hashPassword,
			description,
		});

		// Save user to the database
		await newUser.save();

		return res.status(201).json({ message: "User created successfully" });
	} catch (error) {
		console.error("Error in signupPost:", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

exports = module.exports.signinPost = async (req, res) => {
	try {
		const user = await User.findOne({ email: req.body.email });

		if (!user) {
			return res.status(404).json({ message: "User does not exist" });
		}

		const isPasswordValid = await user.authenticate(req.body.password);

		if (!isPasswordValid) {
			return res.status(401).json({ message: "Email or password is incorrect" });
		}

		req.session.userId = user._id;
		req.session.username = user.name;
		req.session.userLoggedIn = true;
		req.session.userImageURL = user.image;

		res.status(200).json({ message: "Sign in successful" });
	} catch (error) {
		console.error("Error during signin:", error);
		return res.status(500).json({ message: "An unexpected error occurred" });
	}
};

exports = module.exports.searchRecipe = async (req, res) => {
	try {
		let searchTerm = req.body.searchTerm;
		if (!searchTerm) {
			// Handle empty search term
			return res.status(400).json({ message: "Search term is required" });
		}
		// Find recipes whose titles contain the search term using a regular expression with case insensitivity
		let recipes = await Recipe.find({ name: { $regex: new RegExp(searchTerm, "i") } });

		return res.status(200).json({ recipes });
	} catch (err) {
		console.error("Error occurred during recipe search:", err);
		return res.status(500).json({ message: "An unexpected error occurred" });
	}
};

exports = module.exports.submitRecipePost = async (req, res) => {
	try {
		let newImageName;

		if (!req.files || Object.keys(req.files).length === 0) {
			return res.status(400).json({ message: "No files were uploaded" });
		} else {
			const imageUploadFile = req.files.image;
			newImageName = await uploadFileToS3(imageUploadFile, `public/uploads/${Date.now()}_${imageUploadFile.name}`);
		}

		newImageName = newImageName || "";

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

		return res.status(201).json({ message: "Recipe has been added" });
	} catch (error) {
		console.error("Error occurred during recipe submission:", error);
		return res.status(500).json({ message: "An unexpected error occurred" });
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

module.exports.deleteRecipe = async (req, res) => {
	try {
		const userId = req.session.userId; // Get the user ID from the session

		// Ensure the user is logged in
		if (!userId) {
			return res.status(401).json({ error: "Unauthorized. Please sign in to delete a recipe." });
		}
		const recipeId = req.params.id; // Extract the recipe ID from the request parameters

		// Check if the provided recipe ID is a valid ObjectId
		if (!ObjectId.isValid(recipeId)) {
			return res.status(400).json({ error: "Invalid recipe ID" });
		}

		// Find the recipe by ID
		const recipe = await Recipe.findOne({ _id: ObjectId(recipeId) });

		// Check if the recipe exists
		if (!recipe) {
			return res.status(404).json({ error: "Recipe not found" });
		}

		// Check if the authenticated user is the owner of the recipe
		if (recipe.user.toString() !== userId) {
			return res.status(403).json({ error: "You are not authorized to delete this recipe" });
		}

		// Delete the recipe
		await Recipe.deleteOne({ _id: ObjectId(recipeId) });

		// Send a success response
		res.json({ success: true, message: "Recipe deleted successfully" });
	} catch (error) {
		console.error("Error deleting recipe:", error);
		res.status(500).json({ error: "An unexpected error occurred" });
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
		await Recipe.findOneAndUpdate({ _id: recipeId }, { $addToSet: { ratings: { user: userId, value: ratingValue } } }, { upsert: true, new: true });

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

module.exports.editRecipes = async (req, res) => {
	try {
		const recipeId = req.params.id;
		const recipeItem = await Recipe.findById(recipeId); // Use findById directly since you are querying by ID
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

		// Validate category
		const validCategories = categoryEnumValues;
		const category = req.body.category;
		if (category && !validCategories.includes(category)) {
			return res.status(400).json({ error: "Invalid category. Category must be one of: " + validCategories.join(", ") });
		}

		// Validate difficulty
		const validDifficulties = difficultyEnumValues;
		const difficulty = req.body.difficulty ? req.body.difficulty.toLowerCase() : undefined;
		if (difficulty && !validDifficulties.includes(difficulty)) {
			return res.status(400).json({ error: "Invalid difficulty. Difficulty must be one of: " + validDifficulties.join(", ") });
		}

		// Prepare the update object with the fields that need to be updated
		const updateObj = {
			name: req.body.name || recipeItem.name,
			description: req.body.description || recipeItem.description,
			instructions: req.body.instructions || recipeItem.instructions,
			ingredients: req.body.ingredients ? ingredientsArray : recipeItem.ingredients,
			category: category || recipeItem.category,
			duration: req.body.duration || recipeItem.duration,
			difficulty: req.body.difficulty || recipeItem.duration,
		};

		// Only update the image field if a new image was uploaded
		if (newImageName) {
			updateObj.image = newImageName;
		}

		// Update the recipe using findByIdAndUpdate
		const updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, updateObj, { new: true });

		// Send the updated recipe data as JSON response
		res.status(200).json({ message: "Recipe updated successfully", recipe: updatedRecipe });
	} catch (error) {
		console.error("Error updating recipe:", error);
		res.status(500).json({ error: "Error updating recipe" });
	}
};
