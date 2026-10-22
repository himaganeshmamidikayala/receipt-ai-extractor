import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const invoiceSchema = {
  type: SchemaType.OBJECT,
  properties: {
    vendor: {
      type: SchemaType.STRING,
      description: "Business or merchant name",
    },
    date: {
      type: SchemaType.STRING,
      description: "Date of transaction in YYYY-MM-DD or as printed",
    },
    invoice_number: {
      type: SchemaType.STRING,
      description: "Receipt, invoice, or reference identifier",
    },
    currency: {
      type: SchemaType.STRING,
      description: "Currency symbol or ISO code (e.g., ₹, $, €, EUR, USD)",
    },
    subtotal: {
      type: SchemaType.NUMBER,
      description: "Net subtotal before tax as declared on bill",
    },
    tax: {
      type: SchemaType.NUMBER,
      description: "Total tax/VAT/GST amount. 0 if none",
    },
    total: {
      type: SchemaType.NUMBER,
      description: "Final gross total payable amount",
    },
    category: {
      type: SchemaType.STRING,
      description: "Expense classification (e.g. Equipment, Retail, Meals, Cloud)",
    },
    items: {
      type: SchemaType.ARRAY,
      description: "Itemized line breakdown",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit_price: { type: SchemaType.NUMBER },
          total: { type: SchemaType.NUMBER },
        },
        required: ["description", "quantity", "unit_price", "total"],
      },
    },
  },
  required: ["vendor", "currency", "subtotal", "tax", "total", "category", "items"],
};

const ACTIVE_MODELS = ["gemini-3.8-flash"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No document provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
You are a high-speed optical financial parser. Extract the financial metadata and line items from this image strictly into the requested JSON schema.
- Perform a single direct extraction pass.
- If printed numbers contradict, extract what is printed on the receipt without entering calculation loops.
- Do not invent missing values.
`;

    let lastError: any = null;

    for (const modelName of ACTIVE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: invoiceSchema,
            temperature: 0.1,
          } as any,
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: file.type || "image/jpeg",
              data: base64Data,
            },
          },
        ]);

        const text = result.response.text();
        const data = JSON.parse(text);
        return NextResponse.json(data);
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} error:`, err?.message);
      }
    }

    const errText = String(lastError?.message || "");
    let cleanMessage = "Extraction failed. Please tap Re-extract.";

    if (errText.includes("503") || lastError?.status === 503) {
      cleanMessage = "Google AI clusters are experiencing high traffic. Tap Re-extract to retry.";
    } else if (errText.includes("429") || lastError?.status === 429) {
      cleanMessage = "Free API rate limit reached. Please wait 20 seconds and tap Re-extract.";
    } else if (lastError?.message) {
      cleanMessage = lastError.message;
    }

    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process receipt image." },
      { status: 500 }
    );
  }
}