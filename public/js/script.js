// Check if dark mode preference is stored in local storage
let isDarkMode = localStorage.getItem("darkMode");

// Set default value if dark mode preference is not stored
if (!isDarkMode) {
	// Set default value to false (light mode)
	isDarkMode = "disabled";
	// Save default value to local storage
	localStorage.setItem("darkMode", isDarkMode);
}

// Function to enable dark mode
function enableDarkMode() {
	// Add 'dark-mode' class to the body
	document.body.classList.add("dark-mode");
	// Save dark mode preference to local storage
	localStorage.setItem("darkMode", "enabled");
}

// Function to disable dark mode
function disableDarkMode() {
	// Remove 'dark-mode' class from the body
	document.body.classList.remove("dark-mode");
	// Update dark mode preference in local storage
	localStorage.setItem("darkMode", "disabled");
}

// Toggle dark mode based on the stored preference
if (isDarkMode === "enabled") {
	enableDarkMode();
} else {
	disableDarkMode();
}

// Event listener to toggle dark mode when the toggle button is clicked
document.getElementById("modeToggleBtn").addEventListener("click", () => {
	if (document.body.classList.contains("dark-mode")) {
		// If dark mode is enabled, disable it
		disableDarkMode();
	} else {
		// If dark mode is disabled, enable it
		enableDarkMode();
	}
});

// Check if addIngredientsBtn exists
let addIngredientsBtn = document.getElementById("addIngredientsBtn");
if (addIngredientsBtn) {
	// If it exists, add the event listener
	addIngredientsBtn.addEventListener("click", function () {
		// Your event listener code here
		let ingredientList = document.querySelector(".ingredientList");
		let ingredeintDiv = document.querySelectorAll(".ingredientDiv")[0];
		if (ingredientList && ingredeintDiv) {
			let newIngredients = ingredeintDiv.cloneNode(true);
			let input = newIngredients.getElementsByTagName("input")[0];
			input.value = "";
			ingredientList.appendChild(newIngredients);
		} else {
			console.log("Ingredient list or ingredient div not found.");
		}
	});
} else {
	console.log("Add ingredients button not found.");
}
