import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import bcrypt from "bcryptjs";
import { getDevCustomers } from "../../../lib/dev-users";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const activeShopId =
      user.role === "SHOPKEEPER" ? user.id : (user.shopkeeperId ?? user.id);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("query") || searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // 'all', 'due', 'advance', 'settled'

    // Build Prisma where query
    const whereClause: {
      userId: number;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      userId: activeShopId,
    };

    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch customers with their transactions
    const rawCustomers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            date: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Calculate balances and map customer models
    const customers = rawCustomers.map((customer) => {
      let totalGive = 0; // You Gave (Customer owes)
      let totalGot = 0;  // You Got (Customer paid)

      for (const tx of customer.transactions) {
        if (tx.type === "GIVE") {
          totalGive += tx.amount;
        } else if (tx.type === "GOT") {
          totalGot += tx.amount;
        }
      }

      const balance = totalGive - totalGot; // > 0: Due (You'll Get), < 0: Advance (You'll Give), 0: Settled

      let status: "DUE" | "ADVANCE" | "SETTLED" = "SETTLED";
      if (balance > 0) status = "DUE";
      else if (balance < 0) status = "ADVANCE";

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        totalGive,
        totalGot,
        balance,
        status,
        amountDueFormatted: `₹${Math.abs(balance).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        transactionCount: customer.transactions.length,
      };
    });

    // Apply filter in memory if specified
    const filteredCustomers = customers.filter((c) => {
      if (filter === "due") return c.status === "DUE";
      if (filter === "advance") return c.status === "ADVANCE";
      if (filter === "settled") return c.status === "SETTLED";
      return true;
    });

    return NextResponse.json({
      success: true,
      count: filteredCustomers.length,
      customers: filteredCustomers,
    });
  } catch (error) {
    console.error("Fetch customers error:", error);
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        success: true,
        count: getDevCustomers().length,
        customers: getDevCustomers(),
        demo: true,
      });
    }
    return NextResponse.json(
      { success: false, message: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const activeShopId =
      user.role === "SHOPKEEPER" ? user.id : (user.shopkeeperId ?? user.id);

    const body = await request.json();
    const {
      name,
      phone,
      email,
      address,
      openingBalance,
      balanceType,
      addedById,
      password,
    } = body;

    // Validate password authorization
    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Password verification is required to finalize adding a customer.",
        },
        { status: 400 }
      );
    }

    const staffId = Number(addedById || user.id);
    const staffMember = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staffMember) {
      return NextResponse.json(
        { success: false, message: "Selected staff member not found." },
        { status: 404 }
      );
    }

    // Verify that staffMember belongs to this shop
    const belongsToShop =
      staffMember.id === activeShopId || staffMember.shopkeeperId === activeShopId;

    if (!belongsToShop) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected staff member does not belong to this shop.",
        },
        { status: 403 }
      );
    }

    // Verify the password of the person adding the customer
    const isPasswordValid = await bcrypt.compare(password, staffMember.password);
    if (!isPasswordValid) {
      const staffName = staffMember.name || staffMember.email;
      return NextResponse.json(
        {
          success: false,
          message: `Incorrect password for ${staffName}. Authorization failed.`,
        },
        { status: 401 }
      );
    }

    // Validate name and phone
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Customer name is required." },
        { status: 400 }
      );
    }

    const trimmedPhone = (phone || "").trim().replace(/\s+/g, "");
    if (!trimmedPhone || trimmedPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: "A valid phone number (at least 10 digits) is required." },
        { status: 400 }
      );
    }

    // Create customer in DB
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: trimmedPhone,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        userId: activeShopId,
        createdById: staffMember.id,
      },
    });

    // If an opening balance was supplied, create an initial transaction
    const initialAmount = parseFloat(openingBalance);
    let initialTx = null;
    if (!isNaN(initialAmount) && initialAmount > 0) {
      const type = balanceType === "YOU_GIVE" ? "GOT" : "GIVE"; // YOU_GIVE means shopkeeper owes customer (GOT), default is GIVE (You'll Get / Due)
      initialTx = await prisma.transaction.create({
        data: {
          customerId: customer.id,
          amount: initialAmount,
          type: type,
          description: "Opening Balance",
        },
      });
    }

    const balance = initialTx
      ? initialTx.type === "GIVE"
        ? initialTx.amount
        : -initialTx.amount
      : 0;

    let status: "DUE" | "ADVANCE" | "SETTLED" = "SETTLED";
    if (balance > 0) status = "DUE";
    else if (balance < 0) status = "ADVANCE";

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully.",
        customer: {
          ...customer,
          balance,
          status,
          amountDueFormatted: `₹${Math.abs(balance).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          transactionCount: initialTx ? 1 : 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create customer." },
      { status: 500 }
    );
  }
}
