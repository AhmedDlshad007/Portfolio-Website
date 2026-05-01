# Tech Context

## Technologies Used
- Next.js 15.2.4 (Static Export)
- React 19.0.0
- TypeScript
- Tailwind CSS
- CSS3 with modern features (gradients, backdrop-filter, transforms)
- OpenAI GPT-3.5 Turbo (for chatbot)
- Netlify (for hosting)

## Design System
- **Primary Colors**: Black (#000000), Purple (#9333ea), Deep Purple (#6b21a8)
- **Accent Colors**: Fuchsia/Magenta (#e879f9), Light Purple (#a855f7)
- **Complementary Colors**: Silver (#d4d4d8), Gray shades for backgrounds
- **Gradients**: Purple gradients (135deg from deep purple to light purple), Dark gradients (black to purple)
- **Effects**: Box shadows with purple glow, gradient text, backdrop blur, smooth transitions

## Development Setup
- Development: 'next dev --turbopack'
- Build: 'next build'
- Export: 'next export'
- Start: 'next start'
- Lint: 'next lint'
- OpenAI API key stored in Netlify environment variables

## Technical Constraints
- Static export using Next.js output: 'export'
- Client-side API calls for OpenAI integration
- TypeScript strict mode enabled
- Next.js app router architecture
- OpenAI API rate limits (on free/low-cost tier)

## Dependencies
- next: 15.2.4
- react: ^19.0.0
- react-dom: ^19.0.0
- openai: ^4.93.0
- @netlify/plugin-nextjs: ^5.10.5
- TypeScript and type definitions
- Tailwind CSS

## Hosting Configuration
- Deployed on Netlify (free tier)
- Static site export in 'out' directory
- Environment variables configured in Netlify dashboard
- netlify.toml with redirects for client-side routing
- Configured for continuous deployment from Git
