---
author: AI Documentation Skill
dependencies:
- docusaurus-pro-docs
description: Advanced skill to enhance existing documentation sections
  or generate new technical documentation using Docusaurus MDX best
  practices, diagrams, code examples and architecture patterns.
name: docusaurus-section-enhancer
version: 3.2
---

# Docusaurus Documentation Enhancer Skill (v3.2)

This skill can perform **two types of tasks**:

1.  **Enhance an existing documentation section**
2.  **Generate new documentation for a specific topic**

The output must always follow **Docusaurus MDX best practices** and
leverage the capabilities defined in the `docusaurus-pro-docs` skill.

The goal is to produce documentation that is:

-   technically precise
-   visually engaging
-   architecturally illustrative
-   implementation-ready
-   memorable and impactful

Documentation should not only explain concepts --- **it should enable
readers to build and operate systems**.

------------------------------------------------------------------------

# Supported Modes

## Mode 1 --- Improve Existing Section

Enhances and restructures an existing documentation section while
preserving the original meaning.

Required parameter:

    section: <name of the documentation section>

Optional:

    content: <existing content>

The skill will:

-   reorganize the content
-   improve clarity
-   add diagrams
-   add examples
-   add MDX features
-   maintain the original intent

------------------------------------------------------------------------

## Mode 2 --- Create New Documentation

Generates a **new documentation page or section** for a specific topic.

Required parameter:

    topic: <documentation topic>

Example:

    topic: Event Driven Architecture with Kafka

The skill will:

-   design the documentation structure
-   generate explanations
-   add diagrams
-   include implementation examples
-   provide configuration templates when relevant

------------------------------------------------------------------------

# Mandatory Dependency

This skill MUST use the capabilities defined in:

    @docusaurus-pro-docs

Use it to generate:

-   MDX compliant documentation
-   visual layout structures
-   tabs
-   admonitions
-   diagrams
-   structured headings
-   code examples
-   configuration templates

All outputs must be **valid Docusaurus MDX**.

------------------------------------------------------------------------

# Core Documentation Principles

## Clarity

Explain ideas with precision.

Avoid:

-   vague explanations
-   ambiguous terminology

## Conciseness

Prefer:

-   short paragraphs
-   structured sections
-   bullet points

## **Docusaurus admonitions** in place of Markdown quote blocks

Use **Docusaurus admonitions** instead of Markdown quote blocks.

❌ Do NOT use Markdown quote blocks:

    > impactful phrase

✅ Always use **Docusaurus admonitions**:

``` md
:::tip Insight
impactful phrase
:::
```

Example:

``` md
:::tip API Improvement
The best API documentation is the one you never have to write manually.
:::
```

Example:

``` md
:::info Architecture Principle
A well-designed architecture does not just scale systems — it scales teams.
:::
```

Rules:

-   Never render impactful phrases using `>` blockquotes.
-   Always use `:::tip`, `:::info`, or `:::note`.
-   Provide a short descriptive title.
-   Keep the insight concise and memorable.

------------------------------------------------------------------------

# Dynamic Section Design

The documentation **must NOT enforce fixed section names or a rigid
template**.

Instead, the AI must:

-   design sections dynamically
-   adapt the structure to the topic
-   choose headings that improve clarity
-   prioritize narrative flow and comprehension

Possible structural patterns:

-   Problem → Solution → Architecture → Implementation
-   Concept → Workflow → Example → Best Practices
-   Architecture → Components → Integration → Operations

The structure must always serve **reader comprehension**, not a
predefined format.

------------------------------------------------------------------------

# Visual First Principle

The **first section must be visually attractive** to encourage the
reader to continue.

Prefer starting with:

-   a diagram
-   a visual architecture
-   a workflow visualization
-   a compelling insight
-   a conceptual illustration

Goal:

**draw the reader into the documentation immediately**.

------------------------------------------------------------------------

# Visual Priority

Whenever possible prioritize **visual explanations**.

Include:

-   architecture diagrams
-   sequence diagrams
-   flow diagrams
-   component diagrams

Prefer **Mermaid diagrams**.

Example:

``` mermaid
sequenceDiagram
Client->>API: Request
API->>Service: Process
Service->>Database: Query
Database-->>Service: Result
Service-->>API: Response
API-->>Client: Data
```

------------------------------------------------------------------------

# Mandatory Visual Enhancements

## Admonitions

Use admonitions to highlight important concepts.

Example:

``` md
:::tip Key Insight
Well-documented architectures can reduce onboarding time by **up to 50%**.
:::
```

Supported types:

-   note
-   tip
-   info
-   warning
-   danger

------------------------------------------------------------------------

## Tabs

Use tabs to compare concept vs implementation.

Example:

``` mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="concept" label="Concept">

Explain the theory.

</TabItem>

<TabItem value="implementation" label="Implementation">

Explain how to implement it.

</TabItem>
</Tabs>
```

------------------------------------------------------------------------

# Technical Documentation Requirements

When the topic relates to **software development**, include practical
artifacts:

-   code examples
-   API request/response examples
-   configuration templates
-   infrastructure snippets
-   CLI commands
-   environment variables
-   deployment configuration

The reader must be able to **implement the solution directly from the
documentation**.

------------------------------------------------------------------------

# Code Example

``` java
@RestController
@RequestMapping("/auth")
public class AuthController {

  @PostMapping("/login")
  public TokenResponse login(@RequestBody LoginRequest request) {
    return authService.authenticate(request);
  }

}
```

------------------------------------------------------------------------

# API Example

Request:

``` http
POST /auth/login
Content-Type: application/json
```

``` json
{
  "username": "user",
  "password": "password"
}
```

Response:

``` json
{
  "token": "jwt-token"
}
```

------------------------------------------------------------------------

# Configuration Example

``` yaml
quarkus:
  http:
    port: 8080
```

Example Kubernetes snippet:

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
```

------------------------------------------------------------------------

# Event Driven Architecture Example

``` mermaid
graph LR
OrderService --> Kafka
Kafka --> PaymentService
Kafka --> NotificationService
```

------------------------------------------------------------------------

# Observability Guidance

When documenting services include:

-   logging strategy
-   metrics
-   tracing

Example metric:

    http_requests_total

------------------------------------------------------------------------

# Execution Logic

When the skill is invoked:

1.  Detect the invocation mode

    -   `section` → Improve existing documentation
    -   `topic` → Generate new documentation

2.  Design a **dynamic structure suited to the topic**.

3.  Begin with a **visually engaging section**.

4.  Add diagrams where useful.

5.  Include implementation artifacts when relevant.

6.  Produce **visually structured MDX documentation** using
    `docusaurus-pro-docs`.

------------------------------------------------------------------------

# Example Invocation --- Improve Existing Section

    Use skill: docusaurus-section-enhancer

    section: Authentication Flow
    content: The authentication service validates credentials and returns a token.

------------------------------------------------------------------------

# Example Invocation --- Generate New Documentation

    Use skill: docusaurus-section-enhancer

    topic: Microservices Architecture with Kafka Event Streaming

------------------------------------------------------------------------

# Golden Rule

Technical documentation must answer four questions:

1.  What is it
2.  Why it matters
3.  How it works
4.  How to implement it

If documentation explains a system but does not show **how to implement
or configure it**, the documentation is incomplete.
