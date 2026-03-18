import express from "express";
import {
  createStripePaymentIntent,
  createTransaction,
  listTransactions,
  getTeacherAnalytics
} from "../controllers/transactionController";

const router = express.Router();

router.get("/", listTransactions);
router.post("/", createTransaction);
router.post("/stripe/payment-intent", createStripePaymentIntent);
router.get("/teacher-analytics", getTeacherAnalytics);
export default router;
