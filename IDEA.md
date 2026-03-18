https://www.notion.so/tingogtang/405e0f646b774aab88b873281e58c4f0?v=3261c6815f7880e79cef000cab4e4b0d&source=copy_link

STOLKATALOG — idénotat v2

Iweins-inspirert visuell database over stolar. Datakjelde: Notion-databasen STOLAR (collection://9dce12ea-d95c-495f-87b6-1f825641f947). Bygger vidare på turnable-db.iverfinne.no, men med filtreringslaget frå katalog-barbaraiweins.com.





Tett rutenett med Bilete-URL / Bilete-bguw — Hovudvisinga er ein Iweins-grid: kvart felt er stolbiletet henta frå IIIF-URL (Bilete-URL) eller Notion-fila (Bilete-bguw). Togglbar storleik (48 / 96 / 192 px). Kvit bakgrunn, ingen rammer, berre luft mellom bileta.



Filtrer etter Hundreår — Klikk-rad: 1200-talet · 1600-talet · 1700-talet · 1800-talet · 1900-talet · 2000-talet. Tal i parentes (som Iweins). Feltet finst allereie som select i Notion, og du har views per hundreår og halvhundreår.



Filtrer etter Nasjonalitet — Noreg · Sverige · Danmark · Finland · Tyskland · Frankrike · Italia · Nederland · Storbritannia · Austerrike · Spania · Anna. Direkte mapping frå select-feltet. Legg til Nasjonalitet avleidd (formel) som fallback for rader utan eksplisitt tag.



Filtrer etter Materialar — Multi-select med 78+ verdiar. Grupper dei i hovudkategoriar for UI: Tre (Eik, Bøk, Furu, Bjørk …), Metall (Stål, Stålrør, Aluminium, Jern …), Mjukare (Lær, Tekstil, Ull, Bomull …), Polymer (Plast, Polyuretan, Glasfiber …). Vis dei vanlegaste som klikk-filter, resten bak "Vis alle".



Filtrer etter Stilperiode — Barokk · Rokokko · Empire · Klassisisme · Jugend · Funksjonalisme · Skandinavisk design · Postmodernisme osv. 27 verdiar. Sjeldan i Iweins-prosjekt, men perfekt for stolsamlinga.



Klikk → detaljkort (turnable-db-stilen) — Modal/sidepanel med: stort bilete, Namn, Datering/Frå år, Nemning 1 (formel), Materialkommentar, dimensjonar (Høgde/Breidde/Djupn/Setehøgde i cm), Estimert vekt, Teknikk, Produsent, Produksjonsstad. Lenkjer til Nasjonalmuseet-URL og turnable-db 3D-modell (3D-fil/3D-modell).



Stor teljar øvst — "N stolar dokumentert" med live tal frå API-spørjinga. Under: fordeling per hundreår som small-multiples eller sparkline. Dramatisk opning à la Iweins' "24 objects photographed", men med din skala.



Notion som CMS via API — Hent alle postar frå collection://9dce12ea… ved byggetid (Next.js SSG / ISR, eller Astro). Kvar post har Namn (title), Objekt-ID, Bilete-URL, og alle filter-felt. Notion sin uoffisielle API eller offisielle database-query. Ingen eigen database.



Visuell identitet: turnable-db DNA + Iweins — Behald den fete "Norske stolar."-headeren frå turnable-db. Legg til Iweins sin filterrad-estetikk (understreka lenkjer, tal i parentes, "Vis alle"). Kvit bakgrunn, éin serif (for tal og header), éin sans-serif (for metadata). Responsivt: 3-kolonne på mobil, 8-10 på desktop.



Framtidige lag — a) Teknikk-filter (45 verdiar, frå Dampbøying til Sprøytestøyping). b) FFF-fitness-score som sorteringsakse. c) Side-om-side-samanlikning. d) "Lik turnable-db": klikk 3D-ikon for å opne turnable-db med ?item=Objekt-ID. e) Eksport filtrert utval som PDF-katalog.





https://turnable-db.iverfinne.no/

https://turnable-db.iverfinne.no/?item=NMK.2005.0639