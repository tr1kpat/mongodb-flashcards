# MongoDB Interview Prep — Lernkarten-Web-App

Lokale Lernkarten-App für die Vorbereitung auf ein technisches Interview zum MongoDB-Produktportfolio (Senior CSM). Inhalte stammen aus einer Notion-„Loaded Space"-Seite und sind in `content/*.json` destilliert. Spaced-Repetition-Scheduling, Fortschritt pro Topic, 3D-Flip-Karten, dunkles Graphit-Aesthetic.

**Live:** `https://tr1kpat.github.io/mongodb-flashcards/`

## Topics

| # | Topic | Status | Karten | Quelle |
|---|---|---|---:|---|
| 1 | MongoDB Produktportfolio (Layer 1–5) | active | 64 | Notion Kapitel 1 + Original-Drill |
| 2 | Full-Stack Application Design + Banküberweisung | active | 19 | Notion Kapitel 2 + 3 |
| 3 | Architecture, Networking, Cloud / On-Premise | active | 31 | Notion Kapitel 4 |
| 4 | Performance, Availability, Durability, Scalability & CAP | active | 33 | Notion Kapitel 5 |

Stand: 4 Topics · 147 Karten.

## Features

- Spaced Repetition (Leitner: 1 → ×2.5 → max 60 Tage, partial → ×1.2, wrong → 1)
- Dashboard mit Confidence-Bar je Topic, Streak, 21-Tage-Heatmap, Fälligkeitsplan
- Study-View mit 3D-Flip-Karte, Sparkline der Review-Historie und Tastatursteuerung (`Space` umdrehen, `1/2/3` bewerten, `Enter` weiter, `Esc` beenden)
- Bei `wrong` / `partial` werden Vertiefungsfragen automatisch eingeblendet
- "Frag zur Karte"-Stub (loggt Frage, rendert Platzhalter — Live-KI-Integration nicht im Scope)
- CRUD + JSON-Import / -Export unter `/manage`
- IndexedDB-Persistenz via `idb` — überlebt Browser-Restarts
- Delta-Seeding: neue Topic-JSONs landen beim nächsten Start in IndexedDB, ohne bestehende Reviews zu zerstören

## Tech-Stack

Vite + React 18 + TypeScript · Tailwind-frei (Custom CSS mit `oklch`-Palette) · React Router v6 (`HashRouter` für GitHub Pages) · Zustand · `idb` · Vitest + React Testing Library.

## Setup

Node ≥ 20.

```bash
npm install
npm run dev        # http://localhost:5173
```

Weitere Scripts:

```bash
npm run build      # Typecheck + Production Build (dist/)
npm test           # Vitest einmalig
npm run preview    # gebaute App lokal servieren
```

## Content-Pflege

Beim ersten Start prüft die App, ob eine Topic-ID bereits Karten in IndexedDB hat. Falls nicht und im `content/`-Ordner Karten für dieses Topic vorhanden sind, werden sie geseedet — bestehende User-Reviews bleiben unangetastet.

Format einer Seed-Datei:

```json
{
  "topic": {
    "id": "...",
    "name": "...",
    "description": "...",
    "status": "active",
    "ref": "L1–L5"
  },
  "cards": [
    {
      "id": "...",
      "topicId": "...",
      "question": "...",
      "answer": "...",
      "followUpQuestions": ["..."],
      "tags": ["..."],
      "source": "notion",
      "difficulty": "medium"
    }
  ]
}
```

Neue Karten lassen sich auch direkt im Manage-View über „Neue Karte" oder „Importieren" anlegen.

## Reset der lokalen Daten

DevTools → Application → IndexedDB → `mongodb-flashcards` löschen → Seite neu laden. Beim nächsten Start wird komplett neu geseedet.

## Deploy auf GitHub Pages

Per Push auf `main` deployt automatisch ein GitHub Actions Workflow (`.github/workflows/deploy.yml`). Konfiguration:

- Vite-Base-Path: `/mongodb-flashcards/` (anpassbar via `VITE_BASE_PATH` Env-Var oder Repo-Rename)
- HashRouter umgeht das fehlende SPA-Fallback bei GitHub Pages
- Die Workflow-Konfiguration nutzt `actions/deploy-pages@v4`

Manueller Deploy aus lokalem Build:

```bash
npm run build
gh workflow run deploy.yml   # oder einfach git push
```

## Tests

```bash
npm test
```

Abgedeckt: SRS-Logik (Leitner-Intervalle, Fälligkeit), Schema-Validierung, Seed-Daten (Mindest-Card-Counts pro Topic, globale ID-Uniqueness, Total ≥ 130), eine Komponenten-Stichprobe.

## Limitierungen

- Keine Cloud-Sync, keine Auth, keine Multi-User-Unterstützung
- "Frag zur Karte" ist ein Platzhalter ohne KI-Backend
- Topic-Inhalte basieren auf der Notion-Quelle — bei inhaltlichen Updates JSON-Files manuell anpassen oder neue Karten via Manage-View erfassen
