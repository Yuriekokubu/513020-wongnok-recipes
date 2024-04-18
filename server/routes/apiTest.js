const express = require("express");
const apiTestRouter = express.Router();
const apiController = require("../controllers/apiController");

const verifyLogin = (req, res, next) => {
	if (req.session.userLoggedIn) {
		next();
	} else {
		res.redirect("/signin");
	}
};

apiTestRouter.get("/categories", apiController.exploreCategories);

apiTestRouter.post("/signup", apiController.signupPost);
apiTestRouter.post("/signin", apiController.signinPost);

apiTestRouter.post("/search", apiController.searchRecipe);

apiTestRouter.get("/allrecipes", verifyLogin, apiController.getAllRecipes);

apiTestRouter.post("/submit-recipe", verifyLogin, apiController.submitRecipePost);

apiTestRouter.post("/editRecipe/:id", verifyLogin, apiController.editRecipes);

apiTestRouter.delete("/deleteRecipe/:id", verifyLogin, apiController.deleteRecipe);

apiTestRouter.post("/rating/:recipeId", verifyLogin, apiController.rating);

apiTestRouter.get("/logout", (req, res) => {
	req.session.destroy();
	res.json({ message: "Logout successful" });
});

module.exports = apiTestRouter;
