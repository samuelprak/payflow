## ADDED Requirements

### Requirement: Landing page renders at root route
The system SHALL render a marketing landing page at `/` (the root route), composed of sequential sections within a light-themed container.

#### Scenario: User visits root URL
- **WHEN** an unauthenticated user navigates to `/`
- **THEN** they see the landing page with Navbar, Hero, Problem, HowItWorks, Features, CodeExample, CTA, and Footer sections

### Requirement: Landing page uses separate light theme
The system SHALL define a landing-specific color palette in `modules/landing/theme/landingTheme.ts` with light background, blue/indigo accent colors, and gradient definitions — distinct from the dark dashboard theme.

#### Scenario: Landing page has light background
- **WHEN** the landing page renders
- **THEN** the page background uses the landing theme's light cream/white color, not the dark dashboard theme

### Requirement: Navbar with navigation and auth actions
The system SHALL render a fixed Navbar at the top of the landing page with the Payflow logo, anchor links to page sections ("Features", "How It Works"), and auth action buttons ("Sign In" / "Get Started").

#### Scenario: Unauthenticated user sees registration CTA
- **WHEN** an unauthenticated user views the Navbar
- **THEN** they see "Get Started" (triggers Keycloak registration) and "Sign In" (triggers Keycloak login) buttons

#### Scenario: Authenticated user sees dashboard link
- **WHEN** an authenticated user views the Navbar
- **THEN** the CTA button links to `/app/dashboard` instead of showing registration

### Requirement: Hero section with value proposition
The system SHALL render a Hero section with: a headline communicating Payflow's core value ("Payments without the plumbing"), a subtitle with a one-line description, CTA buttons ("Get Started" + "View API Docs"), and an animated code snippet showing a sample API call and response.

#### Scenario: Hero renders with animated elements
- **WHEN** the Hero section enters the viewport
- **THEN** headline, subtitle, CTAs, and code snippet animate in with staggered delays using AnimatedSection

### Requirement: Problem section explaining pain points
The system SHALL render a Problem section with 3 cards describing pain points: Stripe complexity, error-prone webhook handling, and reinventing payment integration per product.

#### Scenario: Problem cards display
- **WHEN** the Problem section enters the viewport
- **THEN** three cards animate in, each with an icon, title, and description

### Requirement: How It Works section with 3-step flow
The system SHALL render a HowItWorks section showing the integration flow in 3 numbered steps: (1) Connect your Stripe account, (2) Create a tenant and get an API key, (3) Call the API — subscriptions work.

#### Scenario: Steps display in order
- **WHEN** the HowItWorks section is visible
- **THEN** three steps display with numbers, titles, and descriptions

### Requirement: Features section with capability grid
The system SHALL render a Features section as a grid of 6 feature cards: Simple REST API, Webhook Forwarding, Checkout Sessions, Billing Portal, Fraud Protection, Multi-Tenant Support. Each card SHALL have an icon, title, and brief description.

#### Scenario: Feature grid renders
- **WHEN** the Features section is visible
- **THEN** six feature cards display in a responsive grid layout

### Requirement: Code Example section with tabbed snippets
The system SHALL render a CodeExample section showing API usage in multiple languages (curl, JavaScript, Python) with tabs to switch between them. The examples SHALL demonstrate the `/customers/sync` and `/customers/:id/checkout-sessions` endpoints.

#### Scenario: User switches code language
- **WHEN** a user clicks the "JavaScript" tab
- **THEN** the code snippet updates to show the JavaScript example

### Requirement: CTA section with final call to action
The system SHALL render a CTA section with a headline ("Start integrating in 5 minutes"), a "Get Started" button (triggers registration), and a "View API Docs" link.

#### Scenario: CTA renders
- **WHEN** the CTA section is visible
- **THEN** the headline, registration button, and docs link are displayed

### Requirement: Footer with links
The system SHALL render a Footer with the Payflow logo, navigation links (GitHub, API Docs), and copyright notice.

#### Scenario: Footer renders
- **WHEN** the user scrolls to the bottom
- **THEN** the Footer displays with logo, links, and copyright

### Requirement: Scroll-triggered animations
The system SHALL use an AnimatedSection wrapper component (using Intersection Observer via a `useInView` hook) to fade-in sections as they enter the viewport, matching Boardbot's landing page animation pattern.

#### Scenario: Section animates on scroll
- **WHEN** a section enters the viewport
- **THEN** it fades in with a upward slide transition
