---
description: Suggest RIG prompt templates for a task, provide a filled and scored prompt
argument-hint: "<task description>"
---

# Coach Template

You are finding the best RIG prompt template for a user's task. The RIG template library has 1,000 templates across 10 categories.

Categories:
1. rig-doctrine-execution: IQRSQPI, BMS modes, gates, ProofPackets
2. fleet-infrastructure: Nodes, models, mesh, security
3. agent-orchestration: Susan, Jake, fleets, swarms
4. content-engineering: LinkedIn, brand, engagement
5. client-acquisition: Outreach, proposals, ROI
6. product-code: Features, APIs, releases
7. research-intelligence: Blueprints, signals, forecasts
8. healthcare-verticals: Hospital, PE, law, fintech
9. personal-brand: Speaking, hiring, advisory
10. diagnostic-coaching: Scoring, audits, optimization

Steps:
1. Identify the 3 most relevant categories for the task
2. From each category, select the best template
3. Fill in ALL [VARIABLE] placeholders with specific, concrete values
4. Ensure the filled prompt scores >= 90 on AI Coach criteria (specificity, context, spec, verification)
5. Add RIG doctrine elements where appropriate

Output:
- The task description
- 3 suggested templates (one per category) with all variables filled
- A final recommended prompt that merges the best elements
- Expected score for each