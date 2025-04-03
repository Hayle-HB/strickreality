const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// Function to read and update invoice tracker
const updateInvoiceTracker = (customerName) => {
  const trackerPath = path.join(
    __dirname,
    "../public/data/InvoiceID_Tracker.json"
  );
  const trackerData = JSON.parse(fs.readFileSync(trackerPath, "utf8"));

  // Increment the last invoice number
  const newInvoiceNumber = trackerData.last_invoice_number + 1;

  // Add new invoice to the list
  trackerData.invoices.push({
    number: newInvoiceNumber,
    date: new Date().toISOString().split("T")[0],
    client: customerName,
  });

  // Update the last invoice number
  trackerData.last_invoice_number = newInvoiceNumber;

  // Write back to file
  fs.writeFileSync(trackerPath, JSON.stringify(trackerData, null, 2));

  return newInvoiceNumber;
};

const generateInvoice = async (req, res) => {
  try {
    console.log("Received Invoice Data:", {
      customerName: req.body.customerName,
      items: req.body.items,
      amountPaid: req.body.amountPaid,
      summary: {
        grossAmount: req.body.grossAmount,
        managementFee: req.body.managementFee,
        totalAmount: req.body.totalAmount,
      },
    });

    // Get new invoice number and update tracker
    const invoiceNumber = updateInvoiceTracker(req.body.customerName);

    // Generate PDF with invoice number
    const pdfBuffer = await generateInvoicePDF(req.body, invoiceNumber);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${req.body.customerName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${invoiceNumber}.pdf`
    );

    // Send the PDF buffer as response
    res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Error processing invoice:", error);
    res.status(500).json({
      error: "Failed to process invoice",
      message: error.message,
    });
  }
};

const generateInvoicePDF = async (data, invoiceNumber) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 10px 40px;
                        color: #333;
                        position: relative;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 20px;
                        position: relative;
                    }
                    .invoice-left {
                        margin-top: 5px;
                        position: relative;
                        z-index: 1;
                    }
                    .invoice-title {
                        font-size: 48px;
                        font-weight: bold;
                        margin: 0;
                        color: #000;
                    }
                    .invoice-details {
                        margin: 5px 0;
                    }
                    .company-info {
                        text-align: right;
                        margin-top: -60px;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        gap: 2px;
                        position: relative;
                        z-index: 2;
                    }
                    .company-logo {
                        width: 280px;
                        height: auto;
                        margin-bottom: 2px;
                        display: block;
                        margin-top: -30px;
                    }
                    .company-address {
                        margin: 0;
                        font-size: 14px;
                        line-height: 1.2;
                        margin-top: -5px;
                    }
                    .invoice-number {
                        color: #B01E23;
                        font-weight: normal;
                        font-size: 14px;
                    }
                    .invoice-number-value {
                        background: #f5f5f5;
                        padding: 3px 8px;
                        color: #000;
                        font-weight: normal;
                    }
                    .date-row {
                        margin-top: 5px;
                    }
                    .date-label {
                        font-weight: bold;
                        color: #000;
                        font-size: 14px;
                    }
                    .date-value {
                        background: #f5f5f5;
                        padding: 3px 8px;
                        color: #000;
                        font-weight: normal;
                    }
                    .invoice-details {
                        background: #f5f5f5;
                        padding: 5px 10px;
                        margin: 20px 0;
                    }
                    .invoice-details div {
                        margin: 5px 0;
                    }
                    .bill-container {
                        display: flex;
                        gap: 20px;
                        margin: 20px 0;
                    }
                    .bill-section {
                        flex: 1;
                    }
                    .bill-header {
                        background: #B01E23;
                        color: white;
                        padding: 8px 15px;
                        display: flex;
                    }
                    .bill-header span {
                        flex: 1;
                    }
                    .bill-header span:first-child {
                        font-weight: 600;
                    }
                    .bill-header span:last-child {
                        font-weight: 700;
                    }
                    .bill-content {
                        background: #f5f5f5;
                        padding: 15px;
                        line-height: 1.5;
                    }
                    .bill-content-container {
                        display: flex;
                    }
                    .bill-content-left {
                        flex: 1;
                        border-right: 1px solid #ddd;
                        padding-right: 15px;
                    }
                    .bill-content-right {
                        flex: 1;
                        padding-left: 15px;
                        font-weight: 700;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 0;
                        border: 1px solid #000;
                    }
                    th {
                        background: #B01E23;
                        color: white;
                        padding: 8px 15px;
                        text-align: left;
                    }
                    th:last-child {
                        border-left: 1px solid #000;
                    }
                    td {
                        padding: 8px 15px;
                    }
                    td:last-child {
                        text-align: right;
                        border-left: 1px solid #000;
                    }
                    .cost-column {
                        text-align: right;
                    }
                    .summary {
                        width: 100%;
                        margin-top: 0;
                        position: relative;
                    }
                    .summary::before {
                        content: '';
                        position: absolute;
                        left: calc(100% - 151px);
                        top: 0;
                        bottom: 0;
                        width: 1px;
                        background: #000;
                        height: 100%;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                    }
                    .summary-label {
                        text-align: right;
                        padding: 8px 15px;
                        flex: 1;
                        font-weight: bold;
                    }
                    .summary-value {
                        text-align: right;
                        padding: 8px 15px;
                        width: 120px;
                        position: relative;
                        background: white;
                        border-right: 1px solid #000;
                    }
                    .summary-value::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 1px;
                        background: #000;
                    }
                    .summary-row:last-child .summary-value::after {
                        display: none;
                    }
                    .summary-row.final-total {
                        color: #B01E23;
                    }
                    .payment-section {
                        margin-top: 30px;
                        background: #f5f5f5;
                        padding: 15px;
                    }
                    .payment-header {
                        color: #B01E23;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="invoice-left">
                        <h1 class="invoice-title">INVOICE</h1>
                        <div class="invoice-details">
                            <div>
                                <span class="invoice-number">INVOICE</span>
                                <span class="invoice-number-value">#${String(
                                  invoiceNumber
                                ).padStart(8, "0")}</span>
                            </div>
                            <div class="date-row">
                                <span class="date-label">DATE:</span>
                                <span class="date-value">${new Date().toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "long",
                                    day: "2-digit",
                                    year: "numeric",
                                  }
                                )}</span>
                            </div>
                        </div>
                    </div>
                    <div class="company-info">
                        <svg class="company-logo" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 508.000000 358.000000" preserveAspectRatio="xMidYMid meet">
                            <g transform="translate(0.000000,358.000000) scale(0.100000,-0.100000)" fill="#b01e23" stroke="none">
                                <path d="M1615 1858 c-3 -18 -16 -105 -30 -193 -14 -88 -27 -175 -30 -192 l-6 -33 66 0 65 0 0 30 c0 17 4 30 9 30 5 0 14 -13 21 -30 12 -29 14 -30 81 -30 38 0 69 4 69 8 0 4 -11 23 -24 42 l-24 35 86 88 87 87 -82 0 -81 0 -61 -67 c-71 -79 -70 -84 -38 115 l23 142 -62 0 -63 0 -6 -32z"/>
                                <path d="M3812 1683 c-18 -115 -32 -216 -32 -225 0 -15 10 -18 59 -18 57 0 60 1 65 28 7 33 66 406 66 415 0 4 -28 7 -63 7 l-63 0 -32 -207z"/>
                                <path d="M505 1856 c-58 -26 -95 -85 -95 -152 0 -57 24 -90 99 -133 76 -45 86 -59 65 -90 -24 -34 -94 -23 -142 22 l-23 22 -20 -25 c-50 -63 -58 -60 140 -60 123 0 182 4 187 11 14 23 7 115 -11 143 -10 15 -49 45 -86 67 -72 42 -87 69 -50 89 29 15 45 13 85 -15 l36 -24 29 51 c17 29 28 55 26 59 -3 4 -25 16 -50 28 -52 24 -143 28 -190 7z"/>
                                <path d="M1397 1852 c-10 -10 -17 -32 -17 -49 0 -55 59 -81 108 -47 28 19 30 74 4 97 -25 22 -75 21 -95 -1z"/>
                                <path d="M2476 1833 c-3 -16 -17 -102 -31 -193 -14 -91 -27 -173 -29 -182 -4 -16 4 -18 65 -18 l69 0 6 40 c4 22 9 40 13 40 3 0 15 -17 26 -38 20 -37 20 -37 93 -40 39 -2 72 0 72 3 0 3 -13 26 -30 53 l-29 47 37 16 c73 31 112 105 98 182 -16 88 -75 116 -238 117 l-116 0 -6 -27z m214 -93 c51 -51 1 -120 -88 -120 -24 0 -24 1 -17 57 4 31 9 62 12 70 8 20 70 16 93 -7z"/>
                                <path d="M845 1778 c-2 -13 -6 -34 -7 -48 -2 -20 -9 -26 -35 -28 -26 -3 -33 -8 -33 -25 0 -12 -3 -32 -6 -44 -6 -20 -3 -23 26 -23 29 0 31 -2 26 -27 -3 -16 -8 -46 -12 -68 -3 -22 -8 -48 -11 -57 -4 -16 4 -18 60 -18 l65 0 13 85 12 85 34 0 c21 0 33 5 33 14 0 7 3 28 6 45 6 29 5 31 -25 31 l-32 0 7 50 7 50 -62 0 c-55 0 -61 -2 -66 -22z"/>
                                <path d="M4056 1750 c-6 -47 -9 -50 -35 -50 -30 0 -41 -18 -41 -67 0 -18 6 -23 26 -23 29 0 29 2 8 -128 l-7 -43 64 3 63 3 12 78 c7 43 14 80 16 81 2 2 19 6 39 9 l36 5 24 -86 24 -87 91 -3 c65 -2 94 1 101 10 6 7 38 66 72 131 l63 117 -69 0 -68 0 -46 -98 -46 -97 -12 60 c-7 33 -17 77 -22 98 l-10 37 -81 0 -81 0 6 50 6 50 -63 0 -63 0 -7 -50z"/>
                                <path d="M1217 1690 c-30 -24 -37 -25 -37 -5 0 12 -13 15 -59 15 l-58 0 -17 -112 c-9 -62 -19 -121 -22 -130 -5 -16 2 -18 60 -18 62 0 66 1 66 23 0 38 20 97 41 118 12 12 33 19 58 19 37 0 39 1 45 39 3 22 9 46 12 55 9 24 -57 21 -89 -4z"/>
                                <path d="M2075 1693 c-74 -39 -108 -102 -103 -193 l3 -55 61 -3 61 -3 -5 31 -4 30 131 0 131 0 0 49 c0 56 -27 103 -79 138 -42 28 -148 32 -196 6z m145 -83 c38 -38 27 -50 -49 -50 -39 0 -72 4 -75 9 -3 5 5 20 19 35 29 32 76 35 105 6z"/>
                                <path d="M2965 1694 c-77 -42 -107 -98 -103 -187 l3 -62 58 -3 59 -3 -4 28 -3 28 134 3 133 3 -4 55 c-5 58 -24 93 -72 128 -37 28 -157 34 -201 10z m133 -80 c42 -29 28 -44 -43 -44 -36 0 -65 4 -65 9 0 14 50 51 69 51 9 0 27 -7 39 -16z"/>
                                <path d="M3410 1703 c-71 -27 -123 -118 -118 -205 l3 -53 79 -3 c78 -3 79 -2 63 16 -10 11 -17 35 -17 61 0 76 75 118 131 72 31 -25 31 -80 1 -121 l-23 -30 76 0 c41 0 75 3 75 8 0 10 29 191 36 225 l6 27 -60 0 c-53 0 -60 -3 -65 -21 -6 -22 -6 -22 -37 5 -26 21 -41 26 -83 25 -29 0 -59 -3 -67 -6z"/>
                                <path d="M1366 1688 c-6 -20 -36 -215 -36 -233 0 -13 11 -15 62 -13 l62 3 17 105 c27 160 30 150 -41 150 -40 0 -62 -4 -64 -12z"/>
                                <path d="M2225 1450 c-3 -5 1 -10 9 -10 9 0 16 5 16 10 0 6 -4 10 -9 10 -6 0 -13 -4 -16 -10z"/>
                                <path d="M3115 1450 c-3 -5 1 -10 9 -10 9 0 16 5 16 10 0 6 -4 10 -9 10 -6 0 -13 -4 -16 -10z"/>
                                <path d="M350 1405 c0 -3 21 -19 47 -35 41 -26 56 -30 120 -30 76 0 133 19 162 54 12 14 -3 16 -158 16 -94 0 -171 -2 -171 -5z"/>
                                <path d="M787 1403 c-4 -3 -7 -17 -7 -30 0 -23 2 -24 63 -21 59 3 62 4 65 31 3 27 3 27 -56 27 -32 0 -62 -3 -65 -7z"/>
                                <path d="M1017 1403 c-4 -3 -7 -17 -7 -30 0 -21 4 -23 59 -23 44 0 60 4 65 16 15 38 8 44 -52 44 -32 0 -62 -3 -65 -7z"/>
                                <path d="M1320 1396 c0 -8 -3 -21 -6 -30 -5 -14 4 -16 60 -16 50 0 66 3 66 14 0 8 3 21 6 30 5 14 -4 16 -60 16 -50 0 -66 -3 -66 -14z"/>
                                <path d="M1540 1380 l0 -30 60 0 c33 0 60 3 60 8 0 4 3 17 6 30 6 21 4 22 -60 22 l-66 0 0 -30z"/>
                                <path d="M1757 1380 c17 -29 20 -30 90 -30 40 0 73 2 73 5 0 3 -7 17 -16 30 -15 23 -23 25 -91 25 l-74 0 18 -30z"/>
                                <path d="M2006 1389 c42 -47 121 -66 198 -49 53 12 110 46 101 61 -4 5 -76 9 -162 9 l-156 0 19 -21z"/>
                                <path d="M2406 1394 c-15 -39 -8 -44 64 -44 l70 0 0 30 0 30 -64 0 c-49 0 -65 -4 -70 -16z"/>
                                <path d="M2648 1380 c17 -29 19 -30 95 -30 l78 0 -18 30 c-17 29 -19 30 -95 30 l-77 0 17 -30z"/>
                                <path d="M2896 1389 c34 -37 76 -53 144 -53 71 0 150 31 150 59 0 13 -25 15 -157 15 l-156 0 19 -21z"/>
                                <path d="M3319 1391 c28 -52 143 -71 194 -31 30 24 37 25 37 5 0 -13 11 -15 58 -13 54 3 57 4 60 31 l3 27 -181 0 c-173 0 -180 -1 -171 -19z"/>
                                <path d="M3766 1394 c-15 -39 -8 -44 59 -44 l65 0 0 30 c0 30 0 30 -59 30 -44 0 -60 -4 -65 -16z"/>
                                <path d="M3998 1380 l-5 -30 64 0 c48 0 63 3 63 14 0 8 3 21 6 30 5 14 -4 16 -59 16 -64 0 -65 0 -69 -30z"/>
                                <path d="M4304 1387 c4 -16 -9 -46 -44 -106 -28 -45 -50 -84 -50 -87 0 -2 29 -4 64 -4 l64 0 56 104 c31 57 56 107 56 110 0 3 -34 6 -76 6 -74 0 -76 -1 -70 -23z"/>
                            </g>
                        </svg>
                        <div class="company-address">13831 SW 50th St</div>
                        <div class="company-address">Suite 201 Miami, FL 33183</div>
                        <div class="company-address">(305) 330-2305</div>
                    </div>
                </div>
                
                <div class="bill-container">
                    <div class="bill-section">
                        <div class="bill-header">
                            <span>BILL FROM:</span>
                            <span>BILL TO:</span>
                        </div>
                        <div class="bill-content-container">
                            <div class="bill-content bill-content-left">
                                <div>Strike Realty LLC</div>
                                <div>13831 SW 59th St</div>
                                <div>Miami, FL 33183</div>
                                <div>(305) 330-2305</div>
                            </div>
                            <div class="bill-content bill-content-right">
                                <div>${data.customerName}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            <th>COST</th>
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
                    <div class="summary-row">
                        <div class="summary-label">GROSS AMOUNT</div>
                        <div class="summary-value">$${data.grossAmount.toFixed(
                          2
                        )}</div>
                    </div>
                    <div class="summary-row">
                        <div class="summary-label">PROJECT MANAGEMENT FEE (10%)</div>
                        <div class="summary-value">+ $${data.managementFee.toFixed(
                          2
                        )}</div>
                    </div>
                    <div class="summary-row">
                        <div class="summary-label">TOTAL</div>
                        <div class="summary-value">$${data.totalAmount.toFixed(
                          2
                        )}</div>
                    </div>
                    <div class="summary-row">
                        <div class="summary-label">PAID</div>
                        <div class="summary-value">- $${data.amountPaid.toFixed(
                          2
                        )}</div>
                    </div>
                    <div class="summary-row final-total">
                        <div class="summary-label">TOTAL</div>
                        <div class="summary-value">$${(
                          data.totalAmount - data.amountPaid
                        ).toFixed(2)}</div>
                    </div>
                </div>

                <div class="payment-section">
                    <div class="payment-header">PAYMENT METHOD</div>
                    <div><strong>Bank Name:</strong></div>
                    <div>Regions Bank–Wells Fargo–Zelle</div>
                    <div><strong>Account Number:</strong></div>
                    <div>Upon Request</div>
                </div>
            </body>
            </html>
        `;

    await page.setContent(htmlContent);

    // Generate PDF as buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF: " + error.message);
  }
};

module.exports = {
  generateInvoice,
};
