// Admin login update
const MAX_CLASSIC = 200;
const MAX_VIP = 25;
const MAX_PROOF_CHARS = 1500000;

async function setupDatabase(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT UNIQUE,
      ticket_type TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      payment_method TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_proof TEXT,
      ticket_status TEXT NOT NULL DEFAULT 'pending',
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `).run();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}

function generateReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "ILE-" + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function htmlPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ILE FESTIVAL — Tickets</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #050505;
  color: #fff;
  font-family: Arial, Helvetica, sans-serif;
}

.container {
  width: 100%;
  max-width: 760px;
  margin: auto;
  padding: 25px 18px 50px;
}

.logo {
  display: block;
  width: 145px;
  height: 145px;
  object-fit: contain;
  margin: 5px auto 15px;
}

h1 {
  text-align: center;
  margin: 0;
  font-size: 32px;
  letter-spacing: 1px;
}

.subtitle {
  text-align: center;
  color: #ccc;
  margin: 8px 0 28px;
}

.card {
  background: #111;
  border: 1px solid #2b2b2b;
  border-radius: 16px;
  padding: 22px;
  margin-bottom: 18px;
}

.ticket-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.ticket-option {
  border: 2px solid #333;
  border-radius: 14px;
  padding: 18px;
  cursor: pointer;
  transition: .2s;
}

.ticket-option:hover {
  border-color: #fff;
}

.ticket-option.selected {
  border-color: #fff;
  background: #1b1b1b;
}

.ticket-option input {
  display: none;
}

.ticket-name {
  font-size: 21px;
  font-weight: bold;
}

.price {
  font-size: 28px;
  margin: 8px 0;
}

.remaining {
  color: #aaa;
  font-size: 14px;
}

label {
  display: block;
  margin-top: 16px;
  margin-bottom: 7px;
  font-weight: bold;
}

input[type="text"],
input[type="tel"],
input[type="email"],
select {
  width: 100%;
  padding: 14px;
  border-radius: 9px;
  border: 1px solid #444;
  background: #080808;
  color: white;
  font-size: 16px;
}

button {
  width: 100%;
  padding: 15px;
  border: 0;
  border-radius: 10px;
  background: white;
  color: black;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
}

button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.notice {
  background: #191919;
  border-left: 4px solid #fff;
  padding: 14px;
  border-radius: 7px;
  color: #ccc;
  line-height: 1.5;
  margin-top: 18px;
}

.hidden {
  display: none !important;
}

.reference {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 1px;
  margin: 12px 0 20px;
}

.amount {
  text-align: center;
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0 25px;
}

.payment-methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.method {
  border: 2px solid #333;
  border-radius: 12px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
}

.method.selected {
  border-color: white;
  background: #1c1c1c;
}

.payment-qr {
  display: block;
  max-width: 300px;
  width: 100%;
  margin: 20px auto;
  border-radius: 12px;
  background: white;
}

.upload-box {
  border: 2px dashed #555;
  padding: 22px;
  border-radius: 12px;
  text-align: center;
  color: #bbb;
  margin-top: 18px;
}

.status {
  text-align: center;
  padding: 16px;
  border-radius: 10px;
  background: #171717;
  margin-top: 15px;
  color: #ddd;
}

.success {
  border: 1px solid #555;
}

.error {
  color: #ff8b8b;
  margin-top: 12px;
  text-align: center;
}

.small {
  color: #999;
  font-size: 13px;
  line-height: 1.5;
}

@media(max-width:600px) {
  .ticket-options,
  .payment-methods {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 27px;
  }

  .logo {
    width: 125px;
    height: 125px;
  }
}
</style>
</head>

<body>

<div class="container">

  <img class="logo" src="/LION.jpeg" alt="ILE FESTIVAL">

  <h1>ILE FESTIVAL</h1>
  <div class="subtitle">Official Event Ticketing</div>

  <!-- STEP 1 -->
  <section id="bookingSection">

    <div class="card">

      <h2>Select Your Ticket</h2>

      <div class="ticket-options">

        <label class="ticket-option selected" id="classicCard">
          <input type="radio" name="ticketType" value="Classic" checked>
          <div class="ticket-name">Classic</div>
          <div class="price">¥500</div>
          <div class="remaining">
            <span id="classicRemaining">200</span> remaining
          </div>
        </label>

        <label class="ticket-option" id="vipCard">
          <input type="radio" name="ticketType" value="VIP">
          <div class="ticket-name">VIP</div>
          <div class="price">¥1,000</div>
          <div class="remaining">
            <span id="vipRemaining">25</span> remaining
          </div>
        </label>

      </div>

      <label>Full name</label>
      <input id="guestName" type="text" placeholder="Enter your full name">

      <label>Phone number</label>
      <input id="phone" type="tel" placeholder="Enter your phone number">

      <label>Email</label>
      <input id="email" type="email" placeholder="Enter your email address">

      <div class="notice">
        After submitting your details, you will receive payment instructions.
        Your ticket becomes valid only after ILE FESTIVAL verifies your payment.
      </div>

      <button id="continueBtn" onclick="createTicket()">
        Continue to Payment
      </button>

      <div id="bookingError" class="error"></div>

    </div>

  </section>


  <!-- STEP 2 -->
  <section id="paymentSection" class="hidden">

    <div class="card">

      <h2 style="text-align:center;">Complete Your Payment</h2>

      <div class="reference" id="referenceText"></div>

      <div class="amount" id="amountText"></div>

      <div class="notice">
        Please pay the exact amount shown above using your selected payment
        method. After payment, upload a screenshot of your payment below.
      </div>

      <h3>Select Payment Method</h3>

      <div class="payment-methods">

        <div class="method selected" id="alipayMethod"
             onclick="selectPaymentMethod('Alipay')">
          Alipay
        </div>

        <div class="method" id="wechatMethod"
             onclick="selectPaymentMethod('WeChat')">
          WeChat Pay
        </div>

      </div>

      <img id="paymentQR"
           class="payment-qr"
           src="/ali.jpeg"
           alt="Payment QR code">

      <div class="small" style="text-align:center;">
        Scan the QR code above using the selected payment method.
      </div>

      <div class="upload-box">

        <div class="notice">
  <strong>Important — confirm the receiving account name</strong><br><br>
  <strong>Alipay:</strong> F. BORIS KANGHA<br>
  <strong>WeChat Pay:</strong> DASKETER<br><br>
  Please make sure the receiving account name shown on your payment
  screenshot matches the name for your selected payment method.
</div>

<label style="display:flex;align-items:flex-start;gap:10px;font-weight:normal;">
  <input
    id="receiverConfirmed"
    type="checkbox"
    style="width:20px;height:20px;margin-top:2px;flex-shrink:0;"
  >
  I confirm that the receiving account name shown on my screenshot
  matches the required name above.
</label>
        <strong>Upload Payment Screenshot</strong>

        <p class="small">
          Please upload a clear screenshot showing the successful payment.
          The system will compress the image before submitting it.
        </p>

        <input
          id="proofFile"
          type="file"
          accept="image/*"
          style="margin-top:12px;"
        >

      </div>

      <button id="submitProofBtn" onclick="submitPaymentProof()">
        Submit Payment Proof
      </button>

      <div id="paymentError" class="error"></div>

    </div>

  </section>


  <!-- STEP 3 -->
  <section id="waitingSection" class="hidden">

    <div class="card success">

      <h2 style="text-align:center;">
        Payment Proof Submitted
      </h2>

      <div class="reference" id="waitingReference"></div>

      <div class="status">
        Your payment proof has been received.
        <br><br>
        ILE FESTIVAL will verify the payment manually.
        <br><br>
        <strong>Do not use this reference as an entrance ticket.</strong>
      </div>

      <div class="notice">
        Your official entry QR code will only become valid after your payment
        has been approved.
      </div>

      <div id="statusBox" class="status">
        Checking payment status...
      </div>

    </div>

  </section>

</div>


<script>

let currentReference = "";
let currentTicketType = "Classic";
let currentPaymentMethod = "Alipay";
let currentAmount = 500;

const classicCard = document.getElementById("classicCard");
const vipCard = document.getElementById("vipCard");

document.querySelectorAll('input[name="ticketType"]').forEach(input => {

  input.addEventListener("change", () => {

    currentTicketType = input.value;

    if (currentTicketType === "VIP") {
      currentAmount = 1000;
      classicCard.classList.remove("selected");
      vipCard.classList.add("selected");
    } else {
      currentAmount = 500;
      vipCard.classList.remove("selected");
      classicCard.classList.add("selected");
    }

  });

});


async function loadAvailability() {

  try {

    const response = await fetch("/api/availability");
    const data = await response.json();

    document.getElementById("classicRemaining").textContent =
      data.classic_remaining;

    document.getElementById("vipRemaining").textContent =
      data.vip_remaining;

  } catch (error) {

    console.error(error);

  }

}


async function createTicket() {

  const button = document.getElementById("continueBtn");
  const errorBox = document.getElementById("bookingError");

  errorBox.textContent = "";

  const guestName =
    document.getElementById("guestName").value.trim();

  const phone =
    document.getElementById("phone").value.trim();

  const email =
    document.getElementById("email").value.trim();

  if (!guestName) {
    errorBox.textContent = "Please enter your full name.";
    return;
  }

  button.disabled = true;
  button.textContent = "Creating request...";

  try {

    const response = await fetch("/api/tickets", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        ticketType: currentTicketType,
        guestName,
        phone,
        email
      })

    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to create ticket.");
    }

    currentReference = data.reference;

    document.getElementById("referenceText").textContent =
      data.reference;

    document.getElementById("amountText").textContent =
      data.amount;

    document.getElementById("bookingSection")
      .classList.add("hidden");

    document.getElementById("paymentSection")
      .classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    errorBox.textContent = error.message;

    button.disabled = false;
    button.textContent = "Continue to Payment";

  }

}


function selectPaymentMethod(method) {

  currentPaymentMethod = method;

  const alipay = document.getElementById("alipayMethod");
  const wechat = document.getElementById("wechatMethod");
  const qr = document.getElementById("paymentQR");

  if (method === "Alipay") {

    alipay.classList.add("selected");
    wechat.classList.remove("selected");

    qr.src = "/ali.jpeg";

  } else {

    wechat.classList.add("selected");
    alipay.classList.remove("selected");

    qr.src = "/wexin.png";

  }

}


function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = event => {

      const img = new Image();

      img.onload = () => {

        let width = img.width;
        let height = img.height;

        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {

          if (width > height) {

            height =
              Math.round(height * maxDimension / width);

            width = maxDimension;

          } else {

            width =
              Math.round(width * maxDimension / height);

            height = maxDimension;

          }

        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.75;

        function attempt() {

          canvas.toBlob(blob => {

            if (!blob) {
              reject(new Error("Could not process image."));
              return;
            }

            if (blob.size <= 900000 || quality <= 0.35) {

              const blobReader = new FileReader();

              blobReader.onloadend = () => {
                resolve(blobReader.result);
              };

              blobReader.readAsDataURL(blob);

            } else {

              quality -= 0.10;
              attempt();

            }

          }, "image/jpeg", quality);

        }

        attempt();

      };

      img.onerror = () => {
        reject(new Error("Invalid image."));
      };

      img.src = event.target.result;

    };

    reader.onerror = () => {
      reject(new Error("Unable to read image."));
    };

    reader.readAsDataURL(file);

  });

}

async function submitPaymentProof() {

  const button =
    document.getElementById("submitProofBtn");

  const errorBox =
    document.getElementById("paymentError");

  const fileInput =
    document.getElementById("proofFile");

  errorBox.textContent = "";

  if (!currentReference) {
    errorBox.textContent = "Ticket reference is missing.";
    return;
  }

  if (!fileInput.files.length) {
    errorBox.textContent =
      "Please select your payment screenshot.";
    return;
  }

if (!document.getElementById("receiverConfirmed").checked) {
  errorBox.textContent = "Please confirm that the receiving account name matches before submitting.";
  return;
}
  button.disabled = true;
  button.textContent = "Uploading proof...";

  try {

    const file = fileInput.files[0];

    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload an image file.");
    }

    const proof =
      await compressImage(file);

    if (!proof || proof.length > ${MAX_PROOF_CHARS}) {
      throw new Error(
        "The payment screenshot is too large. Please use a smaller screenshot."
      );
    }

    const response = await fetch(
      "/api/payment-proof",
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          reference: currentReference,
          paymentMethod: currentPaymentMethod,
          paymentProof: proof
        })

      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Could not submit payment proof."
      );
    }

    document.getElementById("paymentSection")
      .classList.add("hidden");

    document.getElementById("waitingSection")
      .classList.remove("hidden");

    document.getElementById("waitingReference")
      .textContent = currentReference;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    startStatusPolling();

  } catch (error) {

    errorBox.textContent = error.message;

    button.disabled = false;
    button.textContent = "Submit Payment Proof";

  }

}


async function checkTicketStatus() {

  if (!currentReference) return;

  try {

    const response = await fetch(
      "/api/ticket-status?reference=" +
      encodeURIComponent(currentReference)
    );

    const data = await response.json();

    const box =
      document.getElementById("statusBox");

    if (data.status === "approved") {

      box.innerHTML =
        "<strong>Payment approved.</strong><br><br>" +
        "Your official entry ticket has been approved. " +
        "Please wait for your ticket QR code.";

    } else if (data.status === "rejected") {

      box.innerHTML =
        "<strong>Payment not approved.</strong><br><br>" +
        "Please contact ILE FESTIVAL.";

    } else {

      box.innerHTML =
        "Payment proof is still being reviewed.<br><br>" +
        "Please do not submit another payment.";

    }

  } catch (error) {

    console.error(error);

  }

}


function startStatusPolling() {

  checkTicketStatus();

  setInterval(() => {
    checkTicketStatus();
  }, 15000);

}


loadAvailability();

</script>

</body>
</html>`;
}


export default {

  async fetch(request, env) {

    try {

      await setupDatabase(env);

      const url = new URL(request.url);

      /*
       * MAIN WEBSITE
       */

      if (request.method === "GET" && url.pathname === "/") {

        return new Response(htmlPage(), {
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store"
          }
        });

      }


      /*
       * CHECK TICKET AVAILABILITY
       */

      if (
        request.method === "GET" &&
        url.pathname === "/api/availability"
      ) {

        const classicResult =
          await env.DB.prepare(`
            SELECT COUNT(*) AS count
            FROM tickets
            WHERE ticket_type = 'Classic'
            AND payment_status != 'rejected'
          `).first();

        const vipResult =
          await env.DB.prepare(`
            SELECT COUNT(*) AS count
            FROM tickets
            WHERE ticket_type = 'VIP'
            AND payment_status != 'rejected'
          `).first();

        const classicSold =
          Number(classicResult?.count || 0);

        const vipSold =
          Number(vipResult?.count || 0);

        return json({

          classic_remaining:
            Math.max(0, MAX_CLASSIC - classicSold),

          vip_remaining:
            Math.max(0, MAX_VIP - vipSold),

          classic_total: MAX_CLASSIC,
          vip_total: MAX_VIP

        });

      }


      /*
       * CREATE TICKET REQUEST
       */

      if (
        request.method === "POST" &&
        url.pathname === "/api/tickets"
      ) {

        const body = await request.json();

        const ticketType =
          body.ticketType === "VIP"
            ? "VIP"
            : "Classic";

        const guestName =
          String(body.guestName || "").trim();

        const phone =
          String(body.phone || "").trim();

        const email =
          String(body.email || "").trim();

        if (!guestName) {

          return json({
            success: false,
            error: "Full name is required."
          }, 400);

        }

        const max =
          ticketType === "VIP"
            ? MAX_VIP
            : MAX_CLASSIC;

        const countResult =
          await env.DB.prepare(`
            SELECT COUNT(*) AS count
            FROM tickets
            WHERE ticket_type = ?
            AND payment_status != 'rejected'
          `)
          .bind(ticketType)
          .first();

        const currentCount =
          Number(countResult?.count || 0);

        if (currentCount >= max) {

          return json({
            success: false,
            error:
              ticketType === "VIP"
                ? "VIP tickets are sold out."
                : "Classic tickets are sold out."
          }, 409);

        }

        const reference =
          generateReference();

        await env.DB.prepare(`
          INSERT INTO tickets (
            ticket_code,
            ticket_type,
            guest_name,
            phone,
            email,
            payment_status,
            ticket_status
          )
          VALUES (?, ?, ?, ?, ?, 'pending', 'pending')
        `)
        .bind(
          reference,
          ticketType,
          guestName,
          phone || null,
          email || null
        )
        .run();

        return json({

          success: true,

          reference,

          ticket_type: ticketType,

          amount:
            ticketType === "VIP"
              ? "¥1,000"
              : "¥500",

          payment_status: "pending",

          ticket_status: "pending"

        });

      }


      /*
       * SUBMIT PAYMENT PROOF
       */

      if (
        request.method === "POST" &&
        url.pathname === "/api/payment-proof"
      ) {

        const body = await request.json();

        const reference =
          String(body.reference || "").trim();

        const paymentMethod =
          String(body.paymentMethod || "").trim();

        const paymentProof =
          String(body.paymentProof || "").trim();

        if (!reference) {

          return json({
            success: false,
            error: "Ticket reference is required."
          }, 400);

        }

        if (
          paymentMethod !== "Alipay" &&
          paymentMethod !== "WeChat"
        ) {

          return json({
            success: false,
            error: "Invalid payment method."
          }, 400);

        }

        if (!paymentProof) {

          return json({
            success: false,
            error: "Payment screenshot is required."
          }, 400);

        }

        if (paymentProof.length > MAX_PROOF_CHARS) {

          return json({
            success: false,
            error:
              "Payment screenshot is too large."
          }, 413);

        }

        if (!paymentProof.startsWith("data:image/")) {

          return json({
            success: false,
            error:
              "Invalid payment screenshot."
          }, 400);

        }

        const ticket =
          await env.DB.prepare(`
            SELECT
              ticket_code,
              payment_status,
              ticket_status
            FROM tickets
            WHERE ticket_code = ?
          `)
          .bind(reference)
          .first();

        if (!ticket) {

          return json({
            success: false,
            error: "Ticket reference not found."
          }, 404);

        }

        if (ticket.payment_status === "approved") {

          return json({
            success: false,
            error:
              "This payment has already been approved."
          }, 409);

        }

        await env.DB.prepare(`
          UPDATE tickets
          SET
            payment_method = ?,
            payment_proof = ?,
            payment_status = 'submitted',
            ticket_status = 'pending'
          WHERE ticket_code = ?
        `)
        .bind(
          paymentMethod,
          paymentProof,
          reference
        )
        .run();

        return json({
          success: true,
          message:
            "Payment proof submitted successfully.",
          reference
        });

      }


      /*
       * CHECK PAYMENT / TICKET STATUS
       */

      if (
        request.method === "GET" &&
        url.pathname === "/api/ticket-status"
      ) {

        const reference =
          String(
            url.searchParams.get("reference") || ""
          ).trim();

        if (!reference) {

          return json({
            success: false,
            error: "Reference is required."
          }, 400);

        }

        const ticket =
          await env.DB.prepare(`
            SELECT
              ticket_code,
              ticket_type,
              payment_status,
              ticket_status,
              approved_at
            FROM tickets
            WHERE ticket_code = ?
          `)
          .bind(reference)
          .first();

        if (!ticket) {

          return json({
            success: false,
            error: "Ticket not found."
          }, 404);

        }

        return json({

          success: true,

          reference:
            ticket.ticket_code,

          ticket_type:
            ticket.ticket_type,

          status:
            ticket.payment_status,

          ticket_status:
            ticket.ticket_status,

          approved_at:
            ticket.approved_at || null

        });

      }


      return new Response("Not Found", {
        status: 404
      });

    } catch (error) {

      console.error(error);

      return json({
        success: false,
        error: "Server error. Please try again."
      }, 500);

    }

  }

};
