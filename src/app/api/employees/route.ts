import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const shopkeeper = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const employees = await prisma.user.findMany({
      where: {
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      shopkeeper,
      employees,
    });
  } catch (error) {
    console.error("Fetch employees error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch employees." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (user.role !== "SHOPKEEPER") {
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied. Only Shopkeepers can add employees.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, shopkeeperPassword } = body;

    // Verify Shopkeeper password to authorize action
    if (!shopkeeperPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Shopkeeper password is required to authorize adding an employee.",
        },
        { status: 400 }
      );
    }

    const ownerRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!ownerRecord) {
      return NextResponse.json(
        { success: false, message: "Shopkeeper account not found." },
        { status: 404 }
      );
    }

    const isOwnerPwValid = await verifyPassword(
      shopkeeperPassword,
      ownerRecord.password
    );

    if (!isOwnerPwValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect Shopkeeper password. Action authorization failed.",
        },
        { status: 401 }
      );
    }

    // Validate employee details
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Employee name is required." },
        { status: 400 }
      );
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const hashedEmployeePw = await hashPassword(password);

    const newEmployee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedEmployeePw,
        role: "EMPLOYEE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        employee: newEmployee,
        message: "Employee added successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add employee error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create employee." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (user.role !== "SHOPKEEPER") {
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied. Only Shopkeepers can delete employees.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { employeeId, shopkeeperPassword } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: "Employee ID is required." },
        { status: 400 }
      );
    }

    if (!shopkeeperPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Shopkeeper password is required to authorize deletion.",
        },
        { status: 400 }
      );
    }

    const ownerRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!ownerRecord) {
      return NextResponse.json(
        { success: false, message: "Shopkeeper account not found." },
        { status: 404 }
      );
    }

    const isOwnerPwValid = await verifyPassword(
      shopkeeperPassword,
      ownerRecord.password
    );

    if (!isOwnerPwValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect Shopkeeper password. Deletion authorization failed.",
        },
        { status: 401 }
      );
    }

    const targetEmployee = await prisma.user.findUnique({
      where: { id: String(employeeId) },
    });

    if (!targetEmployee || targetEmployee.role !== "EMPLOYEE") {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: String(employeeId) },
    });

    return NextResponse.json({
      success: true,
      message: `Employee ${targetEmployee.name || targetEmployee.email} deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete employee." },
      { status: 500 }
    );
  }
}
