# stolar.iverfinne.no

Iweins-inspirert visuell database over stolar. Datakjelde: Notion-databasen STOLAR.

## Utvikling

```bash
npm install
npm run dev
```

## Oppdater data frå Notion

Stoldata ligg i `src/data/stolar.json`. For å hente fersk data frå Notion, bruk Notion API.

## Deploy

```bash
npm run build
```

## Arkitektur

- **Next.js 16** med App Router og statisk generering (SSG)
- **Tailwind CSS** for styling
- **Notion** som CMS — data henta ved byggetid
- **IIIF** biletlevering frå DiMu/V&A/Met/NMK
- Filtreringslag inspirert av [katalog-barbaraiweins.com](https://katalog-barbaraiweins.com)
- Detaljvising inspirert av [turnable-db.iverfinne.no](https://turnable-db.iverfinne.no)
