# Bottleneck

Bottleneck reads your Satisfactory save file and tells you useful things about your factory.

## How it works

1. Point Bottleneck at a `.sav` file.
2. It parses the save and pulls out your factory state: buildings, recipes, belts and power.
3. It reports what's worth knowing: which production lines are bottlenecked, where you're short on resources or power, and what to fix next.

## Tech stack

Bottleneck is a client-only web app with no server. Save files are parsed in your browser and never uploaded.

- **Vite + React + TypeScript** for the app
- **[@etothepii/satisfactory-file-parser](https://www.npmjs.com/package/@etothepii/satisfactory-file-parser)** to read `.sav` files, run in a Web Worker so large saves don't freeze the UI
- **Bundled recipe data** taken from the game's `Docs.json`, which supplies the recipe rates that the save itself doesn't contain
- **Static hosting** (for example GitHub Pages or Cloudflare Pages)

## Features

- **Overview:** a "what to fix" list covering the worst item shortfalls, struggling production lines, overloaded or unused power circuits, and idle machines.
- **Production lines:** every recipe you run, with each machine's in-game productivity (the share of the last ~5 minutes it spent producing), output per minute, and which inputs the factory is short on. Click a line to list its machines with clock speeds and map coordinates.
- **Items:** per-minute production and consumption of every item, from recipe rates and clock speeds, alongside actual rates weighted by productivity. Click an item to see what makes and uses it.
- **Power:** capacity, peak demand, current draw and batteries for each power circuit, with the biggest consumers.
- **Storage:** stockpiled items across containers, freight wagons and the Dimensional Depot.
- **Buildings:** a count of every building type.

### Known gaps

- Miner and oil extractor output isn't calculated, because resource node purity isn't stored in the save. Raw resources show demand only.
- The item balance is factory-wide, so a shortfall in one place can be hidden by a surplus somewhere else.
- Fluids in tanks aren't counted in storage.

### Later

- **Belt and pipe throughput:** belts and pipes too slow for the machines they feed.
- **Progress:** unlocked tiers and what's needed for the next milestone.
- **Resource nodes:** a purity table so extraction rates can be calculated.

## Development

```sh
npm install
npm run dev        # app at http://localhost:5173
npm test           # unit tests
npm run analyze -- path/to/save.sav   # run the analysis from the command line
npm run gamedata   # regenerate src/data/gamedata.json from the game's Docs file
```

The app loads `public/saves/foo.sav` on startup (gitignored). Drop any `.sav` there, or drag a save onto the page.

Recipe, item and building data comes from `CommunityResources/Docs/en-US.json` in your Satisfactory install. `npm run gamedata` reads it from the default Steam location, or pass a path: `npm run gamedata -- /path/to/en-US.json`.
