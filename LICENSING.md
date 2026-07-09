# Licensing Model — SYJ Mail Intelligence AI

## The situation as it stands

The current repository is public on GitHub under **MIT**. That means every commit already published is permanently free to use, copy, modify, and redistribute by anyone who has it — that cannot be undone retroactively. Any dual-license plan has to be built around that fact, not against it.

The workable path is an **Open Core model**: the existing codebase stays MIT (it already has real value as a portfolio piece and lead-generation tool), and everything **new** going forward — advanced features, hosted infrastructure, and support — is licensed commercially. This is the same model used by GitLab, Sentry, and n8n.

---

## Tier structure

| | **Community (MIT)** | **Commercial License** |
|---|---|---|
| Price | Free | One-time or annual — see pricing below |
| Source access | Full — current public repo | Full — includes private/advanced modules |
| Self-hosting | Yes | Yes |
| Multi-user / RBAC | ❌ (v1.2.0 roadmap item, gated) | ✅ Included |
| Multi-tenant / org workspaces | ❌ (v2.0.0 roadmap item, gated) | ✅ Included |
| Priority notification channels (Slack, Teams, Discord) | ❌ | ✅ Included |
| White-label (remove SYJ/Sayanjali branding) | ❌ | ✅ Included |
| Support | Community / GitHub issues only | Direct support (email/Telegram), SLA optional |
| Setup/deployment assistance | ❌ | ✅ Optional add-on |
| Commercial resale / managed-service rights | ❌ — MIT permits reuse but not your endorsement or trademark | ✅ Explicit grant |

The free tier isn't crippled — it's the real product, minus multi-tenant/enterprise features and support. That's what makes people willing to pay for the commercial tier: they're buying time, support, and features, not access that was artificially withheld.

---

## What actually gets sold under the commercial license

1. **Advanced modules** — kept in a **separate private repository**, never pushed to the public MIT repo:
   - Multi-user auth + RBAC
   - Multi-tenant workspace isolation
   - Extended notification integrations
   - Any enterprise-only dashboard views
2. **A commercial use grant** covering trademark/branding use, white-labeling, and reselling as a managed service — none of which MIT grants by itself (MIT covers the code, not your name or logo).
3. **Support and SLA**, sold as a separate line item, scoped by response time.

---

## Suggested pricing

Priced as **open-core commercial licenses**, not as SaaS ARR multiples (you have no revenue yet to base ARR pricing on) — closer to how Cal.com, Chatwoot, and similar open-core tools price their commercial tier at launch.

| | India (SMB/agency buyer) | International |
|---|---|---|
| Self-hosted commercial license (annual) | ₹15,000 – ₹40,000/yr | $300 – $900/yr |
| Self-hosted commercial license (lifetime, per instance) | ₹60,000 – ₹1,50,000 | $1,200 – $3,500 |
| White-label / agency resale rights | ₹1,00,000 – ₹3,00,000/yr | $2,000 – $6,000/yr |
| Setup & deployment (one-time add-on) | ₹10,000 – ₹25,000 | $200 – $500 |

These are launch-tier numbers for a pre-revenue product with no case studies yet. Once you have even 3–5 paying self-hosted customers, you'll have real willingness-to-pay data to reprice from — raise, don't guess twice.

---

## Practical next steps

1. Split the repo now: move any unreleased advanced features (RBAC, multi-tenant work) into a **new private repo** before writing any more code there — once it's pushed to the public MIT repo, it's free forever.
2. Add a `LICENSING.md` (this file) and a short note in the main `README.md` pointing to it.
3. Use the `COMMERCIAL-LICENSE.md` template (companion file) as the actual agreement text for paying customers — have a lawyer review before your first signed deal, this is a starting template, not legal advice.
4. Keep the public MIT repo actively maintained — it's your best marketing channel for the commercial tier. A lot of open-core discovery is via the free version.
