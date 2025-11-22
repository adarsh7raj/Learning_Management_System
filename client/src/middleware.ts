import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isStudentRoute = createRouteMatcher(["/user/(.*)"]);
const isTeacherRoute = createRouteMatcher(["/teacher/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth(); // may be undefined if not signed in

  // default role
  let userRole: "student" | "teacher" = "student";

  if (userId) {
    try {
      // clerkClient may be either an object OR an async factory function depending on package version.
      // Handle both cases safely:
      const client =
        typeof clerkClient === "function" ? await (clerkClient as any)() : (clerkClient as any);

      const user = await client.users.getUser(userId);

      // read from publicMetadata or privateMetadata depending on where you stored userType
      userRole =
        (user.publicMetadata?.userType as "student" | "teacher") ||
        (user.privateMetadata?.userType as "student" | "teacher") ||
        "student";
    } catch (err) {
      // If fetching user fails, we fall back to "student"
      console.error("Failed to get clerk user in middleware:", err);
    }
  }

  if (isStudentRoute(req) && userRole !== "student") {
    return NextResponse.redirect(new URL("/teacher/courses", req.url));
  }

  if (isTeacherRoute(req) && userRole !== "teacher") {
    return NextResponse.redirect(new URL("/user/courses", req.url));
  }

  return; // continue
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
