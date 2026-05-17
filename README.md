# SweatEquity

**Live at [sweatequity-2861d.web.app](https://sweatequity-2861d.web.app)**

A fitness accountability app for couples. Pair up with a partner, set weekly workout goals, and put real money on the line -- every missed workout costs you. Features real-time synced dashboards, photo proof of workouts, year-long heatmaps, weekly battle summaries, and an AI referee powered by Gemini.

## How It Works

```
+------------------+          +------------------+
|   You            |          |   Partner        |
|   Goal: 4 days   |  <--->  |   Goal: 5 days   |
|   Wager: $20     |  sync   |   Wager: $20     |
+------------------+          +------------------+
        |                             |
        v                             v
   Log workouts                  Log workouts
   (type, duration, photo)       (type, duration, photo)
        |                             |
        +---------> Firebase <--------+
                   Firestore
                      |
                      v
              Weekly settlement
              (missed days x wager = debt)
```

1. **Sign in** with Google (Firebase Auth)
2. **Set your profile** -- name, weekly goal (e.g. 4 days), per-miss wager (e.g. $20)
3. **Pair with a partner** via a unique pairing code
4. **Log workouts** daily -- activity type, sub-type (Push/Pull/Legs), duration, and optional photo proof
5. **Track the weekly arena** -- see both partners' progress bars, who's at risk, and the pot size
6. **Weekly reset** -- at the start of each week, the app tallies missed days and calculates debt

## Features

- **Weekly Arena** -- head-to-head progress bars showing each partner's status against their goal, with live debt calculation
- **Real-time sync** -- Firestore subscriptions mean your partner's workouts appear instantly on your dashboard
- **Photo proof** -- attach workout photos that display in the activity feed with full-screen expand
- **Consistency heatmap** -- GitHub-style year-long heatmap for both partners
- **Volume charts** -- bar charts comparing daily workout minutes side-by-side
- **Activity breakdown** -- pie chart of workout types (Gym, Running, Cycling, etc.)
- **Weekly battle history** -- browse past weeks' results with per-person stats and debt
- **Streak tracking** -- current streak counter with at-risk warnings when you haven't logged today
- **AI Referee** -- Gemini-powered commentary on the weekly battle (who's winning, who's slacking)
- **Onboarding flow** -- guided 3-step setup: auth, profile, partner pairing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Auth | Firebase Auth (Google sign-in) |
| Database | Cloud Firestore (real-time subscriptions) |
| Storage | Firebase Storage (workout photos) |
| AI | Google Gemini (referee commentary) |
| Charts | Recharts (bar, pie) |
| Icons | Lucide React |
| Styling | Tailwind CSS |
| Hosting | Firebase Hosting |

## Project Structure

```
sweatequity/
  App.tsx                     Main app -- arena, stats, charts, feed
  types.ts                    User, WorkoutLog, WeeklySummary, WeekState
  index.tsx                   Entry point
  components/
    Heatmap.tsx               GitHub-style consistency heatmap
    LogModal.tsx              Log workout form (activity, duration, photo)
    Onboarding.tsx            3-step setup: auth -> profile -> partner
    SettingsModal.tsx          Account and partner settings
    SummaryModal.tsx          Weekly battle results popup
    HistoryModal.tsx          Browse past weekly summaries
  services/
    firebase.ts              Firebase app init, auth, Firestore exports
    backend.ts               All Firestore CRUD (users, logs, summaries)
    geminiService.ts          Gemini API for AI referee commentary
    mockData.ts              Seed data for development
```

## Getting Started

```bash
npm install
npm run dev
```

The app expects a Gemini API key set as `GEMINI_API_KEY` in `.env.local`. Firebase config is embedded in `services/firebase.ts` and points to the production project.

### Environment Variables

```
GEMINI_API_KEY=your-gemini-api-key
```

## License

MIT
