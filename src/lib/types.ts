export interface Stol {
  id: string;
  namn: string;
  objektId: string;
  bileteUrl: string | null;
  bileteBguw: string | null;
  datering: string;
  fraaAar: number | null;
  tilAar: number | null;
  hundreaar: string | null;
  nasjonalitet: string | null;
  materialar: string[];
  stilperiode: string | null;
  teknikk: string[];
  hoegde: number | null;
  breidde: number | null;
  djupn: number | null;
  setehoegde: number | null;
  estimertVekt: number | null;
  materialkommentar: string;
  produsent: string;
  produksjonsstad: string;
  nasjonalmuseetUrl: string | null;
  tredfil: string;
  nemning: string;
  emneord: string[];
}

export interface FilterState {
  hundreaar: string | null;
  nasjonalitet: string | null;
  material: string | null;
  stilperiode: string | null;
}

export interface FilterCounts {
  hundreaar: Record<string, number>;
  nasjonalitet: Record<string, number>;
  materialar: Record<string, number>;
  stilperiode: Record<string, number>;
}

// Material groupings for UI
export const MATERIAL_GROUPS: Record<string, string[]> = {
  "Tre": ["Eik", "Bøk", "Furu", "Bjørk", "Mahogni", "Valnøtt", "Ask", "Alm", "Kirsebær", "Palisander", "Teak", "Lind", "Lønn", "Seder", "Bambus", "Poppel", "Lerk"],
  "Metall": ["Stål", "Stålrør", "Aluminium", "Jern", "Messing", "Krom", "Bronse", "Kopar", "Sink"],
  "Mjukare": ["Lær", "Tekstil", "Ull", "Bomull", "Lin", "Silke", "Fløyel", "Damask", "Hestetagl", "Sjøgras", "Siv", "Halm", "Rotting", "Filt"],
  "Polymer": ["Plast", "Polyuretan", "Glasfiber", "ABS", "Polypropylen", "Akryl", "Nylon", "Polyester"],
};
