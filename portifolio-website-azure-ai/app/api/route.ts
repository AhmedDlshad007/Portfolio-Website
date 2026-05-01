import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Resume content to provide context to the AI
const resumeContent = `
Ahmed Dlshad Muhammed
Software Engineering Student 
University Technology Malaysia (UTM), 4th Year Sulaymaniyah, Sulaymaniyah Governorate, Iraq ahmed.dlshad.m@gmail.com 
LinkedIn: https://www.linkedin.com/in/ahmed-dlshad-007/
  
Summary 
Dynamic and highly motivated Software Engineer with a Bachelor's degree in Software 
Engineering from University Technology Malaysia. Proficient in C++, Java, Dart, Flutter, HTML5/CSS, and JavaScript. Fluent in Kurdish, Arabic, and English. Eager to leverage academic background and practical experience to contribute effectively to innovative software development projects. 
  
Education 
Bachelor's Degree in Computer Software Engineering 
University Technology Malaysia (UTM), September 2020 - March 2025 
  
Key Skills 
•	Mobile Applications (Proficient) 
•	Web Development (Proficient) 
•	Software Development (Proficient) 
  
Certifications 
AWS Academy Graduate - AWS Academy Cloud Foundations, June 2023 
Amazon Web Services Training and Certification 
Certification Link 
  
Languages 
	• 	Kurdish: Native 	 	Arabic: Fluent  	English: Fluent 
  
Experience 
Back End Engineer (Part-Time) 
Relevance 
May 2024 – July 2024 
•Develop and maintain backend systems, ensuring scalability and reliability. 
•Collaborate with the team to design and implement efficient APIs and database structures. 
•Contribute to the optimization and performance tuning of existing backend services.
IT assistant (internship)
Qaiwan Steel Company
September 2024 – February 2025
•	Assisted in system maintenance, network monitoring, and security to ensure smooth IT operations.
•	Provided technical support, troubleshooting hardware and software issues across departments.
•	Supported hardware installation, configuration, and software updates to improve system efficiency.
•	Gained experience in database management, data backup procedures, and IT documentation.
•	Contributed to IT solutions implementation, optimizing processes and improving operational workflows.
•	Developed problem-solving, technical, and teamwork skills in a professional IT environment.
  
Projects 
University Event Manager Application 
Using Dart, Flutter, and Firebase 
Developed a comprehensive event management application tailored for university settings. The application facilitates event organization, management, and participation, leveraging Dart and Flutter for the front-end and Firebase for backend services. 
Movie Research Assistant (RAG Agent)
Using Python, Tkinter, TMDb API, OMDb API, and YouTube API
Built a Python-based Retrieval Augmented Generation (RAG) agent to assist users in researching movies and TV shows. The application integrates with TMDb, OMDb, and YouTube APIs to fetch movie details, ratings, release dates, and trailers.
https://github.com/AhmedDlshad007/rag_agent_project.git 
AI-OS (Intelligent Operating System Interface)
Using Python, Electron, WebSockets, Anthropic Claude API, and LangChain
Built an intelligent operating system interface powered by Claude 3 Opus that allows users to interact with their computer using natural language. The application seamlessly integrates system operations, web services, and external APIs through a modular architecture of Master Control Programs (MCPs).
https://github.com/AhmedDlshad007/AI-OS.git 
• Implemented WebSocket-based communication between Python backend and Electron UI for real-time interaction.
• Developed a comprehensive toolset for file system operations, web browsing, voice input/output, and process management.
• Created Master Control Programs (MCPs) for integrating external services including weather, maps, translation, and search.
• Built an intuitive Electron-based UI with voice and text input methods.
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