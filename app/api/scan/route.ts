import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

// pdf-parse and mammoth require Node.js APIs and cannot run in the Edge runtime.
export const runtime = "nodejs";

async function getAiSuggestions(resumeText: string, jobDescription: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are an expert ATS and resume coach. Return a JSON object with a "suggestions" key containing exactly 3 short, actionable suggestions to improve the resume for the given job description. Do not include markdown or extra fields.',
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Resume:\n${resumeText.slice(0, 6000)}\n\nJob Description:\n${jobDescription}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                suggestions: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
              },
              required: ["suggestions"],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API request failed:", await response.text());
      return [];
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return [];
    }

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((item: unknown) => typeof item === "string")
      : [];

    return suggestions.slice(0, 3);
  } catch (error) {
    console.error("Error generating AI suggestions:", error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  let fileFormat: "PDF" | "DOCX" | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!file || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Missing resume file or job description." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty. Choose a PDF or DOCX resume." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let extractedText = "";

    if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
      fileFormat = "PDF";
      const pdfParser = new PDFParse({ data: buffer });
      try {
        const pdfData = await pdfParser.getText();
        extractedText = pdfData.text;
      } finally {
        await pdfParser.destroy();
      }
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      fileFormat = "DOCX";
      const docxData = await mammoth.extractRawText({ buffer });
      extractedText = docxData.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or DOCX." },
        { status: 400 }
      );
    }

    const cleanResumeText = extractedText.trim();
    if (!cleanResumeText) {
      return NextResponse.json(
        {
          error:
            fileFormat === "PDF"
              ? "No selectable text was found in this PDF. If it is a scanned image, run OCR and upload the searchable PDF, or upload a DOCX version."
              : "No text was found in this DOCX. Check that the document contains readable resume text.",
        },
        { status: 422 }
      );
    }

    const cleanJobDescription = jobDescription.trim();
    const aiSuggestions = await getAiSuggestions(cleanResumeText, cleanJobDescription);

    return NextResponse.json({
      success: true,
      resumeText: cleanResumeText,
      jobDescription: cleanJobDescription,
      aiSuggestions,
      aiEnabled: Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (error) {
    console.error("Error parsing document:", error);
    return NextResponse.json(
      {
        error:
          fileFormat === "PDF"
            ? "Could not read this PDF. Make sure it is a valid, unprotected PDF. If it is a scan, use OCR to make its text searchable first."
            : fileFormat === "DOCX"
              ? "Could not read this DOCX file. Please open it in a word processor and save it again as a .docx document."
              : "The upload could not be processed. Please try again with a PDF or DOCX resume.",
      },
      { status: fileFormat ? 422 : 400 }
    );
  }
}
