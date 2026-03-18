import Stripe from "stripe";
import dotenv from "dotenv";
import { Request, Response } from "express";
import Course from "../models/courseModel";
import Transaction from "../models/transactionModel";
import UserCourseProgress from "../models/userCourseProgressModel";
import { getAuth } from "@clerk/express"
dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY os required but was not found in env variables"
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const listTransactions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.query;

  try {
    const transactions = userId
      ? await Transaction.query("userId").eq(userId).exec()
      : await Transaction.scan().exec();

    res.json({
      message: "Transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving transactions", error });
  }
};

export const createStripePaymentIntent = async (
  req: Request,
  res: Response
): Promise<void> => {
  let { amount } = req.body;

  if (!amount || amount <= 0) {
    amount = 50;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    res.json({
      message: "",
      data: {
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating stripe payment intent", error });
  }
};

export const createTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, courseId, transactionId, amount, paymentProvider } = req.body;

  try {
    // 1. get course info
    const course = await Course.get(courseId);

    // 2. create transaction record
    const newTransaction = new Transaction({
      dateTime: new Date().toISOString(),
      userId,
      courseId,
      transactionId,
      amount,
      paymentProvider,
    });
    await newTransaction.save();

    // 3. create initial course progress
    const initialProgress = new UserCourseProgress({
      userId,
      courseId,
      enrollmentDate: new Date().toISOString(),
      overallProgress: 0,
      sections: course.sections.map((section: any) => ({
        sectionId: section.sectionId,
        chapters: section.chapters.map((chapter: any) => ({
          chapterId: chapter.chapterId,
          completed: false,
        })),
      })),
      lastAccessedTimestamp: new Date().toISOString(),
    });
    await initialProgress.save();

    // 4. add enrollment to relevant course
    await Course.update(
      { courseId },
      {
        $ADD: {
          enrollments: [{ userId }],
        },
      }
    );

    res.json({
      message: "Purchased Course successfully",
      data: {
        transaction: newTransaction,
        courseProgress: initialProgress,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating transaction and enrollment", error });
  }
};

export const getTeacherAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = getAuth(req);
  const { granularity = "day" } = req.query as { granularity?: "day" | "month" };

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const teacherCourses = await Course.scan("teacherId").eq(userId).exec();
    const courseIds = teacherCourses.map((c: any) => c.courseId);

    if (courseIds.length === 0) {
      res.json({
        message: "Teacher analytics retrieved successfully",
        data: {
          series: [],
          totals: { salesCount: 0, revenue: 0, courseCount: 0 },
        },
      });
      return;
    }

    const txGroups = await Promise.all(
      courseIds.map((courseId) =>
        Transaction.query("courseId")
          .eq(courseId)
          .using("CourseTransactionsIndex")
          .exec()
      )
    );

    const transactions = txGroups.flat();

    const bucket = new Map<string, { salesCount: number; revenue: number }>();

    for (const tx of transactions as any[]) {
      const d = new Date(tx.dateTime);
      const key =
        granularity === "month"
          ? d.toISOString().slice(0, 7) // YYYY-MM
          : d.toISOString().slice(0, 10); // YYYY-MM-DD

      const current = bucket.get(key) ?? { salesCount: 0, revenue: 0 };
      current.salesCount += 1;
      current.revenue += tx.amount ?? 0;
      bucket.set(key, current);
    }

    const series = Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        salesCount: v.salesCount,
        revenue: v.revenue,
      }));

    const totals = series.reduce(
      (acc, p) => ({
        salesCount: acc.salesCount + p.salesCount,
        revenue: acc.revenue + p.revenue,
        courseCount: teacherCourses.length,
      }),
      { salesCount: 0, revenue: 0, courseCount: teacherCourses.length }
    );

    res.json({
      message: "Teacher analytics retrieved successfully",
      data: { series, totals },
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving teacher analytics", error });
  }
};
