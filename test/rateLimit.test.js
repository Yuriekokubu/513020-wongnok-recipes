// rateLimit.test.js
const request = require("supertest");
const app = require("../app");

describe("Rate Limiting Middleware", () => {
	it("should limit the number of requests per time interval", async () => {
		// Define the request body
		const requestBody = {
			searchTerm: "ตะ",
		};

		// Send multiple POST requests to the API endpoint with the request body
		const responsePromises = Array.from({ length: 90 }, () => request(app).post("/api/search").send(requestBody));

		// Wait for all requests to complete
		const responses = await Promise.all(responsePromises);

		// Check the responses
		responses.forEach((res, index) => {
			if (index < 100) {
				// Expect the first 100 requests to succeed
				expect(res.status).toBe(200);
			} else {
				// Expect subsequent requests to be rate-limited
				expect(res.status).toBe(429);
				expect(res.body).toHaveProperty("message", "Too many requests from this IP, please try again later");
			}
		});
	});
});
// jest --detectOpenHandles