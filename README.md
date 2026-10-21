# Voltline Support

AI customer-support agent for **Voltline**, a fictional consumer-electronics online store, built on Salesforce **Agentforce** and **Data 360**.

> Work in progress: sprint 1 of 7. The full write-up (architecture, technical decisions, demo video) lands in sprint 7.

## What the agent does

- **Answers questions** grounded in Voltline's own knowledge base and product manuals (RAG over a Data 360 search index).
- **Reports order status** after verifying the customer's identity.
- **Handles returns and warranty claims** with deterministic business rules in Apex. The agent never offers a return the rules reject.
- **Escalates to a human** through Omni-Channel and hands over the full conversation and context.

## Stack

| Layer          | Tech                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| Agent          | Agentforce, Agent Script (authoring bundles versioned in this repo)      |
| Knowledge      | Data 360: Agentforce Data Library, search index, retriever               |
| Business logic | Apex invocable actions, Custom Metadata for thresholds                   |
| Service        | Omni-Channel, Service Console, Lightning Web Components                  |
| Channel        | Experience Cloud + Messaging for In-App and Web                          |
| Delivery       | Salesforce DX, GitHub Actions, `sf agent test`, Salesforce Code Analyzer |

## Getting started

Everything runs against a Salesforce **Developer Edition** org with Agentforce and Data 360 enabled ([sign up](https://developer.salesforce.com/signup)).

### Option A: local

Prerequisites: [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli), Node.js 22+, Java 21 (for the Apex language server) and VS Code with the extensions recommended in `.vscode/extensions.json`.

```bash
git clone https://github.com/Keromon2k19/voltline-support.git
cd voltline-support
npm install
sf org login web --alias voltline --set-default
```

### Option B: GitHub Codespaces

**Code → Codespaces → Create codespace on main.** The dev container installs Salesforce CLI, Node, Java and the VS Code extensions.

`sf org login web` needs the OAuth callback on `localhost:1717`, so open the codespace from **VS Code Desktop** (not the browser editor) to log in. Stop the codespace when you're done to save free-tier hours.

## Test data

Voltline needs products, customers and orders to be useful. One command loads them, and reloads them from scratch whenever you want:

```bash
npm run seed
```

It runs four steps, in order, against your default org:

1. **Reset:** deletes the seeded orders, accounts and contacts, found by their `@example.com` email.
2. **Products:** loads the 12 products and their Standard Price Book entries from `data/products.json`.
3. **Customers and orders:** creates 20 customers and 50 activated orders. They cover every shipping status, deliveries under and over 30 days ago, warranties still active and expired, and high and low totals.
4. **Products again:** puts each product's stock back to its catalog value. Once the stock trigger exists, step 3 would otherwise leave it lower.

Before you run it:

- Run `npm install` and log in with `sf org login web --alias voltline --set-default`. The default org is the one that gets seeded.
- Your user needs the `Voltline_Administrator` permission set group. The scripts run as anonymous Apex, which checks field access.

Only the seeded data is touched. Other records in the org are left alone.

To run a single step:

```bash
npm run seed:reset
npm run seed:products
npm run seed:orders
```

The data lives in `data/products.json`, `data/customers.json` and `data/orders.json`. The dates in the orders are counted back from today, so the 30-day and warranty cases stay true whenever you run the seed.

## Project structure

```
force-app/main/default/   Salesforce metadata (objects, Apex, LWC, agent bundles)
config/                   Scratch org definition
data/                     Seed data: products, customers and orders (JSON)
scripts/                  Seed scripts (Apex and Node) and the product image generator
docs/backlog.md           Product backlog and sprint plan (Spanish)
.devcontainer/            Codespaces / Dev Containers setup
```

## Workflow

- `main` is protected: every change goes through a pull request.
- Name branches after the Jira issue, e.g. `KAN-11-dx-project-setup`, so Jira links branches and PRs automatically.
- Never commit credentials, auth URLs, private keys or real customer data. All data in this repo is fictional.

## Roadmap

| Sprint | Goal                                                        |
| ------ | ----------------------------------------------------------- |
| 1      | Org, repo, test data and basic pipeline                     |
| 2      | Apex actions with tests                                     |
| 3      | Knowledge indexed in Data 360                               |
| 4      | Agent with its subagents (milestone: agent in preview)      |
| 5      | Global guardrails, escalation and web channel               |
| 6      | Service rep console and agent tests in CI                   |
| 7      | Code quality and portfolio deliverables (milestone: launch) |

Details and acceptance criteria: [docs/backlog.md](docs/backlog.md).

## Team

- Joaquín Haro Filippon ([@Keromon2k19](https://github.com/Keromon2k19))
- Mati
