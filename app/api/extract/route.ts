import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Define the strict structured JSON schema for invoices and receipts
const receiptSchema = {
  type: "object",
  properties: {
    vendor: {
      type: "string",
      description: "Business name, store, or utility board (e.g., Walmart, State Electricity Discom)",
    },
    date: {
      type: "string",
      description: "Bill date or transaction date in YYYY-MM-DD or readable format",
    },
    invoice_number: {
      type: "string",
      description: "Receipt number, invoice ID, or consumer/service number if utility bill",
    },
    currency: {
      type: "string",
      description: "Currency symbol or code (e.g., USD, INR, EUR, £, $)",
    },
    subtotal: {
      type: "number",
      description: "Subtotal before taxes or base charges",
    },
    tax: {
      type: "number",
      description: "Tax, VAT, GST, electricity duty, or surcharge amount",
    },
    total: {
      type: "number",
      description: "Final net total amount payable",
    },
    category: {
      type: "string",
      enum: ["Office Supplies", "Travel & Meals", "Utilities", "Software", "Equipment", "General"],
      description: "Accounting category for this expense",
    },
    items: {
      type: "array",
      description: "Itemized breakdown of purchased items or service charge components",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total: { type: "number" },
        },
        required: ["description", "quantity", "unit_price", "total"],
      },
    },
  },
  required: ["vendor", "date", "currency", "subtotal", "tax", "total", "category", "items"],
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    // Convert file to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Call Gemini with strict JSON Schema output
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Analyze this receipt or invoice carefully. Extract the merchant/utility vendor, date, invoice or consumer reference number, currency, subtotal, tax, final total, and all itemized line items. If it is an electricity or utility bill, categorize it under 'Utilities' and map base consumption charges to subtotal and regulatory duties/cess to tax. Output must adhere strictly to the schema.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1, // Low temperature for factual precision
      },
    });

    const outputText = response.text;
    if (!outputText) {
      return NextResponse.json({ error: "Model returned an empty response" }, { status: 502 });
    }

    const parsedData = JSON.parse(outputText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document with Gemini" },
      { status: 500 }
    );
  }
}