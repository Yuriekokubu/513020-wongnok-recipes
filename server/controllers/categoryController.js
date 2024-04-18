// categoryController.js

const Category = require("../models/Category");

let categories = []; // Declare categories globally

// Function to fetch categories
const fetchCategories = async () => {
	try {
		if (categories.length === 0) {
			categories = await Category.find({}).exec();
		}
		return categories; // Return the fetched categories
	} catch (error) {
		console.log(error);
		throw error; // Rethrow the error
	}
};

module.exports = { categories, fetchCategories };
