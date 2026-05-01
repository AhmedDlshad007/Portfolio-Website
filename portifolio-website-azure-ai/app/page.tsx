"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {

  const [menuOpen, setMenuOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Resume content to provide context to the AI
  const resumeContent = `
Ahmed Dlshad Mohammed
ahmed.dlshad.m@gmail.com | +964 7729625434 | Iraq, Sulaymaniyah
LinkedIn: https://www.linkedin.com/in/ahmed-dlshad-007/
Portfolio: https://ahmed-dlshad-site.netlify.app
  
Summary 
Dynamic and highly motivated Software Engineer with a Bachelor's degree in Software 
Engineering from University Technology Malaysia. Proficient in C++, Java, Python, HTML5/CSS, and JavaScript. Fluent in Kurdish, Arabic, and English. Eager to leverage academic background and practical experience to contribute effectively to innovative software development projects. 
  
Education 
Bachelor's Degree in Software Engineering 
University Technology Malaysia (UTM), March 2025 
  
Key Skills 
•	Proficient in C++, Java, Python, HTML5/CSS, JavaScript
•	Mobile Applications (Flutter, Dart)
•	Web Development (React, Next.js, Full-Stack) 
•	AI/ML Development
•	Cloud Services (AWS, Azure)
  
Certifications 
AWS Academy Graduate - AWS Academy Cloud Foundations, June 2023 
  
Languages 
•	Kurdish: Native 
•	Arabic: Fluent  
•	English: Fluent 
  
Work Experience 
Junior Developer (Contract)
BlackCode - Remote
March 2025 – May 2025
•	Assisted in building and testing AI/ML models and API implementations, contributing to cutting-edge projects in a remote team environment.
•	Collaborated on gaming experiment prototypes, brainstorming and implementing innovative ideas with senior developers.
•	Developed Python proficiency while applying new technologies and best practices in AI and ML.
•	Delivered results in a fast-paced, contract role, balancing independent work with team collaboration and clear communication.

IT Assistant (Internship)
Qaiwan Steel Company - Kifri
September 2024 – February 2025
•	Assisted in system maintenance, network monitoring, and security to ensure smooth IT operations.
•	Provided technical support, troubleshooting hardware and software issues across departments.
•	Supported hardware installation, configuration, and software updates to improve system efficiency.
•	Gained experience in database management, data backup procedures, and IT documentation.
•	Contributed to IT solutions implementation, optimizing processes and improving operational workflows.

Back End Engineer (Part-Time) 
Relevance - Remote
May 2024 – July 2024 
•	Developed and maintained backend systems, ensuring scalability and reliability. 
•	Collaborated with the team to design and implement efficient APIs and database structures. 
  
Projects 
Wathifa - Job Matching Platform
Using Full-Stack Development with Frontend (Vercel), Backend (Railway), Stripe API, and AWS Cloud Services
Developed a comprehensive job-matching platform connecting international job seekers with MENA region employers. Built a dual-interface system with candidate profiles featuring automated readiness scoring (65% threshold for employer visibility), one-way messaging functionality, and employer dashboard with advanced filtering and candidate tagging capabilities. Implemented secure payment processing via Stripe for one-time user fees, AWS cloud storage for resume/photo management, and automated profile scoring algorithms to ensure quality candidate visibility.

SleepyClock
A sleep cycle calculator to help optimize sleep schedules!
Key features: Smart sleep calculations, Fully responsive design, Dark/light mode toggle, Fast, lightweight (vanilla JS), Mobile-first approach, Built with pure HTML5, CSS3, and JavaScript.

AI-Powered Resume Analyzer
Using Flask (Python), HTML/Bootstrap, JavaScript, pdfplumber, and OpenAI API
Developed a web application that analyzes resumes against job descriptions using AI. The tool extracts text from PDFs/TXT files, calculates match percentages using OpenAI GPT-3.5-turbo, identifies missing keywords, and provides tailored improvement suggestions. Features include file upload handling, text extraction with pdfplumber, and dynamic analysis results display.

Movie Research Assistant (RAG Agent)
Using Python, Tkinter, TMDb API, OMDb API, and YouTube API
Built a Python-based Retrieval Augmented Generation (RAG) agent to assist users in researching movies and TV shows. The application integrates with TMDb, OMDb, and YouTube APIs to fetch movie details, ratings, release dates, and trailers.
https://github.com/AhmedDlshad007/rag_agent_project.git 

Anime Character Generator
Using Next.js, React, Tailwind CSS, and Replicate API (Stable Diffusion XL)
Developed a web application that generates anime characters from text prompts using AI. The tool leverages Stable Diffusion XL via Replicate API to create unique character images. Features a clean, responsive interface built with Next.js and Tailwind CSS.

AI Image Captioning & Tagging Tool
Using React, TypeScript, Tailwind CSS, Hugging Face BLIP, and ResNet-50
Developed a web application that automatically generates captions and tags for uploaded images using AI. The tool leverages Hugging Face's BLIP model for real-time captioning and ResNet-50 for image tagging. Features a responsive drag-and-drop interface built with React and Vite for optimal performance.
`;

  const [messages, setMessages] = useState([
		{
      id: 'initial-msg',
			role: 'assistant',
			content: 'How can I help you learn more about Ahmed and his Resume?'
		}
  ]);

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let newMessages = [...messages, { id: `user-${Date.now()}`, role: 'user', content: messageInput }];
    setMessages(newMessages);
    setMessageInput('');
    
    try {
      // Direct call to OpenAI API from client-side in static export
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You are a helpful assistant for Ahmed Dlshad's portfolio website. 
              Answer questions about Ahmed based on his resume. Be concise and professional.
              Here is Ahmed's resume information: ${resumeContent}` 
            },
            ...newMessages.map(msg => ({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            }))
          ],
          max_tokens: 150,
          temperature: 0.7,
        })
      });
      
      const data = await response.json();
      const message = data.choices[0]?.message?.content || 'Sorry, I could not process your request.';
      setMessages([...newMessages, { id: `assistant-${Date.now()}`, role: 'assistant', content: message }]);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      setMessages([...newMessages, { id: `error-${Date.now()}`, role: 'assistant', content: 'Sorry, there was an error processing your request. Please try again later.' }]);
    }
  }

  const toggleMobileMenu = () => {
    setMenuOpen(!menuOpen);
  }

  return (
    <>
      <header className={scrolled ? 'scrolled' : ''}>
        <div className="header-content">
          <a href="#home" className="logo-holder">
            <div className="logo">AD</div>
            <div className="logo-text">Ahmed Dlshad</div>
          </a>
          <nav>
            <ul id="menu" className={menuOpen ? "active" : ""}>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#skills">Skills</a>
              </li>
              <li>
                <a href="#experience">Experience</a>
              </li>
              <li>
                <a href="#projects">Projects</a>
              </li>
              <li>
                <a href="#contact">AI Assistant</a>
              </li>
              <li>
                <a href="#contact" className="button">Contact</a>
              </li>
            </ul>
            <button className="mobile-toggle" onClick={toggleMobileMenu} aria-label="Toggle menu">
              <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h10"/>
              </svg>
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section - Full Screen */}
        <section id="home" className="hero-modern">
          <div className="hero-content">
            <div className="hero-text">
              <div className="greeting">
                <span className="wave">👋</span>
                <span className="intro-text">Hello, I&apos;m</span>
              </div>
              <h1 className="hero-title">
                <span className="name-highlight">Ahmed Dlshad</span>
              </h1>
              <h2 className="hero-subtitle">Junior Developer & Full Stack Engineer</h2>
              <p className="hero-description">
                Graduate Software Engineer from University Technology Malaysia (UTM) with expertise in 
                AI/ML development, full-stack web applications, and cloud services. Passionate about 
                building innovative solutions that make a difference.
              </p>
              <div className="hero-cta">
                <a href="#contact" className="button primary">
                  <span>Get In Touch</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <a href="./Ahmed Dlshad Mohammed - Resume_compressed.pdf" className="button secondary">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 12.5V3.75M10 12.5L7.5 10M10 12.5L12.5 10M3.75 16.25H16.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Download CV</span>
                </a>
              </div>
              <div className="hero-social">
                <a href="http://github.com/AhmedDlshad007" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/ahmed-dlshad-007/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="mailto:ahmed.dlshad.m@gmail.com" aria-label="Email">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div className="hero-image">
              <div className="image-wrapper">
                <div className="glow-effect"></div>
                <img src="./imgs/me-removed-better.png" alt="Ahmed Dlshad" />
              </div>
            </div>
          </div>
          <div className="scroll-indicator">
            <span>Scroll Down</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 5V15M10 15L5 10M10 15L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* Tech Stack Marquee */}
        <section className="tech-marquee">
          <div className="marquee">
            <div className="track">
              <img src="./imgs/html.png" alt="HTML" width="128" />
              <img src="./imgs/css.png" alt="CSS" width="128" />
              <img src="./imgs/javascript.png" alt="JavaScript" width="128" />
              <img src="./imgs/react.png" alt="React" width="128" />
              <img src="./imgs/nextjs.png" alt="Next.js" width="128" />
              <img src="./imgs/python.png" alt="Python" width="128" />
              <img src="./imgs/azure.png" alt="Azure" width="128" />
              <img src="./imgs/vscode.png" alt="VS Code" width="128" />
              <img src="./imgs/html.png" alt="HTML" width="128" />
              <img src="./imgs/css.png" alt="CSS" width="128" />
              <img src="./imgs/javascript.png" alt="JavaScript" width="128" />
              <img src="./imgs/react.png" alt="React" width="128" />
              <img src="./imgs/nextjs.png" alt="Next.js" width="128" />
              <img src="./imgs/python.png" alt="Python" width="128" />
              <img src="./imgs/azure.png" alt="Azure" width="128" />
              <img src="./imgs/vscode.png" alt="VS Code" width="128" />
            </div>
          </div>
        </section>

        {/* About & Skills Section */}
        <section id="about" className="about-skills-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Get To Know Me</span>
              <h2 className="section-title">About Me</h2>
            </div>
            
            <div className="about-content">
              <div className="about-text">
                <h3>Turning Ideas Into Reality Through Code</h3>
                <p>
                  Hi! I&apos;m Ahmed Dlshad Mohammed, a Dynamic and highly motivated Software Engineer 
                  with a Bachelor&apos;s degree in Software Engineering from University Technology Malaysia (UTM), 
                  graduated March 2025.
                </p>
                <p>
                  I specialize in AI/ML development, full-stack web applications, and cloud services. 
                  With hands-on experience at BlackCode working on AI/ML models and gaming prototypes, 
                  I bring creative problem-solving and technical expertise to every project.
                </p>
                <p>
                  Proficient in C++, Java, Python, HTML5/CSS, and JavaScript, I&apos;m fluent in Kurdish, 
                  Arabic, and English. I&apos;m passionate about leveraging cutting-edge technologies to 
                  build solutions that make a real impact.
                </p>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h4>2+</h4>
                    <p>Years Experience</p>
                  </div>
                  <div className="stat-card">
                    <h4>6+</h4>
                    <p>Projects Completed</p>
                  </div>
                  <div className="stat-card">
                    <h4>3</h4>
                    <p>Languages</p>
                  </div>
                </div>
              </div>

              <div id="skills" className="skills-grid">
                <div className="skill-category">
                  <div className="category-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M28 10L16 4L4 10L16 16L28 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 22L16 28L28 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 16L16 22L28 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Frontend</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">HTML5</span>
                    <span className="skill-tag">CSS3</span>
                    <span className="skill-tag">JavaScript</span>
                    <span className="skill-tag">React</span>
                    <span className="skill-tag">Next.js</span>
                    <span className="skill-tag">Vue.js</span>
                    <span className="skill-tag">Tailwind CSS</span>
                  </div>
                </div>

                <div className="skill-category">
                  <div className="category-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M16 4V28M28 16H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3>Backend</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">Node.js</span>
                    <span className="skill-tag">Express</span>
                    <span className="skill-tag">Python</span>
                    <span className="skill-tag">Java</span>
                    <span className="skill-tag">C++</span>
                    <span className="skill-tag">PHP</span>
                    <span className="skill-tag">Ruby</span>
                  </div>
                </div>

                <div className="skill-category">
                  <div className="category-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 12L20 16L12 20V12Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <h3>Mobile & Cloud</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">Flutter</span>
                    <span className="skill-tag">Dart</span>
                    <span className="skill-tag">Firebase</span>
                    <span className="skill-tag">Azure</span>
                    <span className="skill-tag">AWS</span>
                    <span className="skill-tag">Docker</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Work Experience Section */}
        <section id="experience" className="experience-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">My Journey</span>
              <h2 className="section-title">Work Experience</h2>
            </div>

            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>Junior Developer (Contract)</h3>
                      <h4>BlackCode</h4>
                    </div>
                    <span className="timeline-date">Mar 2025 – May 2025</span>
                  </div>
                  <ul className="timeline-list">
                    <li>Assisted in building and testing AI/ML models and API implementations, contributing to cutting-edge projects in a remote team environment</li>
                    <li>Collaborated on gaming experiment prototypes, brainstorming and implementing innovative ideas with senior developers</li>
                    <li>Developed Python proficiency while applying new technologies and best practices in AI and ML</li>
                    <li>Delivered results in a fast-paced, contract role, balancing independent work with team collaboration and clear communication</li>
                  </ul>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>IT Assistant (Internship)</h3>
                      <h4>Qaiwan Steel Company</h4>
                    </div>
                    <span className="timeline-date">Sep 2024 – Feb 2025</span>
                  </div>
                  <ul className="timeline-list">
                    <li>Assisted in system maintenance, network monitoring, and security to ensure smooth IT operations</li>
                    <li>Provided technical support, troubleshooting hardware and software issues across departments</li>
                    <li>Supported hardware installation, configuration, and software updates to improve system efficiency</li>
                    <li>Gained experience in database management, data backup procedures, and IT documentation</li>
                    <li>Contributed to IT solutions implementation, optimizing processes and improving operational workflows</li>
                  </ul>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>Back End Engineer (Part-Time)</h3>
                      <h4>Relevance</h4>
                    </div>
                    <span className="timeline-date">May 2024 – July 2024</span>
                  </div>
                  <ul className="timeline-list">
                    <li>Developed and maintained backend systems, ensuring scalability and reliability</li>
                    <li>Collaborated with the team to design and implement efficient APIs and database structures</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="projects-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">My Work</span>
              <h2 className="section-title">Featured Projects</h2>
            </div>

            <div className="projects-grid">
              <div className="project-card featured">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="Wathifa Job Matching Platform" />
                  <div className="project-overlay">
                    <a href="#projects" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Full-Stack</span>
                    <span>Stripe API</span>
                    <span>AWS</span>
                  </div>
                  <h3>Wathifa - Job Matching Platform</h3>
                  <p>
                    Comprehensive job-matching platform connecting international job seekers with MENA region employers. 
                    Features automated readiness scoring (65% threshold), one-way messaging, employer dashboard with 
                    advanced filtering, secure Stripe payment processing, and AWS cloud storage for resume management.
                  </p>
                </div>
              </div>

              <div className="project-card">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="AI Resume Analyzer" />
                  <div className="project-overlay">
                    <a href="https://github.com/AhmedDlshad007/AI-Resume-Analyzer" target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Flask</span>
                    <span>OpenAI</span>
                    <span>Python</span>
                  </div>
                  <h3>AI-Powered Resume Analyzer</h3>
                  <p>
                    Web application that analyzes resumes against job descriptions using OpenAI GPT-3.5-turbo. 
                    Extracts text from PDFs/TXT files, calculates match percentages, identifies missing keywords, 
                    and provides tailored improvement suggestions.
                  </p>
                  <a href="https://github.com/AhmedDlshad007/AI-Resume-Analyzer" target="_blank" rel="noopener noreferrer" className="project-github">
                    View on GitHub →
                  </a>
                </div>
              </div>

              <div className="project-card">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="SleepyClock" />
                  <div className="project-overlay">
                    <a href="https://github.com/AhmedDlshad007/SleepyClock" target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>HTML5</span>
                    <span>CSS3</span>
                    <span>JavaScript</span>
                  </div>
                  <h3>SleepyClock</h3>
                  <p>
                    Sleep cycle calculator to help optimize sleep schedules! Features smart sleep calculations, 
                    fully responsive design, dark/light mode toggle, and mobile-first approach. Built with pure 
                    vanilla JavaScript - sometimes the fundamentals are all you need!
                  </p>
                  <a href="https://github.com/AhmedDlshad007/SleepyClock" target="_blank" rel="noopener noreferrer" className="project-github">
                    View on GitHub →
                  </a>
                </div>
              </div>

              <div className="project-card">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="RAG Agent Project" />
                  <div className="project-overlay">
                    <a href="https://github.com/AhmedDlshad007/rag_agent_project.git" target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Python</span>
                    <span>Tkinter</span>
                    <span>RAG</span>
                  </div>
                  <h3>Movie Research Assistant (RAG Agent)</h3>
                  <p>
                    Python-based Retrieval Augmented Generation agent for researching movies and TV shows. 
                    Integrates with TMDb, OMDb, and YouTube APIs to fetch comprehensive movie details, ratings, 
                    release dates, and trailers.
                  </p>
                  <a href="https://github.com/AhmedDlshad007/rag_agent_project.git" target="_blank" rel="noopener noreferrer" className="project-github">
                    View on GitHub →
                  </a>
                </div>
              </div>

              <div className="project-card">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="Anime Character Generator" />
                  <div className="project-overlay">
                    <a href="https://github.com/AhmedDlshad007/Anime-Character-Generator.git" target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Next.js</span>
                    <span>Stable Diffusion</span>
                    <span>AI</span>
                  </div>
                  <h3>Anime Character Generator</h3>
                  <p>
                    Web application that generates anime characters from text prompts using Stable Diffusion XL 
                    via Replicate API. Features a clean, responsive interface built with Next.js and Tailwind CSS, 
                    allowing users to create unique character artwork in seconds.
                  </p>
                  <a href="https://github.com/AhmedDlshad007/Anime-Character-Generator.git" target="_blank" rel="noopener noreferrer" className="project-github">
                    View on GitHub →
                  </a>
                </div>
              </div>

              <div className="project-card">
                <div className="project-image">
                  <img src="./imgs/code.jpg" alt="AI Captioning and Tagging" />
                  <div className="project-overlay">
                    <a href="https://github.com/AhmedDlshad007/AI-Image-Captioning" target="_blank" rel="noopener noreferrer" className="project-link">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>React</span>
                    <span>TypeScript</span>
                    <span>Hugging Face</span>
                  </div>
                  <h3>AI Image Captioning & Tagging Tool</h3>
                  <p>
                    Automatically generates captions and tags for uploaded images using Hugging Face&apos;s BLIP model 
                    for real-time captioning and ResNet-50 for image tagging. Features responsive drag-and-drop 
                    interface built with React and Vite.
                  </p>
                  <a href="https://github.com/AhmedDlshad007/AI-Image-Captioning" target="_blank" rel="noopener noreferrer" className="project-github">
                    View on GitHub →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact / Chatbot Section */}
        <section id="contact" className="contact-section">
          <div className="container">
            <div className="section-header">
              <span className="section-label">Let&apos;s Connect</span>
              <h2 className="section-title">Get In Touch</h2>
            </div>

            <div className="contact-content">
              <div className="contact-info">
                <h3>AI-Powered Assistant</h3>
                <p>
                  I&apos;ve created an AI chatbot that knows all about my skills, work experience, and background. 
                  Feel free to ask it anything about my qualifications, projects, or experience!
                </p>
                <p>
                  You can also reach out to me directly or download my resume to learn more about my work.
                </p>
                
                <div className="contact-methods">
                  <a href="mailto:ahmed.dlshad.m@gmail.com" className="contact-method">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M3 8L10.89 13.26A2 2 0 0013.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <h4>Email</h4>
                      <p>ahmed.dlshad.m@gmail.com</p>
                    </div>
                  </a>

                  <a href="http://www.linkedin.com/in/ahmed-dlshad-007/" target="_blank" rel="noopener noreferrer" className="contact-method">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <div>
                      <h4>LinkedIn</h4>
                      <p>Connect with me</p>
                    </div>
                  </a>

                  <a href="./Ahmed Dlshad Mohammed - Resume_compressed.pdf" className="contact-method">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M7 18H17V16H7V18Z" fill="currentColor"/>
                      <path d="M17 14H7V12H17V14Z" fill="currentColor"/>
                      <path d="M7 10H11V8H7V10Z" fill="currentColor"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z" fill="currentColor"/>
                    </svg>
                    <div>
                      <h4>Resume</h4>
                      <p>Download my CV</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="chatbot-container">
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-avatar">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div>
                      <h4>AI Assistant</h4>
                      <span className="status-indicator">Online</span>
                    </div>
                  </div>
                </div>
                <div className="chat-messages">
                  <div className="messages-scroll">
                    {messages.map((message) => (
                      <div key={message.id} className={`message ${message.role}`}>
                        <div className="message-avatar">
                          {message.role === 'user' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="message-content">
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={submitForm} className="chat-input-form">
                  <input 
                    type="text" 
                    placeholder="Ask me about Ahmed's skills, experience, or projects..." 
                    value={messageInput} 
                    onChange={e => setMessageInput(e.target.value)}
                  />
                  <button type="submit" className="send-button" aria-label="Send message">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-left">
                <div className="footer-logo">
                  <div className="logo">AD</div>
                  <span>Ahmed Dlshad</span>
                </div>
                <p>Building the future, one line of code at a time.</p>
              </div>
              <div className="footer-links">
                <div className="footer-column">
                  <h4>Navigation</h4>
                  <a href="#home">Home</a>
                  <a href="#about">About</a>
                  <a href="#skills">Skills</a>
                </div>
                <div className="footer-column">
                  <h4>Portfolio</h4>
                  <a href="#experience">Experience</a>
                  <a href="#projects">Projects</a>
                  <a href="#contact">Contact</a>
                </div>
                <div className="footer-column">
                  <h4>Connect</h4>
                  <a href="http://github.com/AhmedDlshad007" target="_blank" rel="noopener noreferrer">GitHub</a>
                  <a href="https://www.linkedin.com/in/ahmed-dlshad-007/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  <a href="mailto:ahmed.dlshad.m@gmail.com">Email</a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; 2025 Ahmed Dlshad. All rights reserved.</p>
              <p>Built with Next.js & ❤️</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}