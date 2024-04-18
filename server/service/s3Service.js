// s3Service.js

const AWS = require("aws-sdk");
const fs = require("fs");
const env = require("dotenv");
env.config();

// Set up AWS S3 configuration
AWS.config.update({
	region: "ap-east-1",
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Create a new instance of the S3 class
const s3 = new AWS.S3();

// Define the uploadFileToS3 function
const uploadFileToS3 = async (file, key) => {
	const params = {
		Bucket: "wongnok", // Your bucket name
		Key: key, // Specify the key for the file
		Body: file.data, // Read the file from local filesystem
		ACL: "public-read", // Specify the access control for the file
	};

	try {
		const data = await s3.upload(params).promise();
		console.log("File uploaded successfully:", data.Location);
		const filename = key.substring(key.lastIndexOf("/") + 1);
		return filename; // Return the S3 file URL
	} catch (error) {
		console.error("Error uploading file:", error);
		throw error; // Rethrow the error
	}
};

module.exports = { uploadFileToS3 };
