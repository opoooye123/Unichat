const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const verifyJWT = require("../middleware/auth");

router.post("/submit", verifyJWT, reportController.submitReport);
router.get("/all", verifyJWT, reportController.getAllReports);

module.exports = router;
