# Portfolio Reference Project

This repository contains the source for my personal portfolio site. It's built with Angular on the front end, TailwindCSS with DaisyUI for styling, and a small ASP.NET server used for streaming responses from the OpenAI API. Feel free to clone it as a starting point for your own portfolio.

## Getting Started

### Prerequisites

- **Node.js** (18 or later)
- **.NET SDK** (9.0 or later) – required if you want to run the optional server that provides AI chat features

### Clone and Install

```bash
# clone the project
git clone <repository-url>
cd Portfolio

# install client dependencies
cd benkuhman.Client
npm install
```

If you want to use the AI Solutions page you will also need to run the server:

```bash
# from the repo root
cd benkuhman.Server
# set your OpenAI API key (stored with user secrets)
dotnet user-secrets set "OpenAI:ApiKey" "YOUR_KEY_HERE"
# run the server
dotnet run
```

When the server is running locally it listens on `https://localhost:7020`. The Angular development environment points to this URL by default.

### Start the Client

Open a new terminal and run:

```bash
cd benkuhman.Client
npm start
```

Navigate to `http://localhost:4200/` to view the site.

## Techniques and Customization

The project shows a few patterns you can reuse in your own portfolio:

- **TailwindCSS & DaisyUI** – Tailwind handles utility classes while DaisyUI provides pre-styled components. Themes are switched in `ThemeService` which toggles between `emerald` and `sunset` themes based on dark mode preference【F:benkuhman.Client/src/app/services/theme.service.ts†L1-L32】.
- **Scroll Animations** – Elements fade and slide into view using the custom `ScrollSlideIn` directive. It applies Tailwind classes when elements intersect the viewport【F:benkuhman.Client/src/app/directives/slide-in.directive.ts†L1-L70】.
- **Typed Hero Text** – The home page showcases rotating technology names via the TypeIt library. Strings are shuffled and looped for a dynamic effect【F:benkuhman.Client/src/app/views/home/home.component.ts†L37-L71】.
- **EmailJS Contact Form** – `EmailjsService` lazily loads the EmailJS script and sends form submissions without a backend【F:benkuhman.Client/src/app/services/emailjs.service.ts†L1-L34】.
- **AI Solutions Chat** – For a more advanced demo, the AI Solutions view streams responses from an ASP.NET endpoint that forwards requests to OpenAI. The prompt used for generating suggestions is defined inline in the component【F:benkuhman.Client/src/app/views/ai-solutions/ai-solutions.component.ts†L60-L110】.

Explore the component and view folders to see how DaisyUI classes are combined with Tailwind utilities to create responsive cards, stats, forms, and dark mode aware layouts.

## Running Tests

Angular unit tests can be executed with:

```bash
cd benkuhman.Client
npm test
```

The server has no tests defined but you can run `dotnet build` to ensure it compiles.

## Contributing

This project is intended as a reference. Feel free to fork it and adapt any pieces for your own portfolio. If you do find improvements, pull requests are welcome.

