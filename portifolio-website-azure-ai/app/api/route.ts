import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Resume content to provide context to the AI
const resumeContent = `
Ahmed Dlshad Mohammed
Full-Stack & Agentic AI Engineer
ahmed.dlshad.m@gmail.com | +964 772 962 5434 | Sulaymaniyah, Iraq
GitHub: github.com/AhmedDlshad007 | Portfolio: ahmed-dlshad-portfolio.vercel.app
LinkedIn: linkedin.com/in/ahmed-dlshad1

Education
B.Sc. Software Engineering (Honours), graduated March 2025
Universiti Teknologi Malaysia (UTM) via Qaiwan International University, Sulaymaniyah
Specialisation: Software Engineering, Full-Stack Development, AI/ML

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
• Lead full-stack development of company products using React/Next.js (frontend) and Node.js/Python (backend).
• Engineer Companion — an Agentic AI desktop controller built on the Model Context Protocol (MCP), enabling AI agents to control the browser, access the local file system, interact with Gmail, and execute cross-application workflows.
• Integrated OpenRouter to support any large language model within Companion, giving users flexible multi-model AI access.
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

AI-Powered Resume Analyser, Movie RAG Agent, AI Image Captioning Tool (2024)
Series of AI-driven web applications utilising OpenAI GPT-3.5, Hugging Face BLIP, ResNet-50, and multi-API RAG pipelines for document analysis, conversational retrieval, and image understanding.
Stack: Flask, React, TypeScript, Python, OpenAI API, Hugging Face
`;

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Format messages for OpenAI
    const formattedMessages: ChatCompletionMessageParam[] = [
      { 
        role: 'system', 
        content: `You are a helpful assistant for Ahmed Dlshad's portfolio website. 
        Answer questions about Ahmed based on his resume. Be concise and professional.
        Here is Ahmed's resume information: ${resumeContent}` 
      },
      ...messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      })) as ChatCompletionMessageParam[]
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: formattedMessages,
      max_tokens: 150,
      temperature: 0.7,
    });

    // Extract the response
    const message = completion.choices[0]?.message?.content || 'Sorry, I could not process your request.';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 