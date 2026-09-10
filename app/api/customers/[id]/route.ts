import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: user.id,
      },
      include: {
        transactions: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    // Balance calculation
    let totalGive = 0;
    let totalGot = 0;
    for (const tx of customer.transactions) {
      if (tx.type === "GIVE") totalGive += tx.amount;
      if (tx.type === "GOT") totalGot += tx.amount;
    }
    const balance = totalGive - totalGot;

    let status: "DUE" | "ADVANCE" | "SETTLED" = "SETTLED";
    if (balance > 0) status = "DUE";
    else if (balance < 0) status = "ADVANCE";

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        totalGive,
        totalGot,
        balance,
        status,
        amountDueFormatted: `₹${Math.abs(balance).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      },
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get customer details." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, phone, email, address } = body;

    const dataToUpdate: {
      name?: string;
      phone?: string;
      email?: string | null;
      address?: string | null;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { success: false, message: "Customer name cannot be empty." },
          { status: 400 }
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (phone !== undefined) {
      const trimmedPhone = phone.trim().replace(/\s+/g, "");
      if (trimmedPhone.length < 10) {
        return NextResponse.json(
          { success: false, message: "Valid 10-digit phone number is required." },
          { status: 400 }
        );
      }
      dataToUpdate.phone = trimmedPhone;
    }

    if (email !== undefined) {
      dataToUpdate.email = email ? email.trim() : null;
    }

    if (address !== undefined) {
      dataToUpdate.address = address ? address.trim() : null;
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully.",
      customer: updated,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update customer." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    // Role-based Authorization: Only SHOPKEEPER can delete customers
    if (user.role !== "SHOPKEEPER") {
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied: Only shopkeepers can delete customer accounts.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId: user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      success: true,
      message: "Customer and associated records deleted successfully.",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete customer." },
      { status: 500 }
    );
  }
}
