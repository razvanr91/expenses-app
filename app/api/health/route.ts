import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "healthy",
      services: {
        application: "healthy",
        database: "healthy",
      },
    });
  } catch {
    return Response.json(
      {
        status: "unhealthy",
        services: {
          application: "healthy",
          database: "unhealthy",
        },
      },
      { status: 503 },
    );
  }
}
