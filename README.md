# One Day

_'Fix your day, not your life'_

A personal habit builder I built for myself. Provides a useful framework and daily structure to keep you on track. Inspired by principles from the book 'Compound Effect' by Darren Hardy. Offers persistent data handling across devices with Google Oauth sign in.

<img width="1157" height="610" alt="image" src="https://github.com/user-attachments/assets/940afd07-64e3-4f8b-898e-481ad716b968" />

---

### Features

- Weekly habit grid with daily check-offs
- Row color grouping, reordering, and per-habit goals
- Analytics — streaks, hit rates, history, charts
- Google sign-in with persistent cloud sync
- Dark mode

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

---