<<<<<<< HEAD
# NEXORA Commerce
Full-stack e-commerce starter: React/Vite frontend, Node/Express API, MongoDB/Mongoose, JWT auth, customer/admin roles, catalog, wishlist, cart, checkout, orders, inventory, analytics, optional Stripe Checkout.

## Run on Windows
Requirements: Node.js 20+, MongoDB local or Atlas, VS Code.

Backend terminal:
```powershell
cd server
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```
Set `JWT_SECRET` in `server/.env` to a random secret of 32+ characters. Local MongoDB default is `mongodb://127.0.0.1:27017/nexora_commerce`.

Second terminal:
```powershell
cd client
Copy-Item .env.example .env
npm install
npm run dev
```
Open http://localhost:5173. API health: http://localhost:5000/api/health.

## Admin setup (local development only)
Register a normal account, then in `mongosh`:
```javascript
use nexora_commerce
db.users.updateOne({email:"your-email@example.com"}, {$set:{role:"admin"}})
```
Log out and log in again. Never allow public admin self-registration.

## GitHub
Create an empty GitHub repository, then from this folder:
```powershell
git init
git add .
git commit -m "Initial NEXORA Commerce"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexora-commerce.git
git push -u origin main
```
Deploy `server` to Render/Railway and `client` to Vercel/Netlify. Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `VITE_API_URL` in hosting settings. Never commit `.env`. For real Stripe payments, configure Stripe secret + webhook secrets as described in `.env.example`. Demo checkout is not a real payment.

## Security
Educational starter; security-review before production. JWT is stored in localStorage for simplicity. Consider HttpOnly cookies, CSRF protection, stricter CSP, monitoring, backups, and stronger deployment controls. Stripe webhook signature verification is implemented. Never store card details.
=======
# Nexora-Ecommerce
>>>>>>> f728ad0e068036d2dc6adbb31b367b9636ff8886
