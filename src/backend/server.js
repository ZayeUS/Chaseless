// File: src/backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import profileRouter from './routes/profiles.js';
import auditRouter from './routes/auditRoutes.js';
import testEmailRoutes from './routes/testEmail.js';
import stripeRouter from './routes/stripeRoutes.js'; 
import clientsRouter from './routes/clients.js';
import invoicesRouter from './routes/invoices.js';
// NEW: Import the Stripe Connect router
import stripeConnectRouter from './routes/stripeConnectRoutes.js';

dotenv.config();

const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*", 
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/users", usersRouter); 
app.use("/api/roles", rolesRouter); 
app.use("/api/profile", profileRouter);
app.use("/api/audit", auditRouter); 
app.use('/api/email', testEmailRoutes); 
app.use("/api/stripe", stripeRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/invoices", invoicesRouter);
// NEW: Add the Stripe Connect routes
app.use("/api/stripe-connect", stripeConnectRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});