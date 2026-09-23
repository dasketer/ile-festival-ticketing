const MAX_CLASSIC = 200;
const MAX_VIP = 25;

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

function htmlPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ILE FESTIVAL — Official Tickets</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Arial,Helvetica,sans-serif;
  background:#0b0b0b;
  color:#fff;
}
header{
  text-align:center;
  padding:35px 20px 20px;
  border-bottom:1px solid #333;
}
.logo{
  width:170px;
  max-width:55vw;
  height:auto;
  object-fit:contain;
  background:#fff;
}
h1{
  margin:22px 0 8px;
  font-size:34px;
  letter-spacing:2px;
}
.subtitle{
  color:#c9c9c9;
  font-size:15px;
}
.container{
  width:min(900px,92%);
  margin:35px auto 60px;
}
.cards{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}
.card{
  border:1px solid #444;
  background:#151515;
  border-radius:14px;
  padding:24px;
}
.card h2{margin-top:0}
.price{
  font-size:30px;
  font-weight:bold;
  margin:12px 0;
}
.capacity{
  color:#aaa;
  font-size:14px;
}
form{
  margin-top:28px;
  background:#151515;
  border:1px solid #444;
  border-radius:14px;
  padding:25px;
}
label{
  display:block;
  margin:16px 0 7px;
  color:#ddd;
}
input,select{
  width:100%;
  padding:14px;
  border-radius:8px;
  border:1px solid #555;
  background:#0d0d0d;
  color:#fff;
  font-size:16px;
}
button{
  width:100%;
  margin-top:24px;
  padding:16px;
  border:0;
  border-radius:9px;
  background:#d6b36a;
  color:#111;
  font-size:17px;
  font-weight:bold;
  cursor:pointer;
}
button:disabled{
  opacity:.5;
  cursor:not-allowed;
}
.notice{
  margin-top:20px;
  padding:15px;
  border-radius:8px;
  background:#202020;
  color:#ccc;
  line-height:1.5;
}
#result{
  margin-top:20px;
  display:none;
  padding:20px;
  border-radius:10px;
  background:#162416;
  border:1px solid #476b47;
}
.error{
  background:#291515!important;
  border-color:#713b3b!important;
}
footer{
  text-align:center;
  color:#777;
  padding:25px;
  border-top:1px solid #222;
}
@media(max-width:650px){
  .cards{grid-template-columns:1fr}
  h1{font-size:27px}
}
</style>
</head>

<body>

<header>
 <img class="logo" src="/LION.jpeg" alt="ILE FESTIVAL"> 
  <h1>ILE FESTIVAL</h1>
  <div class="subtitle">Official Event Ticketing</div>
</header>

<div class="container">

  <div class="cards">
    <div class="card">
      <h2>CLASSIC</h2>
      <div class="price">¥500</div>
      <div class="capacity">
        Up to 200 tickets
        <br>
        <span id="classicCount">Loading...</span>
      </div>
    </div>

    <div class="card">
      <h2>VIP</h2>
      <div class="price">¥1,000</div>
      <div class="capacity">
        Up to 25 tickets
        <br>
        <span id="vipCount">Loading...</span>
      </div>
    </div>
  </div>

  <form id="ticketForm">

    <h2>Request Your Ticket</h2>

    <label for="ticketType">Ticket type</label>
    <select id="ticketType" required>
      <option value="Classic">Classic — ¥500</option>
      <option value="VIP">VIP — ¥1,000</option>
    </select>

    <label for="guestName">Full name</label>
    <input id="guestName" required maxlength="100" autocomplete="name">

    <label for="phone">Phone number</label>
    <input id="phone" maxlength="40" autocomplete="tel">

    <label for="email">Email</label>
    <input id="email" type="email" maxlength="150" autocomplete="email">

    <div class="notice">
      After submitting your ticket request, payment instructions will be provided.
      Your ticket is <strong>not valid for entry</strong> until payment has been
      manually verified and approved by ILE FESTIVAL.
    </div>

    <button id="submitBtn" type="submit">
      Continue to Payment
    </button>

    <div id="result"></div>

  </form>
</div>

<footer>
  ILE FESTIVAL — Official Ticketing System
</footer>

<script>
async function loadAvailability(){
  try{
    const r = await fetch('/api/availability');
    const data = await r.json();

    document.getElementById('classicCount').textContent =
      data.classic.remaining + ' remaining';

    document.getElementById('vipCount').textContent =
      data.vip.remaining + ' remaining';
  }catch(e){
    document.getElementById('classicCount').textContent = 'Unavailable';
    document.getElementById('vipCount').textContent = 'Unavailable';
  }
}

document.getElementById('ticketForm').addEventListener('submit', async function(e){
  e.preventDefault();

  const button = document.getElementById('submitBtn');
  const result = document.getElementById('result');

  button.disabled = true;
  button.textContent = 'Creating request...';
  result.style.display = 'none';

  const payload = {
    ticket_type: document.getElementById('ticketType').value,
    guest_name: document.getElementById('guestName').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim()
  };

  try{
    const response = await fetch('/api/tickets', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(data.error || 'Unable to create ticket request.');
    }

    result.className = '';
    result.innerHTML =
      '<strong>Request created.</strong><br><br>' +
      'Reference: <strong>' + data.reference + '</strong><br><br>' +
      'Your request is pending payment verification. ' +
      'The ticket QR code will only become valid after ILE FESTIVAL approves the payment.';

    result.style.display = 'block';
    button.textContent = 'Request Created';

    await loadAvailability();

  }catch(error){
    result.className = 'error';
    result.textContent = error.message;
    result.style.display = 'block';

    button.disabled = false;
    button.textContent = 'Continue to Payment';
  }
});

loadAvailability();
</script>

</body>
</html>`;
}

function generateReference() {
  return "ILE-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

export default {
  async fetch(request, env) {
    await setupDatabase(env);

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(htmlPage(), {
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/availability") {
      const classic = await env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE ticket_type = 'Classic'
        AND payment_status != 'rejected'
      `).first();

      const vip = await env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE ticket_type = 'VIP'
        AND payment_status != 'rejected'
      `).first();

      const classicSold = Number(classic?.count || 0);
      const vipSold = Number(vip?.count || 0);

      return Response.json({
        classic: {
          capacity: MAX_CLASSIC,
          sold: classicSold,
          remaining: Math.max(0, MAX_CLASSIC - classicSold)
        },
        vip: {
          capacity: MAX_VIP,
          sold: vipSold,
          remaining: Math.max(0, MAX_VIP - vipSold)
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/tickets") {
      let body;

      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Invalid request." },
          { status: 400 }
        );
      }

      const ticketType =
        body.ticket_type === "VIP" ? "VIP" : "Classic";

      const guestName =
        String(body.guest_name || "").trim();

      const phone =
        String(body.phone || "").trim();

      const email =
        String(body.email || "").trim();

      if (!guestName) {
        return Response.json(
          { error: "Please enter your full name." },
          { status: 400 }
        );
      }

      const limit =
        ticketType === "VIP" ? MAX_VIP : MAX_CLASSIC;

      const current = await env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM tickets
        WHERE ticket_type = ?
        AND payment_status != 'rejected'
      `).bind(ticketType).first();

      if (Number(current?.count || 0) >= limit) {
        return Response.json(
          { error: ticketType + " tickets are sold out." },
          { status: 409 }
        );
      }

      const reference = generateReference();

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
      `).bind(
        reference,
        ticketType,
        guestName,
        phone || null,
        email || null
      ).run();

      return Response.json({
        success: true,
        reference,
        ticket_type: ticketType,
        payment_status: "pending",
        ticket_status: "pending"
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
