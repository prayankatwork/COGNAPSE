# COGNAPSE — Manual QA Test Plan (3-Day Sprint)

---

## 1. What Is This?

You are helping test **COGNAPSE**, an AI research app, **before it launches to the public**. This is called **manual QA testing** — real humans using the app to find bugs, glitches, and confusing parts that automated tests miss.

**Everything is free.** You pay nothing. I pay nothing. All services used are on free plans.

---

## 2. What's In It For You?

- **Resume / LinkedIn material** — You can add this under "Projects" or "Experience":
  > *Manual QA Tester — COGNAPSE (AI Research Platform)*  
  > *Tested AI research workflows including deep research, intelligence feed, and report analysis over a 3-day sprint. Provided bug reports and feedback that shaped the final product.*

- **Early access** — You use the app before anyone else
- **Keep your account** — Your data stays. You can keep using COGNAPSE after testing ends
- **Your feedback matters** — Bugs you report get fixed before real users see them
- **No cost** — No charges, no subscription, ever

---

## 3. Schedule

| Day | Rounds | Time |
|-----|--------|------|
| Day 1 | Round 1 + Round 2 | Morning & Evening |
| Day 2 | Round 1 + Round 2 | Morning & Evening |
| Day 3 | Round 1 + Round 2 | Morning & Evening |

Each round takes **5-10 minutes**.

---

## 4. Step-by-Step Workflow (Repeat Each Round)

### Round Steps

| # | What To Do | Wait For |
|---|-----------|----------|
| 1 | Go to **https://cognapse.vercel.app** | Page loads completely |
| 2 | **First time ever?** Click **Sign Up**, enter a username + password | Account created, logged in |
| | **Already registered?** Click **Sign In**, enter your username + password | Logged in |
| 3 | Type any question in the search bar → click **Research** | ~10-15 seconds → full report appears |
| 4 | Click **Deep Research** → type same or different question → wait | ~20-30 seconds → thesis + reasoning timeline loads |
| 5 | Click **Intelligence Hub** in the left menu | Headlines load for the first time |
| 6 | Click the **Refresh** button inside Intelligence Hub | New headlines appear |
| 7 | Click your profile → **Logout** | Signed out |

### Quick Checklist (Tear-Out)

Print this or keep it open:

```
[ ] Round started at: ________

[ ] Step 1 — App loaded without error?
[ ] Step 2 — Signed in/up fine?
[ ] Step 3 — Normal Research completed? (report looks complete)
[ ] Step 4 — Deep Research completed? (thesis & timeline visible)
[ ] Step 5 — Intelligence Hub loaded headlines?
[ ] Step 6 — Refresh showed new/different headlines?
[ ] Step 7 — Logged out fine?

[ ] Round ended at: ________
[ ] Any issues? Write here: ___________________________
```

---

## 5. What To Look For (And Report)

After each round, note down **YES** or **NO** for each:

| Check | Yes/No |
|------|--------|
| Did Normal Research finish without error? | |
| Does the report show sources, scores, SWOT, summary? | |
| Did Deep Research finish without error? | |
| Does Deep Research show a thesis and reasoning timeline? | |
| Did Intelligence Hub load headlines on first open? | |
| Did headlines change after clicking Refresh? | |
| Did your XP and Rank increase? (check Status panel) | |
| Did anything feel slow, broken, or confusing? | |

**If something goes wrong:**
1. Refresh the page → try the same step again
2. If it fails again → take a screenshot
3. Message me with: **what you were doing** + **screenshot**

---

## 6. Cost Breakdown

### What Happens Behind Each Step

| Step | What Runs In Background | Cost |
|------|------------------------|------|
| Sign In | Reads your saved data from database | ₹0 |
| Normal Research | Calls Groq AI (8B model) + saves report | ₹0 |
| Deep Research | Calls Groq AI (70B model) + saves report | ₹0 |
| Intelligence Hub Load | Calls Groq AI to generate 10 headlines | ₹0 |
| Intelligence Hub Refresh | Calls Groq AI again for fresh headlines | ₹0 |
| Logout | Nothing | ₹0 |

### Total For 6 People

| | Per Round | Per Day (2 rounds) | 3 Days Total |
|---|----------|-------------------|-------------|
| AI calls (Normal + Deep + Hub) | 4 calls | 8 calls | **144 calls** |
| Database writes | 4 writes | 8 writes | **144 writes** |
| Database reads | ~5 reads | ~5 reads | **~126 reads** |
| **Cost** | **₹0** | **₹0** | **₹0** |

### Total For 7 People

| | Per Round | Per Day (2 rounds) | 3 Days Total |
|---|----------|-------------------|-------------|
| AI calls (Normal + Deep + Hub) | 4 calls | 8 calls | **168 calls** |
| Database writes | 4 writes | 8 writes | **168 writes** |
| Database reads | ~5 reads | ~5 reads | **~147 reads** |
| **Cost** | **₹0** | **₹0** | **₹0** |

### Why Is It ₹0 For Everyone?

| Service | Plan | Free Limit | Our Usage | Result |
|---------|------|-----------|-----------|--------|
| Firebase (database) | Spark (Free) | 50,000 reads/day + 20,000 writes/day | ~50 reads/day + ~50 writes/day | ✅ Free |
| Groq (AI) | Free Plan | Unlimited tokens (rate limited) | ~50 calls/day max | ✅ Free |
| Vercel (hosting) | Hobby (Free) | 100 GB-hours + 100 GB bandwidth | ~0.01 GB-hours | ✅ Free |

No limits are touched. Not even close.

---

## 7. What If Something Breaks?

| Problem | What To Do |
|---------|-----------|
| App won't load | Check internet → refresh → try again |
| Research errors out | Note the error message → try a different question |
| Hub shows no headlines | Wait 5 seconds → click Refresh |
| Anything else | Screenshot + message me with details |

**Your data is safe.** The app saves everything to both the cloud AND your browser's local storage. Even if the cloud fails, nothing is lost.

---

## 8. Quick Summary

**3 days, 2 rounds per day, 5-10 min per round.**

1. Login → Normal Research → Deep Research → Intelligence Hub (wait + refresh) → Logout
2. Note any issues
3. Repeat for round 2
4. Do it again tomorrow

**Cost: ₹0 for everyone. Free AI, free database, free hosting.**

**Your reward: Early access, resume-worthy QA experience, and a better app because of your feedback.**
