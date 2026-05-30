# One Day

_'Fix your day, not your life'_

A personal habit builder I built for myself. Provides a useful framework and daily structure to keep you on track. Inspired by principles from the book 'Compound Effect' by Darren Hardy. Offers persistent data handling across devices with Google OAuth sign in.

---

![Mobile view](https://github.com/user-attachments/assets/c7e5e4c9-ca95-4a0d-88e0-fe320f03fb7c)
<p align="center"><em>Mobile view</em></p>

![Desktop view](https://github.com/user-attachments/assets/9e3e8f32-dece-4a8c-9a7e-2f990932eac5)
<p align="center"><em>Desktop view</em></p>

---

### Features

- Weekly habit grid with daily check-offs — fully responsive on desktop and mobile
- 18 row colors, reordering, per-habit goals, and notes
- Analytics — streaks, hit rates, best weeks, per-habit bar charts
- Compound Map — 365-day heatmap visualizing daily consistency over time
- Profile page with lifetime stats (total checks, current streak, best streak)
- Google sign-in with persistent cloud sync via Supabase
- Dark mode (midnight theme)

---

### Use it

**Web:** [one-day-kappa.vercel.app](https://one-day-kappa.vercel.app)

**Desktop (Windows):** build the Electron app locally (see below)

---

### Run locally

```
npm install
npx expo export --platform web
npm run electron
```

### Build Windows app

```
npx expo export --platform web
npm run build:electron
```

### Deploy to Vercel

```
npx expo export --platform web --clear
vercel dist --prod
```
