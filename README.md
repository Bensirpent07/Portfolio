# Portfolio Reference Project

This repository contains the source for my personal portfolio site. It's built with Angular on the front end, TailwindCSS with DaisyUI for styling, and a small ASP.NET server used for streaming responses from the OpenAI API. Feel free to clone it as a starting point for your own portfolio.

## Getting Started

### Prerequisites

- **Node.js 24** (the version used in CI)
- **.NET SDK** (9.0 or later) – required if you want to run the optional server that provides AI chat features

### Clone and Install

```bash
# clone the project
git clone <repository-url>
cd Portfolio

# install client dependencies
cd benkuhman.Client
npm ci
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

- **TailwindCSS & DaisyUI** – Tailwind handles utility classes while DaisyUI provides pre-styled components. [ThemeService](benkuhman.Client/src/app/services/theme.service.ts) switches between `emerald` and `sunset` themes based on dark mode preference.
- **Scroll Animations** – Elements fade and slide into view using the custom [SlideInDirective](benkuhman.Client/src/app/directives/slide-in.directive.ts). It applies Tailwind classes when elements intersect the viewport.
- **Typed Hero Text** – The [home page](benkuhman.Client/src/app/views/home/home.component.ts) showcases rotating technology names via the TypeIt library. Strings are shuffled and looped for a dynamic effect.
- **EmailJS Contact Form** – [EmailjsService](benkuhman.Client/src/app/services/emailjs.service.ts) lazily loads the EmailJS script and sends form submissions without a backend.
- **AI Solutions Chat** – The [AI Solutions view](benkuhman.Client/src/app/views/ai-solutions/ai-solutions.component.ts) streams responses from an ASP.NET endpoint that forwards requests to OpenAI. The prompt used for generating suggestions is defined inline in the component.

Explore the component and view folders to see how DaisyUI classes are combined with Tailwind utilities to create responsive cards, stats, forms, and dark mode aware layouts.

## Running Tests

Angular unit tests can be executed with:

```bash
cd benkuhman.Client
npm test
```

For the same noninteractive checks used in CI, run `npm run typecheck`, `npm run test:ci` (requires Chrome), and `npm run build` in `benkuhman.Client`.

Run the API integration tests with `dotnet test benkuhman.Server/benkuhman.Server.sln`. They use a fake OpenAI provider and require no API key or paid requests. CI runs these tests before publishing a self-contained Linux x64 application. Deployment and rollback checks run separately against disposable directories with mocked service and HTTP calls.

The chat API defaults to `gpt-6-luna`, with reasoning disabled and a 600-token output limit. Set `OpenAI:Model` in server configuration to use another compatible model. Credentials remain server-side, and the API limits request history and input size.

## Continuous Integration

GitHub Actions runs frontend typechecking, Chrome Headless tests, a production build, the server build, and CodeQL analysis for JavaScript/TypeScript and C# on every PR targeting `master` and on pushes to `master`. CodeQL also runs weekly. Push builds save the static website and published API as separate artifacts for seven days.

The workflows use read-only default permissions and cancel superseded PR runs. Weekly Dependabot updates cover npm, NuGet, and GitHub Actions.

On Linux with Bash and rsync installed, run `bash scripts/test-deploy.sh` to exercise deployment and rollback behavior in disposable directories. Service restarts and HTTP calls are mocked during these checks.

## Continuous Deployment

Deployment is optional and disabled by default. After a push to `master` passes CI, the production job can deploy the website and self-contained Linux API. It saves backups, preserves server configuration, checks health, and restores the previous files if deployment fails. Forks should adapt the deployment workflow and script to their own infrastructure and supply credentials through GitHub environment secrets.

## Contributing

This project is intended as a reference. Feel free to fork it and adapt any pieces for your own portfolio. If you do find improvements, pull requests are welcome.

