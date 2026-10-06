/**
 * Biblical Section and Pericope Titles (French Louis Segond tradition)
 */

export const CHAPTER_SECTION_TITLES: Record<string, string> = {
  // Psaumes
  "19_1": "Les deux voies : le juste et le méchant",
  "19_23": "L'Éternel est mon berger",
  "19_24": "L'entrée du Roi de gloire",
  "19_27": "L'Éternel est ma lumière et mon salut",
  "19_46": "Dieu est pour nous un refuge et un appui",
  "19_51": "Prière de repentance et de purification",
  "19_84": "Bénédiction dans la maison de Dieu",
  "19_90": "Éternité de Dieu et fragilité de l'homme",
  "19_91": "Sous l'abri du Très-Haut",
  "19_103": "Bénédiction pour les bienfaits de Dieu",
  "19_119": "Méditation et louange de la loi divine",
  "19_121": "Le secours qui vient de l'Éternel",
  "19_139": "L'omniscience et l'omniprésence de Dieu",

  // Genèse
  "1_1": "La Création du ciel et de la terre",
  "1_2": "Le septième jour et le jardin d'Éden",
  "1_3": "La chute de l'homme et la première promesse",
  "1_12": "L'appel d'Abram et la promesse divine",
  "1_22": "Le sacrifice d'Isaac et la fidélité de Dieu",
  "1_28": "Le songe de Jacob à Béthel",

  // Exode
  "2_3": "La révélation du buisson ardent",
  "2_14": "Le passage de la mer Rouge",
  "2_20": "Les Dix Paroles de l'Alliance au Sinaï",

  // Évangiles & Actes
  "40_5": "Le Sermon sur la montagne et les Béatitudes",
  "40_6": "La prière du Seigneur et la confiance",
  "40_7": "La porte étroite et les deux fondations",
  "40_28": "La Résurrection et la Grande Commission",
  "41_1": "Le commencement de l'Évangile de Jésus-Christ",
  "42_1": "L'Annonciation et le cantique de Marie",
  "42_2": "La Nativité du Sauveur à Bethléem",
  "42_15": "Les paraboles de la grâce et du fils prodigue",
  "43_1": "La Parole éternelle faite chair",
  "43_3": "La nouvelle naissance et l'amour de Dieu",
  "43_10": "Le Bon Berger et Ses brebis",
  "43_14": "Jésus, le chemin, la vérité et la vie",
  "43_15": "Le vrai cep et les sarments",
  "43_17": "La prière sacerdotale de Jésus",
  "44_2": "L'effusion du Saint-Esprit à la Pentecôte",

  // Épîtres & Apocalypse
  "45_8": "La vie par l'Esprit et la gloire à venir",
  "45_12": "La consécration chrétienne et le corps en Christ",
  "46_13": "L'hymne à l'amour véritable",
  "49_2": "Le salut par la grâce au moyen de la foi",
  "49_6": "Toutes les armes spirituelles de Dieu",
  "50_2": "L'humilité et l'abaissement du Christ",
  "50_4": "La paix de Dieu et la louange",
  "58_11": "Les témoins et les héros de la foi",
  "66_21": "Un nouveau ciel et une nouvelle terre",
  "66_22": "Le fleuve de vie et la promesse du retour"
};

export function getChapterSectionTitle(bookId: number, chapter: number, bookName: string): string {
  const key = `${bookId}_${chapter}`;
  if (CHAPTER_SECTION_TITLES[key]) {
    return CHAPTER_SECTION_TITLES[key];
  }
  return `Lecture sacrée de ${bookName}`;
}
