const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const generateInvoicePDF = async (data) => {
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Create new page
    const page = await browser.newPage();

    // Set content
    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 40px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        color: #b01e23;
                    }
                    .invoice-info {
                        margin-bottom: 30px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th, td {
                        padding: 10px;
                        border: 1px solid #ddd;
                        text-align: left;
                    }
                    th {
                        background-color: #f5f5f5;
                    }
                    .summary {
                        margin-top: 30px;
                        float: right;
                        width: 300px;
                    }
                    .summary-item {
                        display: flex;
                        justify-content: space-between;
                        margin: 5px 0;
                    }
                    .total {
                        font-weight: bold;
                        border-top: 2px solid #333;
                        margin-top: 10px;
                        padding-top: 10px;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Strike Realty Invoice</h1>
                </div>
                
                <div class="invoice-info">
                    <p><strong>Bill To:</strong> ${data.customerName}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items
                          .map(
                            (item) => `
                            <tr>
                                <td>${item.description}</td>
                                <td>$${parseFloat(item.cost).toFixed(2)}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>

                <div class="summary">
                    <div class="summary-item">
                        <span>Gross Amount:</span>
                        <span>$${data.grossAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Management Fee (10%):</span>
                        <span>$${data.managementFee.toFixed(2)}</span>
                    </div>
                    <div class="summary-item total">
                        <span>Total Amount:</span>
                        <span>$${data.totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Amount Paid:</span>
                        <span>$${data.amountPaid.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p>This is a computer-generated invoice. No signature is required.</p>
                </div>
            </body>
            </html>
        `;

    // Set content to page
    await page.setContent(htmlContent);

    // Generate PDF
    const downloadsPath = path.join(
      process.env.HOME || process.env.USERPROFILE,
      "Downloads"
    );
    const pdfPath = path.join(downloadsPath, "invoiceDawitSeam.pdf");

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    // Close browser
    await browser.close();

    return {
      success: true,
      message: "PDF generated successfully",
      path: pdfPath,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
};

module.exports = { generateInvoicePDF };
