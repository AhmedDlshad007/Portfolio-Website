"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ────────────────────────────────────────────
   Declare globals for space-engine
──────────────────────────────────────────── */
declare global {
  interface Window {
    bootSpace: (cfg: Record<string, unknown>) => void;
    updateSpaceCfg: (cfg: Record<string, unknown>) => void;
    stopSpace: () => void;
    warpBurst: (intensity?: number) => void;
    setSpaceAccent: (key: string) => void;
  }
}

/* ────────────────────────────────────────────
   Marquee tech list (text spans, repeated for seamless loop)
──────────────────────────────────────────── */
const MARQUEE_TECHS = [
  "Python", "TypeScript", "JavaScript", "React", "Next.js", "Node.js",
  "Flask", "Tailwind CSS", "MCP", "OpenRouter", "OpenAI API", "Hugging Face",
  "RAG", "AWS", "Docker", "Vercel", "Git", "C++",
];

const marqueeSpanStyle: React.CSSProperties = {
  color: "var(--purple-300)",
  fontWeight: 700,
  fontSize: "15px",
  whiteSpace: "nowrap",
};

/* ────────────────────────────────────────────
   Suggested chat prompts (shown before the first user message)
──────────────────────────────────────────── */
const SUGGESTED_PROMPTS = [
  "Tell me about Companion",
  "What's his AI experience?",
  "Is he open to work?",
];

/* ────────────────────────────────────────────
   Project link SVG (reused across all cards)
──────────────────────────────────────────── */
function ProjectLinkSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────
   Lightweight markdown for assistant replies
   (paragraphs, -/* and numbered lists, **bold**, `code`).
   Builds React nodes (never dangerouslySetInnerHTML) so model
   output can't inject markup. Tolerant of mid-stream partials.
──────────────────────────────────────────── */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<code key={key++}>{match[3]}</code>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type MdBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function formatMessage(content: string): React.ReactNode {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushPara = () => {
    if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push(
        listOrdered
          ? { type: "ol", items: listItems }
          : { type: "ul", items: listItems }
      );
      listItems = [];
    }
  };

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "h", text: heading[1] });
    } else if (bullet) {
      flushPara();
      const ordered = /\d/.test(bullet[1]);
      if (listItems.length && ordered !== listOrdered) flushList();
      listOrdered = ordered;
      listItems.push(bullet[2]);
    } else if (line === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return blocks.map((b, i) =>
    b.type === "h" ? (
      <p key={i} className="md-heading">{parseInline(b.text)}</p>
    ) : b.type === "p" ? (
      <p key={i}>{parseInline(b.text)}</p>
    ) : b.type === "ol" ? (
      <ol key={i}>{b.items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}</ol>
    ) : (
      <ul key={i}>{b.items.map((it, j) => <li key={j}>{parseInline(it)}</li>)}</ul>
    )
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function Home() {
  /* ── state ── */
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [floatMessageInput, setFloatMessageInput] = useState("");
  const [floatOpen, setFloatOpen] = useState(false);
  const [badgeVisible, setBadgeVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [floatLoading, setFloatLoading] = useState(false);

  /* ── refs ── */
  const heroNameInnerRef = useRef<HTMLSpanElement>(null);
  const heroSubtitleRef = useRef<HTMLHeadingElement>(null);
  const heroDescRef = useRef<HTMLParagraphElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const heroSocialRef = useRef<HTMLDivElement>(null);
  const inlineScrollRef = useRef<HTMLDivElement>(null);
  const floatMessagesRef = useRef<HTMLDivElement>(null);

  /* Note: the assistant's resume context now lives server-side in
     app/api/chat/route.ts — kept out of the client bundle as the single
     source of truth. */

  /* ── messages state (shared by inline + floating chat) ── */
  const [messages, setMessages] = useState([
    {
      id: "initial-msg",
      role: "assistant",
      content: "How can I help you learn more about Ahmed and his Resume?",
    },
  ]);

  /* ── floating chat has its own messages ── */
  const [floatMessages, setFloatMessages] = useState([
    {
      id: "float-initial-msg",
      role: "assistant",
      content: "Hi! Ask me anything about Ahmed's skills, experience, or projects!",
    },
  ]);

  /* ══════════════════════════════════════════
     OpenAI submit — INLINE chat (exact original logic)
  ══════════════════════════════════════════ */
  const sendInline = async (text: string) => {
    const content = text.trim();
    if (!content || isLoading) return;
    const newMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: "user", content },
    ];
    setMessages(newMessages);
    setMessageInput("");
    setIsLoading(true);

    const apiMessages = newMessages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));
    const assistantId = `assistant-${Date.now()}`;

    try {
      const response = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !response.body || contentType.includes("application/json")) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;
        if (!started) {
          started = true;
          setIsLoading(false); // first token arrived — swap dots for the reply
        }
        setMessages([
          ...newMessages,
          { id: assistantId, role: "assistant", content: acc },
        ]);
      }

      if (!started) {
        setIsLoading(false);
        setMessages([
          ...newMessages,
          {
            id: assistantId,
            role: "assistant",
            content: "Sorry, I could not process your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error calling chat API:", error);
      setIsLoading(false);
      setMessages([
        ...newMessages,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, there was an error processing your request. Please try again later.",
        },
      ]);
    }
  };

  const submitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendInline(messageInput);
  };

  /* ══════════════════════════════════════════
     OpenAI submit — FLOATING chat (parallel state)
  ══════════════════════════════════════════ */
  const sendFloat = async (text: string) => {
    const content = text.trim();
    if (!content || floatLoading) return;
    const newMessages = [
      ...floatMessages,
      { id: `fuser-${Date.now()}`, role: "user", content },
    ];
    setFloatMessages(newMessages);
    setFloatMessageInput("");
    setFloatLoading(true);

    const apiMessages = newMessages.map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content,
    }));
    const assistantId = `fassistant-${Date.now()}`;

    try {
      const response = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !response.body || contentType.includes("application/json")) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acc += chunk;
        if (!started) {
          started = true;
          setFloatLoading(false);
        }
        setFloatMessages([
          ...newMessages,
          { id: assistantId, role: "assistant", content: acc },
        ]);
      }

      if (!started) {
        setFloatLoading(false);
        setFloatMessages([
          ...newMessages,
          {
            id: assistantId,
            role: "assistant",
            content: "Sorry, I could not process your request.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error calling chat API:", error);
      setFloatLoading(false);
      setFloatMessages([
        ...newMessages,
        {
          id: `ferror-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, there was an error processing your request. Please try again later.",
        },
      ]);
    }
  };

  const submitFloatForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendFloat(floatMessageInput);
  };

  const toggleMobileMenu = () => setMenuOpen(!menuOpen);

  /* ══════════════════════════════════════════
     Auto-scroll chat containers when messages change
  ══════════════════════════════════════════ */
  useEffect(() => {
    if (inlineScrollRef.current) {
      inlineScrollRef.current.scrollTop = inlineScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (floatMessagesRef.current) {
      floatMessagesRef.current.scrollTop = floatMessagesRef.current.scrollHeight;
    }
  }, [floatMessages, floatLoading]);

  /* ══════════════════════════════════════════
     1) SPACE ENGINE BOOT
  ══════════════════════════════════════════ */
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Lighten the simulation on phones/low-power touch devices.
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia &&
      (window.matchMedia("(max-width: 768px)").matches ||
        window.matchMedia("(pointer: coarse)").matches);
    let freezeTimer: ReturnType<typeof setTimeout> | undefined;
    const script = document.createElement("script");
    script.src = "/space-engine.js";
    script.onload = () => {
      if (window.bootSpace) {
        window.bootSpace({
          blobCount: 0,
          reactivity: reduce ? 0 : 75,
          blurAmount: 50,
          opacity: 4,
          colorMode: "deep-space",
          scrollShift: !reduce,
          rippleOnClick: !reduce,
          gridLines: false,
          speed: 50,
          starCount: isMobile ? 300 : 550,
          deepFieldCount: isMobile ? 1400 : 4000,
          showStreaks: !reduce,
          warpEffect: !reduce,
        });
        // Reduced motion: let the layered scene build, then freeze to a static starfield.
        if (reduce) {
          freezeTimer = setTimeout(() => {
            if (window.stopSpace) window.stopSpace();
          }, 400);
        }
      }
    };
    document.body.appendChild(script);
    return () => {
      if (freezeTimer) clearTimeout(freezeTimer);
      if (window.stopSpace) window.stopSpace();
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  /* ══════════════════════════════════════════
     2) HERO ANIMATION SEQUENCE
  ══════════════════════════════════════════ */
  useEffect(() => {
    const nameEl = heroNameInnerRef.current;
    const subtitleEl = heroSubtitleRef.current;
    const descEl = heroDescRef.current;
    const ctaEl = heroCtaRef.current;
    const socialEl = heroSocialRef.current;
    if (!nameEl || !subtitleEl || !descEl || !ctaEl || !socialEl) return;

    /* ── inject keyframes (shared across fast and slow paths) ── */
    const kfStyle = document.createElement("style");
    kfStyle.textContent = `
      @keyframes fadeInUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
      @keyframes name-shimmer { 0%{background-position:0% center} 100%{background-position:200% center} }
      @keyframes letter-assemble-done { to{opacity:1;transform:none;filter:none;} }
    `;
    document.head.appendChild(kfStyle);

    const nameText = "Ahmed Dlshad";
    const subtitleText = "Full-Stack & Agentic AI Engineer";
    const descText = descEl.textContent?.trim().replace(/\s+/g, " ") || "";

    /* ── Fast path: already seen this session, or user prefers reduced motion ── */
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyPlayed =
      (typeof window !== "undefined" && sessionStorage.getItem("hero-animated") === "1") ||
      prefersReduced;

    if (alreadyPlayed) {
      nameEl.innerHTML = "";
      [...nameText].forEach((ch) => {
        const span = document.createElement("span");
        span.className = "hero-letter";
        span.textContent = ch === " " ? " " : ch;
        span.style.setProperty("--lx", "0px");
        span.style.setProperty("--ly", "0px");
        span.style.setProperty("--lr", "0deg");
        span.style.background =
          "linear-gradient(100deg, #9333ea 0%, #d946ef 30%, #e879f9 50%, #d946ef 70%, #9333ea 100%)";
        span.style.backgroundSize = "200% auto";
        (span.style as unknown as Record<string, string>).webkitBackgroundClip = "text";
        (span.style as unknown as Record<string, string>).webkitTextFillColor = "transparent";
        span.style.backgroundClip = "text";
        span.style.animation = "letter-assemble-done 0s forwards, name-shimmer 4s linear infinite";
        nameEl.appendChild(span);
      });

      subtitleEl.textContent = subtitleText;
      subtitleEl.style.opacity = "1";
      subtitleEl.classList.add("typing-done");

      descEl.style.opacity = "1";
      // description keeps its original textContent — no word-split needed

      ctaEl.style.opacity = "1";
      socialEl.style.opacity = "1";

      return () => {
        if (kfStyle.parentNode) kfStyle.parentNode.removeChild(kfStyle);
      };
    }

    /* ── 1. Letter assembly for name ── */
    nameEl.innerHTML = "";

    [...nameText].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "hero-letter";
      span.textContent = ch === " " ? " " : ch;
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 120;
      const lx = Math.cos(angle) * dist;
      const ly = Math.sin(angle) * dist - 30;
      const lr = (Math.random() - 0.5) * 60;
      span.style.setProperty("--lx", lx + "px");
      span.style.setProperty("--ly", ly + "px");
      span.style.setProperty("--lr", lr + "deg");
      span.style.background =
        "linear-gradient(100deg, #9333ea 0%, #d946ef 30%, #e879f9 50%, #d946ef 70%, #9333ea 100%)";
      span.style.backgroundSize = "200% auto";
      (span.style as unknown as Record<string, string>).webkitBackgroundClip = "text";
      (span.style as unknown as Record<string, string>).webkitTextFillColor = "transparent";
      span.style.backgroundClip = "text";
      span.style.animationDelay = (0.08 + i * 0.06) + "s";
      nameEl.appendChild(span);
    });

    const shimmerDelay = 0.08 + nameText.length * 0.06 + 0.3;

    const shimmerTimeout = setTimeout(() => {
      nameEl.querySelectorAll(".hero-letter").forEach((span) => {
        (span as HTMLElement).style.animation =
          "letter-assemble-done 0s forwards, name-shimmer 4s linear infinite";
      });
    }, shimmerDelay * 1000);

    /* ── 2. Typewriter subtitle ── */
    const typeDelay = shimmerDelay * 1000 + 200;

    const typeTimeout = setTimeout(() => {
      subtitleEl.style.opacity = "1";
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        subtitleEl.textContent = subtitleText.slice(0, charIdx + 1);
        charIdx++;
        if (charIdx >= subtitleText.length) {
          clearInterval(typeInterval);
          setTimeout(() => subtitleEl.classList.add("typing-done"), 800);
        }
      }, 38);
    }, typeDelay);

    /* ── 3. Word blur reveal for description ── */
    const words = descText.split(" ");
    descEl.innerHTML = "";
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "hero-word";
      span.textContent = w;
      span.style.animationDelay = "0s";
      span.style.animationPlayState = "paused";
      descEl.appendChild(span);
      if (i < words.length - 1) descEl.appendChild(document.createTextNode(" "));
    });

    const descDelay = typeDelay + subtitleText.length * 38 + 200;
    const descTimeout = setTimeout(() => {
      descEl.style.opacity = "1";
      descEl.querySelectorAll(".hero-word").forEach((w, i) => {
        (w as HTMLElement).style.animationDelay = i * 0.04 + "s";
        (w as HTMLElement).style.animationPlayState = "running";
      });
    }, descDelay);

    /* ── 4. CTA + social fade in ── */
    const ctaDelay = descDelay + words.length * 40 + 200;
    const ctaTimeout = setTimeout(() => {
      ctaEl.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      ctaEl.style.transform = "translateY(16px)";
      requestAnimationFrame(() => {
        ctaEl.style.opacity = "1";
        ctaEl.style.transform = "translateY(0)";
      });
    }, ctaDelay);

    const socialTimeout = setTimeout(() => {
      socialEl.style.transition = "opacity 0.7s ease, transform 0.7s ease";
      socialEl.style.transform = "translateY(16px)";
      requestAnimationFrame(() => {
        socialEl.style.opacity = "1";
        socialEl.style.transform = "translateY(0)";
      });
      try { sessionStorage.setItem("hero-animated", "1"); } catch {}
    }, ctaDelay + 200);

    return () => {
      clearTimeout(shimmerTimeout);
      clearTimeout(typeTimeout);
      clearTimeout(descTimeout);
      clearTimeout(ctaTimeout);
      clearTimeout(socialTimeout);
      if (kfStyle.parentNode) kfStyle.parentNode.removeChild(kfStyle);
    };
  }, []);

  /* ══════════════════════════════════════════
     4) MAGNETIC BUTTONS
  ══════════════════════════════════════════ */
  useEffect(() => {
    const STRENGTH = 0.35;
    const btns = document.querySelectorAll<HTMLElement>(".magnetic");

    const handlers: Array<{
      el: HTMLElement;
      move: (e: MouseEvent) => void;
      leave: () => void;
      enter: () => void;
    }> = [];

    btns.forEach((btn) => {
      const move = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * STRENGTH;
        const dy = (e.clientY - cy) * STRENGTH;
        btn.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      const leave = () => {
        btn.style.transition =
          "transform 0.5s cubic-bezier(0.23,1,0.32,1), box-shadow 0.25s ease";
        btn.style.transform = "";
        setTimeout(() => {
          btn.style.transition = "";
        }, 500);
      };
      const enter = () => {
        btn.style.transition = "transform 0.15s ease, box-shadow 0.25s ease";
      };

      btn.addEventListener("mousemove", move);
      btn.addEventListener("mouseleave", leave);
      btn.addEventListener("mouseenter", enter);
      handlers.push({ el: btn, move, leave, enter });
    });

    return () => {
      handlers.forEach(({ el, move, leave, enter }) => {
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
        el.removeEventListener("mouseenter", enter);
      });
    };
  }, []);

  /* ══════════════════════════════════════════
     5) SCROLL REVEALS (IntersectionObserver)
  ══════════════════════════════════════════ */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ══════════════════════════════════════════
     5b) SECTION WARP JUMPS — surge the starfield on each new section
  ══════════════════════════════════════════ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let armed = false; // skip the bursts that would fire as sections paint on first load
    const armTimer = setTimeout(() => {
      armed = true;
    }, 1600);
    let lastWarp = 0;
    let lastAccent = "purple";

    // Map a section to its background accent (mirrors the per-section UI tints).
    const accentFor = (el: Element) =>
      el.classList.contains("experience-section")
        ? "blue"
        : el.classList.contains("projects-section")
        ? "teal"
        : "purple";

    const observer = new IntersectionObserver(
      (entries) => {
        if (!armed) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        // Dominant section = highest visible ratio.
        const top = visible.reduce((a, b) =>
          b.intersectionRatio > a.intersectionRatio ? b : a
        );
        const accent = accentFor(top.target);
        if (accent !== lastAccent) {
          lastAccent = accent;
          if (window.setSpaceAccent) window.setSpaceAccent(accent);
        }
        const now = performance.now();
        if (now - lastWarp > 900) {
          lastWarp = now;
          if (window.warpBurst) window.warpBurst(1);
        }
      },
      { threshold: 0.35 }
    );

    document.querySelectorAll("section").forEach((s) => observer.observe(s));
    return () => {
      clearTimeout(armTimer);
      observer.disconnect();
    };
  }, []);

  /* ══════════════════════════════════════════
     6) SKILL TAG STAGGER
  ══════════════════════════════════════════ */
  useEffect(() => {
    document.querySelectorAll(".skill-category").forEach((card) => {
      card.querySelectorAll(".skill-tag").forEach((tag, i) => {
        (tag as HTMLElement).style.setProperty("--tag-i", String(i));
      });
    });
  }, []);

  /* ══════════════════════════════════════════
     7) HEADER SCROLL (glassmorphic state)
  ══════════════════════════════════════════ */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ══════════════════════════════════════════
     Floating Chat toggle
  ══════════════════════════════════════════ */
  const toggleFloatChat = useCallback(() => {
    setFloatOpen((prev) => {
      const next = !prev;
      if (next) setBadgeVisible(false);
      return next;
    });
  }, []);

  /* ══════════════════════════════════════════
     Chat message bubble component (inline helper)
  ══════════════════════════════════════════ */
  const renderMessage = (msg: { id: string; role: string; content: string }) => (
    <div key={msg.id} className={`message ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === "user" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="message-content">
        {msg.role === "assistant" ? formatMessage(msg.content) : <p>{msg.content}</p>}
      </div>
    </div>
  );

  /* Typing indicator bubble (shown while awaiting an AI reply) */
  const typingBubble = (
    <div className="message assistant">
      <div className="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="message-content">
        <div className="typing-indicator" aria-label="Assistant is typing">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════
     JSX
  ════════════════════════════════════════════ */
  return (
    <>
      {/* Background canvas (space engine renders here) */}
      <canvas
        id="bg-canvas"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Ripple layer */}
      <div
        id="ripple-layer"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />

      {/* ── Header ── */}
      <header id="site-header" className={scrolled ? "scrolled" : ""}>
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
                <a href="#contact" className="button">
                  Contact
                </a>
              </li>
            </ul>
            <button
              className="mobile-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="M5 7h14M5 12h14M5 17h10"
                />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* ══════════ Hero Section ══════════ */}
        <section id="home" className="hero-modern">
          <div className="hero-content">
            <div className="hero-text">
              {/* Name — letter assembly from space */}
              <h1
                className="hero-title"
                id="hero-name"
                aria-label="Ahmed Dlshad"
              >
                <span
                  className="name-highlight"
                  id="hero-name-inner"
                  ref={heroNameInnerRef}
                >
                  Ahmed Dlshad
                </span>
              </h1>

              {/* Subtitle — typewriter */}
              <h2
                className="hero-subtitle"
                id="hero-subtitle"
                ref={heroSubtitleRef}
                style={{ opacity: 0, minHeight: "1.4em" }}
              />

              {/* Description — word-by-word blur reveal */}
              <p
                className="hero-description"
                id="hero-desc"
                ref={heroDescRef}
                style={{ opacity: 0 }}
              >
                Software Engineering graduate from Universiti Teknologi
                Malaysia (UTM) now building agentic AI systems and full-stack
                products at BlackCode. Focused on Model Context Protocol (MCP),
                multi-model AI workflows, and shipping things that actually work.
              </p>

              {/* CTA Buttons */}
              <div
                className="hero-cta"
                id="hero-cta"
                ref={heroCtaRef}
                style={{ opacity: 0 }}
              >
                <a href="#contact" className="button primary magnetic">
                  <span>Get In Touch</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <a
                  href="./Ahmed Dlshad Mohammed - Resume_compressed.pdf"
                  className="button secondary magnetic"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 12.5V3.75M10 12.5L7.5 10M10 12.5L12.5 10M3.75 16.25H16.25"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Download CV</span>
                </a>
              </div>

              {/* Social icons */}
              <div
                className="hero-social"
                id="hero-social"
                ref={heroSocialRef}
                style={{ opacity: 0 }}
              >
                <a
                  href="http://github.com/AhmedDlshad007"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/ahmed-dlshad1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="mailto:ahmed.dlshad.m@gmail.com" aria-label="Email">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Hero image */}
            <div
              className="hero-image reveal from-right"
              style={{ transitionDelay: "0.3s" }}
            >
              <div className="image-wrapper">
                <div className="glow-effect"></div>
                <img
                  src="./imgs/me.jpg"
                  alt="Ahmed Dlshad"
                  width={420}
                  height={420}
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="scroll-indicator">
            <span style={{ fontSize: "13px" }}>Scroll</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 5V15M10 15L5 10M10 15L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </section>

        {/* ══════════ Tech Marquee ══════════ */}
        <section className="tech-marquee">
          <div className="marquee">
            <div className="track">
              {/* First set */}
              {MARQUEE_TECHS.map((tech, i) => (
                <span key={`m1-${i}`} style={marqueeSpanStyle}>
                  {tech}
                </span>
              ))}
              {/* Repeat for seamless loop */}
              {MARQUEE_TECHS.map((tech, i) => (
                <span key={`m2-${i}`} style={marqueeSpanStyle}>
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ About & Skills ══════════ */}
        <section id="about" className="about-skills-section">
          <div className="container">
            <div className="section-header reveal">
              <span className="section-label">Get To Know Me</span>
              <h2 className="section-title">About Me</h2>
            </div>

            <div className="about-content">
              <div className="about-text reveal from-left">
                <h3>Building Where Agentic AI Meets Full-Stack</h3>
                <p>
                  Hi! I&apos;m Ahmed Dlshad Mohammed, a Full-Stack &amp; Agentic
                  AI Engineer at BlackCode (Switzerland, remote). I hold a B.Sc.
                  in Software Engineering with honours from Universiti Teknologi
                  Malaysia (UTM), graduated March 2025.
                </p>
                <p>
                  My current focus is Companion — an Agentic AI desktop
                  controller built on the Model Context Protocol (MCP). It lets
                  AI agents drive the browser, the local filesystem, and Gmail,
                  with multi-model support through OpenRouter. Alongside it, I
                  lead React/Next.js + Node.js/Python product work.
                </p>
                <p>
                  I work across Python, TypeScript, C++, and Java. Native Kurdish
                  and Arabic speaker, proficient in English (B2–C1). I&apos;m
                  driven by problems where good engineering and AI capability
                  combine into something genuinely useful.
                </p>
                <div className="stats-grid">
                  <div
                    className="stat-card reveal"
                    style={{ transitionDelay: "0.1s" }}
                  >
                    <h4>2+</h4>
                    <p>Years Experience</p>
                  </div>
                  <div
                    className="stat-card reveal"
                    style={{ transitionDelay: "0.2s" }}
                  >
                    <h4>7+</h4>
                    <p>Projects Completed</p>
                  </div>
                  <div
                    className="stat-card reveal"
                    style={{ transitionDelay: "0.3s" }}
                  >
                    <h4>3</h4>
                    <p>Languages</p>
                  </div>
                </div>
              </div>

              <div id="skills" className="skills-grid">
                {/* Languages */}
                <div
                  className="skill-category reveal"
                  style={{ transitionDelay: "0.1s" }}
                >
                  <div className="category-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <path
                        d="M9 9L4 16L9 23M23 9L28 16L23 23M19 6L13 26"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3>Languages</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">Python</span>
                    <span className="skill-tag">JavaScript</span>
                    <span className="skill-tag">TypeScript</span>
                    <span className="skill-tag">C++</span>
                    <span className="skill-tag">Java</span>
                    <span className="skill-tag">HTML5</span>
                    <span className="skill-tag">CSS3</span>
                  </div>
                </div>

                {/* Frameworks */}
                <div
                  className="skill-category reveal"
                  style={{ transitionDelay: "0.2s" }}
                >
                  <div className="category-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <path
                        d="M28 10L16 4L4 10L16 16L28 10Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 22L16 28L28 22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 16L16 22L28 16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3>Frameworks</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">React</span>
                    <span className="skill-tag">Next.js</span>
                    <span className="skill-tag">Node.js</span>
                    <span className="skill-tag">Flask</span>
                    <span className="skill-tag">Tailwind CSS</span>
                  </div>
                </div>

                {/* AI / Agents */}
                <div
                  className="skill-category reveal"
                  style={{ transitionDelay: "0.3s" }}
                >
                  <div className="category-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <circle cx="16" cy="16" r="3" fill="currentColor" />
                      <circle
                        cx="16"
                        cy="16"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 6V2M16 30V26M26 16H30M2 16H6M23 9L26 6M6 26L9 23M23 23L26 26M6 6L9 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h3>AI &amp; Agents</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">Agentic AI</span>
                    <span className="skill-tag">MCP</span>
                    <span className="skill-tag">OpenRouter</span>
                    <span className="skill-tag">OpenAI API</span>
                    <span className="skill-tag">Hugging Face</span>
                    <span className="skill-tag">RAG</span>
                    <span className="skill-tag">Stable Diffusion</span>
                  </div>
                </div>

                {/* Cloud & Tools */}
                <div
                  className="skill-category reveal"
                  style={{ transitionDelay: "0.4s" }}
                >
                  <div className="category-icon">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <path
                        d="M22 18C25.3137 18 28 15.3137 28 12C28 8.68629 25.3137 6 22 6C21.7376 6 21.4789 6.01686 21.2253 6.04955C20.0832 4.21841 18.0508 3 15.7273 3C12.4286 3 9.71429 5.39674 9.20889 8.55556C9.13889 8.55159 9.06806 8.55556 9 8.55556C5.13401 8.55556 2 11.6896 2 15.5556C2 19.4215 5.13401 22.5556 9 22.5556H22"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 22L16 26L18 22M16 16V26"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3>Cloud &amp; Tools</h3>
                  <div className="skill-tags">
                    <span className="skill-tag">AWS</span>
                    <span className="skill-tag">Docker</span>
                    <span className="skill-tag">Vercel</span>
                    <span className="skill-tag">Railway</span>
                    <span className="skill-tag">Git</span>
                    <span className="skill-tag">GitHub</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ Experience ══════════ */}
        <section id="experience" className="experience-section">
          <div className="container">
            <div className="section-header reveal">
              <span className="section-label">My Journey</span>
              <h2 className="section-title">Work Experience</h2>
            </div>

            <div className="timeline">
              <div
                className="timeline-item reveal from-left"
                style={{ transitionDelay: "0.05s" }}
              >
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>Full-Stack &amp; Agentic AI Engineer (Full-Time)</h3>
                      <h4>BlackCode · Switzerland (Remote)</h4>
                    </div>
                    <span className="timeline-date">Feb 2026 – Present</span>
                  </div>
                  <ul className="timeline-list">
                    <li>
                      Lead full-stack development using React/Next.js (frontend)
                      and Node.js/Python (backend), with focus on performance
                      and scalability
                    </li>
                    <li>
                      Engineer Companion — an Agentic AI desktop controller built
                      on the Model Context Protocol (MCP), enabling AI agents to
                      control the browser, access the local file system,
                      interact with Gmail, and execute cross-application
                      workflows
                    </li>
                    <li>
                      Integrated OpenRouter to support any large language model
                      within Companion, giving users flexible multi-model AI
                      access from a single interface
                    </li>
                    <li>
                      Design and maintain MCP server integrations and autonomous
                      agent pipelines for real-world task automation
                    </li>
                  </ul>
                </div>
              </div>

              <div
                className="timeline-item reveal from-left"
                style={{ transitionDelay: "0.15s" }}
              >
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>Junior Developer (Contract)</h3>
                      <h4>BlackCode · Switzerland (Remote)</h4>
                    </div>
                    <span className="timeline-date">Mar 2025 – May 2025</span>
                  </div>
                  <ul className="timeline-list">
                    <li>
                      Built and tested AI/ML models and API integrations for
                      internal research projects alongside senior engineers
                    </li>
                    <li>
                      Implemented gaming experiment prototypes and applied
                      Python best practices in AI/ML development
                    </li>
                  </ul>
                </div>
              </div>

              <div
                className="timeline-item reveal from-left"
                style={{ transitionDelay: "0.25s" }}
              >
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>IT Assistant (Internship)</h3>
                      <h4>Qaiwan Steel Company · Kifri, Iraq</h4>
                    </div>
                    <span className="timeline-date">Sep 2024 – Feb 2025</span>
                  </div>
                  <ul className="timeline-list">
                    <li>
                      Maintained systems, monitored networks, and provided
                      hardware/software support across departments
                    </li>
                    <li>
                      Gained practical experience in database management, data
                      backup, and IT documentation
                    </li>
                  </ul>
                </div>
              </div>

              <div
                className="timeline-item reveal from-left"
                style={{ transitionDelay: "0.35s" }}
              >
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <div>
                      <h3>Back-End Engineer Intern (Part-Time)</h3>
                      <h4>Relevance · Remote</h4>
                    </div>
                    <span className="timeline-date">May 2024 – Jul 2024</span>
                  </div>
                  <ul className="timeline-list">
                    <li>
                      Developed backend systems and designed RESTful APIs and
                      relational database schemas
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ Projects ══════════ */}
        <section id="projects" className="projects-section">
          <div className="container">
            <div className="section-header reveal">
              <span className="section-label">My Work</span>
              <h2 className="section-title">Featured Projects</h2>
            </div>

            <div className="projects-grid">
              {/* Companion — Agentic AI Desktop Controller (featured, ongoing) */}
              <div
                className="project-card featured reveal scale-in"
                style={{ transitionDelay: "0.05s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="Companion Agentic AI Desktop Controller"
                  />
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Agentic AI</span>
                    <span>MCP</span>
                    <span>OpenRouter</span>
                    <span>Python</span>
                  </div>
                  <h3>Companion — Agentic AI Desktop Controller</h3>
                  <p>
                    AI agent application built on the Model Context Protocol
                    (MCP). Lets AI agents control the browser, access the local
                    file system, manage Gmail, and execute multi-application
                    workflows. Supports any LLM via OpenRouter integration.
                    Currently in active development at BlackCode.
                  </p>
                </div>
              </div>

              {/* Wathifa */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.1s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="Wathifa Job Matching Platform"
                  />
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>Full-Stack</span>
                    <span>Stripe API</span>
                    <span>AWS</span>
                  </div>
                  <h3>Wathifa - Job Matching Platform</h3>
                  <p>
                    Comprehensive job-matching platform connecting international
                    job seekers with MENA region employers. Features automated
                    readiness scoring (65% threshold), one-way messaging,
                    employer dashboard with advanced filtering, secure Stripe
                    payment processing, and AWS cloud storage for resume
                    management.
                  </p>
                </div>
              </div>

              {/* AI Resume Analyzer */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.1s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="AI Resume Analyzer"
                  />
                  <div className="project-overlay">
                    <a
                      href="https://github.com/AhmedDlshad007/AI-Resume-Analyzer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      <ProjectLinkSvg />
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
                    Web application that analyzes resumes against job
                    descriptions using OpenAI GPT-3.5-turbo. Extracts text from
                    PDFs/TXT files, calculates match percentages, identifies
                    missing keywords, and provides tailored improvement
                    suggestions.
                  </p>
                  <a
                    href="https://github.com/AhmedDlshad007/AI-Resume-Analyzer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-github"
                  >
                    View on GitHub →
                  </a>
                </div>
              </div>

              {/* SleepyClock */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.2s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="SleepyClock"
                  />
                  <div className="project-overlay">
                    <a
                      href="https://github.com/AhmedDlshad007/SleepyClock"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      <ProjectLinkSvg />
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
                    Sleep cycle calculator to help optimize sleep schedules!
                    Features smart sleep calculations, fully responsive design,
                    dark/light mode toggle, and mobile-first approach. Built with
                    pure vanilla JavaScript - sometimes the fundamentals are all
                    you need!
                  </p>
                  <a
                    href="https://github.com/AhmedDlshad007/SleepyClock"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-github"
                  >
                    View on GitHub →
                  </a>
                </div>
              </div>

              {/* RAG Agent */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.3s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="RAG Agent Project"
                  />
                  <div className="project-overlay">
                    <a
                      href="https://github.com/AhmedDlshad007/rag_agent_project.git"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      <ProjectLinkSvg />
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
                    Python-based Retrieval Augmented Generation agent for
                    researching movies and TV shows. Integrates with TMDb, OMDb,
                    and YouTube APIs to fetch comprehensive movie details,
                    ratings, release dates, and trailers.
                  </p>
                  <a
                    href="https://github.com/AhmedDlshad007/rag_agent_project.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-github"
                  >
                    View on GitHub →
                  </a>
                </div>
              </div>

              {/* Anime Character Generator */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.4s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="Anime Character Generator"
                  />
                  <div className="project-overlay">
                    <a
                      href="https://github.com/AhmedDlshad007/Anime-Character-Generator.git"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      <ProjectLinkSvg />
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
                    Web application that generates anime characters from text
                    prompts using Stable Diffusion XL via Replicate API. Features
                    a clean, responsive interface built with Next.js and Tailwind
                    CSS, allowing users to create unique character artwork in
                    seconds.
                  </p>
                  <a
                    href="https://github.com/AhmedDlshad007/Anime-Character-Generator.git"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-github"
                  >
                    View on GitHub →
                  </a>
                </div>
              </div>

              {/* AI Image Captioning */}
              <div
                className="project-card reveal scale-in"
                style={{ transitionDelay: "0.5s" }}
              >
                <div className="project-image">
                  <img
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                    src="./imgs/code.jpg"
                    alt="AI Captioning and Tagging"
                  />
                  <div className="project-overlay">
                    <a
                      href="https://github.com/AhmedDlshad007/AI-Image-Captioning"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="project-link"
                    >
                      <ProjectLinkSvg />
                    </a>
                  </div>
                </div>
                <div className="project-content">
                  <div className="project-tags">
                    <span>React</span>
                    <span>TypeScript</span>
                    <span>Hugging Face</span>
                  </div>
                  <h3>AI Image Captioning &amp; Tagging Tool</h3>
                  <p>
                    Automatically generates captions and tags for uploaded images
                    using Hugging Face&apos;s BLIP model for real-time captioning
                    and ResNet-50 for image tagging. Features responsive
                    drag-and-drop interface built with React and Vite.
                  </p>
                  <a
                    href="https://github.com/AhmedDlshad007/AI-Image-Captioning"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-github"
                  >
                    View on GitHub →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ Contact / Chatbot ══════════ */}
        <section id="contact" className="contact-section">
          <div className="container">
            <div className="section-header reveal">
              <span className="section-label">Let&apos;s Connect</span>
              <h2 className="section-title">Get In Touch</h2>
            </div>

            <div className="contact-content">
              <div className="contact-info reveal from-left">
                <h3>AI-Powered Assistant</h3>
                <p>
                  I&apos;ve created an AI chatbot that knows all about my skills,
                  work experience, and background. Feel free to ask it anything
                  about my qualifications, projects, or experience!
                </p>
                <p>
                  You can also reach out to me directly or download my resume to
                  learn more about my work.
                </p>

                <div className="contact-methods">
                  <a
                    href="mailto:ahmed.dlshad.m@gmail.com"
                    className="contact-method"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 8L10.89 13.26A2 2 0 0013.11 13.26L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <h4>Email</h4>
                      <p>ahmed.dlshad.m@gmail.com</p>
                    </div>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/ahmed-dlshad1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-method"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <div>
                      <h4>LinkedIn</h4>
                      <p>Connect with me</p>
                    </div>
                  </a>

                  <a
                    href="./Ahmed Dlshad Mohammed - Resume_compressed.pdf"
                    className="contact-method"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 18H17V16H7V18Z"
                        fill="currentColor"
                      />
                      <path
                        d="M17 14H7V12H17V14Z"
                        fill="currentColor"
                      />
                      <path
                        d="M7 10H11V8H7V10Z"
                        fill="currentColor"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M6 2C4.34315 2 3 3.34315 3 5V19C3 20.6569 4.34315 22 6 22H18C19.6569 22 21 20.6569 21 19V9C21 5.13401 17.866 2 14 2H6ZM6 4H13V9H19V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4ZM15 4.10002C16.6113 4.4271 17.9413 5.52906 18.584 7H15V4.10002Z"
                        fill="currentColor"
                      />
                    </svg>
                    <div>
                      <h4>Resume</h4>
                      <p>Download my CV</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Inline chatbot */}
              <div
                className="chatbot-container reveal scale-in"
                style={{ transitionDelay: "0.2s" }}
              >
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-avatar">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4>AI Assistant</h4>
                      <span className="status-indicator">
                        <span className="status-dot"></span>Online
                      </span>
                    </div>
                  </div>
                </div>
                <div className="chat-messages">
                  <div
                    className="messages-scroll"
                    ref={inlineScrollRef}
                    role="log"
                    aria-live="polite"
                    aria-atomic="false"
                  >
                    {messages.map(renderMessage)}
                    {isLoading && typingBubble}
                  </div>
                </div>
                {messages.length <= 1 && !isLoading && (
                  <div className="prompt-chips">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="prompt-chip"
                        onClick={() => sendInline(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <form onSubmit={submitForm} className="chat-input-form">
                  <input
                    type="text"
                    placeholder="Ask me about Ahmed's skills, experience, or projects..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    aria-label="Send message"
                    disabled={isLoading}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ Footer ══════════ */}
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
                  <a
                    href="http://github.com/AhmedDlshad007"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/ahmed-dlshad1/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn
                  </a>
                  <a href="mailto:ahmed.dlshad.m@gmail.com">Email</a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} Ahmed Dlshad. All rights reserved.</p>
              <p>Built with Next.js &amp; ❤️</p>
            </div>
          </div>
        </footer>
      </main>

      {/* ══════════ Floating Chat Button ══════════ */}
      <button
        id="float-chat-btn"
        aria-label="Open AI Chat"
        onClick={toggleFloatChat}
      >
        {badgeVisible && <div className="notif-badge">1</div>}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ══════════ Floating Chat Panel ══════════ */}
      <div
        id="float-chat-panel"
        className={floatOpen ? "open" : ""}
        role="dialog"
        aria-label="AI Assistant Chat"
      >
        <div className="float-chat-header">
          <div className="float-chat-header-left">
            <div className="chat-avatar" style={{ width: 32, height: 32 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h4>Ahmed&apos;s AI Assistant</h4>
          </div>
          <button
            className="float-chat-close"
            onClick={() => setFloatOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div
          className="float-chat-messages"
          ref={floatMessagesRef}
          role="log"
          aria-live="polite"
          aria-atomic="false"
        >
          {floatMessages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div
                className="message-avatar"
                style={{
                  width: msg.role === "user" ? 34 : 28,
                  height: msg.role === "user" ? 34 : 28,
                  flexShrink: 0,
                }}
              >
                {msg.role === "user" ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div className="message-content">
                {msg.role === "assistant" ? (
                  formatMessage(msg.content)
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {floatLoading && typingBubble}
        </div>
        {floatMessages.length <= 1 && !floatLoading && (
          <div className="prompt-chips float-prompt-chips">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="prompt-chip"
                onClick={() => sendFloat(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={submitFloatForm}
          className="float-chat-input"
        >
          <input
            type="text"
            placeholder="Ask me something..."
            value={floatMessageInput}
            onChange={(e) => setFloatMessageInput(e.target.value)}
            disabled={floatLoading}
          />
          <button
            type="submit"
            className="float-send"
            aria-label="Send"
            disabled={floatLoading}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
