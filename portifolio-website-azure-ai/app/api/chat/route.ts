import { NextResponse } from "next/server";

// Route handlers are dynamic by default; keep it explicit so the chat is never
// statically cached and always runs on the server with the secret key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Single source of truth for the assistant's knowledge about Ahmed.
   Lives server-side so it never ships in the client bundle and can't drift. */
const resumeContent = `
Ahmed Dlshad Mohammed
Full-Stack & Agentic AI Engineer
ahmed.dlshad.m@gmail.com | +964 772 962 5434 | Sulaymaniyah, Iraq
GitHub: github.com/AhmedDlshad007 | Portfolio: ahmed-dlshad-portfolio.vercel.app
LinkedIn: linkedin.com/in/ahmed-dlshad1

Personal Details
Nationality: Iraqi · Ethnicity: Kurdish · Date of Birth: 30/03/2002 · Place of Birth: Kalar

Education
B.Sc. Software Engineering (Honours), graduated March 2025
Universiti Teknologi Malaysia (UTM) via Qaiwan International University, Sulaymaniyah
GPA: 2.69 / 4.0 (German scale: approx. 2.7 — befriedigend)
Specialisation: Software Engineering, Full-Stack Development, AI/ML
Degree internationally recognised (anabin database: UTM, Malaysia)

Technical Skills
Programming: Python, JavaScript / TypeScript, C++, Java, HTML5/CSS3
Frameworks: React, Next.js, Node.js, Flask, Tailwind CSS
AI / Agents: Agentic AI, MCP (Model Context Protocol), OpenRouter, OpenAI API, Hugging Face, RAG, Stable Diffusion
Cloud & Tools: AWS (Cloud Foundations), Docker, Vercel, Railway, Git/GitHub

Languages
Kurdish — Native | Arabic — Fluent | English — Proficient (B2–C1)

Certifications
AWS Academy Graduate — Cloud Foundations, Amazon Web Services, June 2023

Work Experience

Full-Stack & Agentic AI Engineer (Full-Time)
BlackCode · Switzerland (Remote)
February 2026 – Present
• Lead full-stack development of company products using React/Next.js (frontend) and Node.js/Python (backend), with focus on performance and scalability.
• Engineer Companion — an Agentic AI desktop controller built on the Model Context Protocol (MCP), enabling AI agents to control the browser, access the local file system, interact with Gmail, and execute cross-application workflows.
• Integrated OpenRouter to support any large language model within Companion, giving users flexible multi-model AI access from a single interface.
• Design and maintain MCP server integrations and autonomous agent pipelines for real-world task automation.

Junior Developer (Contract)
BlackCode · Switzerland (Remote)
March 2025 – May 2025
• Built and tested AI/ML models and API integrations for internal research projects alongside senior engineers.
• Implemented gaming experiment prototypes and applied Python best practices in AI/ML development.

IT Assistant (Internship)
Qaiwan Steel Company · Kifri, Iraq
September 2024 – February 2025
• Maintained systems, monitored networks, and provided hardware/software support across departments.
• Gained practical experience in database management, data backup, and IT documentation.

Back-End Engineer Intern (Part-Time)
Relevance · Remote
May 2024 – July 2024
• Developed backend systems and designed RESTful APIs and relational database schemas.

Selected Projects

Companion — Agentic AI Desktop Controller (2026, Ongoing)
AI agent application built on the Model Context Protocol (MCP), enabling agents to control the browser, access the local file system, manage Gmail, and execute multi-application workflows. Supports any LLM via OpenRouter integration.
Stack: Python, MCP, OpenRouter, Multi-model AI

Wathifa — Job Matching Platform (2024–2025)
Full-stack platform connecting international job-seekers with MENA-region employers. Features automated candidate scoring, Stripe payment integration, and AWS S3 document storage.
Stack: React, Node.js, Stripe, AWS S3

AI-Powered Resume Analyser (2024)
Web application that analyses resumes against job descriptions using OpenAI GPT-3.5. Extracts text from PDFs, calculates match percentages, identifies missing keywords, and provides tailored improvement suggestions.
Stack: Flask, Python, OpenAI API, pdfplumber

Movie Research Assistant — RAG Agent (2024)
Python-based RAG agent for researching movies and TV shows. Integrates TMDb, OMDb, and YouTube APIs to fetch comprehensive movie details, ratings, release dates, and trailers.
Stack: Python, Tkinter, TMDb/OMDb/YouTube APIs

AI Image Captioning & Tagging Tool (2024)
Auto-generates captions and tags for uploaded images using Hugging Face BLIP and ResNet-50. Responsive drag-and-drop interface built with React and Vite.
Stack: React, TypeScript, Hugging Face BLIP, ResNet-50

SleepyClock (2024)
Sleep cycle calculator with smart sleep calculations, fully responsive design, dark/light mode toggle, and mobile-first approach. Built with pure vanilla JavaScript.
Stack: HTML5, CSS3, JavaScript

Anime Character Generator (2024)
Web application that generates anime characters from text prompts using Stable Diffusion XL via Replicate API.
Stack: Next.js, React, Tailwind CSS, Replicate API
`;

const SYSTEM_PROMPT = `You are a helpful assistant for Ahmed Dlshad's portfolio website.
Answer questions about Ahmed based on his resume. Be concise and professional.
Here is Ahmed's resume information: ${resumeContent}`;

type ChatMessage = { role: string; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  // Free model by default. Override via OPENROUTER_MODEL (e.g.
  // "anthropic/claude-3.5-haiku" or "google/gemini-2.5-flash") — no code change needed.
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash:free";
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set on the server.");
    return NextResponse.json(
      { error: "The assistant is not configured. Please try again later." },
      { status: 500 }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = body?.messages;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid messages format." }, { status: 400 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional OpenRouter attribution headers.
        "HTTP-Referer": "https://ahmed-dlshad-portfolio.vercel.app",
        "X-Title": "Ahmed Dlshad Portfolio",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenRouter request failed:", res.status, detail);
      return NextResponse.json(
        { error: "The assistant is temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const message =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I could not process your request.";
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error calling chat provider:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}
