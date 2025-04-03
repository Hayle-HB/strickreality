const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfControllers");

// Generate invoice PDF
router.post("/generate-invoice", pdfController.generateInvoice);

module.exports = router;
