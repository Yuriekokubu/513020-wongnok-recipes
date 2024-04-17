const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const recipeSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: "This field is required",
		},
		description: {
			type: String,
			required: "This field is required",
		},
		email: {
			type: String,
			// required: "This field is required",
		},
		instructions: {
			type: String,
			required: "This field is required",
		},
		ingredients: {
			type: Array,
			required: "This field is required",
		},
		category: {
			type: String,
			enum: ["Thai", "American", "Chinese", "Indian", "Mexican", "Italian"],
			required: "This field is required",
		},
		duration: {
			type: Number, // Assuming cooking duration is in minutes
			required: true, // You can change this to false if not required
		},
		image: {
			type: String,
			required: "This field is required",
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		ratings: [
			{
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
					required: true,
				},
				value: {
					type: Number,
					required: true,
					min: 1,
					max: 5,
				},
			},
		],
		totalRating: {
			type: Number,
			default: 0,
		},
		averageScore: {
			type: Number,
			default: 0,
		},
		difficulty: {
			type: String,
			enum: ["easy", "medium", "hard"],
			required: true,
		},
	},
	{ timestamps: true }
);
recipeSchema.index({ name: "text", description: "text" });
// recipeSchema.index({'$**': 'text'})

// Calculate total rating and average score before saving
recipeSchema.pre("save", async function (next) {
	try {
		let totalRating = 0;
		this.ratings.forEach((rating) => {
			totalRating += rating.value;
		});
		this.totalRating = totalRating;
		if (this.ratings.length > 0) {
			this.averageScore = totalRating / this.ratings.length;
		}
		next();
	} catch (error) {
		next(error);
	}
});
const difficultyEnumValues = recipeSchema.path("difficulty").enumValues;
module.exports = {
	Recipe: mongoose.model("Recipe", recipeSchema),
	difficultyEnumValues: difficultyEnumValues,
};
