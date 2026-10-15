---
title: Conturo
summary: Contact sync for nonprofits across their CRM, email and analytics tools.
kind: [web, ai, data]
period:
  start: 2026-02
role: Founder, sole technical founder
stack: [TypeScript, Hono, Zod, PostgreSQL, Deno, Playwright, OpenAI API, MCP]
status: active
featured: true
order: 1
highlights:
  - Shipped a REST API (Hono, Zod, PostgreSQL) that lets nonprofits move 100k+ contacts, each with 10–20 identity fields, between conturo.io and their CRM, email and analytics tools.
  - Processes 1M+ contact datums a month with cron jobs, Playwright and the OpenAI API to keep a B2C database current.
  - Built an MCP server and chat interface so nonprofits can request exports in natural language.
  - Wrote a crash-safe export worker with atomic job claiming and lease-based retry, covered by 200+ Deno tests.
metrics:
  - label: Contacts per transfer
    value: 100k+
  - label: Fields per contact
    value: 10–20
  - label: Datums / month
    value: 1M+
  - label: Worker tests
    value: 200+
links:
  live: https://conturo.io
experience: conturo
---
