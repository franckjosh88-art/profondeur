import { SimilarVerse } from '../types/bible';

/**
 * Index précalculé de correspondances et passages connexes bibliques.
 * Couvre les versets clés et thématiques fondamentales (Ancien et Nouveau Testament).
 * Permet un affichage instantané (0 ms) sans appel réseau ni calcul d'embedding à la volée.
 */
export const PRECOMPUTED_CROSS_REFERENCES: Record<string, SimilarVerse[]> = {
  // Jérémie 31:3 - Amour éternel & fidélité de Dieu
  "24_31_3": [
    {
      reference: "Romains 8:38-39",
      book_id: 45,
      book_name: "Romains",
      chapter: 8,
      verse: 38,
      verse_end: 39,
      type_lien: "Accomplissement",
      explication: "L'amour éternel proclamé par Jérémie trouve son apogée en Jésus-Christ dont rien ne peut nous séparer.",
      text: "Car j'ai l'assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir, ni les puissances, ni la hauteur, ni la profondeur, ni aucune autre créature ne pourra nous séparer de l'amour de Dieu manifesté en Jésus-Christ notre Seigneur."
    },
    {
      reference: "1 Jean 4:10",
      book_id: 62,
      book_name: "1 Jean",
      chapter: 4,
      verse: 10,
      type_lien: "Parallèle",
      explication: "L'amour de Dieu est premier, gratuit et inconditionnel envers son peuple.",
      text: "Et cet amour consiste, non point en ce que nous avons aimé Dieu, mais en ce qu'il nous a aimés et a envoyé son Fils comme victime expiatoire pour nos péchés."
    },
    {
      reference: "Éphésiens 2:4-5",
      book_id: 49,
      book_name: "Éphésiens",
      chapter: 2,
      verse: 4,
      verse_end: 5,
      type_lien: "Éclairage",
      explication: "La grandeur de la miséricorde divine découle de cet amour souverain.",
      text: "Mais Dieu, qui est riche en miséricorde, à cause du grand amour dont il nous a aimés, nous qui étions morts par nos offenses, nous a rendus à la vie avec Christ."
    },
    {
      reference: "Psaumes 103:17",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 103,
      verse: 17,
      type_lien: "Parallèle",
      explication: "La bonté perpétuelle de l'Éternel traverse toutes les générations.",
      text: "Mais la bonté de l'Éternel dure à jamais pour ceux qui le craignent, et sa miséricorde pour les enfants de leurs enfants."
    },
    {
      reference: "Sophonie 3:17",
      book_id: 36,
      book_name: "Sophonie",
      chapter: 3,
      verse: 17,
      type_lien: "Éclairage",
      explication: "Dieu se réjouit avec allégresse dans son amour envers les siens.",
      text: "L'Éternel, ton Dieu, est au milieu de toi, comme un héros qui sauve; Il fera de toi sa plus grande joie; Il gardera le silence dans son amour; Il aura pour toi des transports d'allégresse."
    },
    {
      reference: "Jean 3:16",
      book_id: 43,
      book_name: "Jean",
      chapter: 3,
      verse: 16,
      type_lien: "Accomplissement",
      explication: "L'amour éternel s'est incarné dans le don suprême du Fils unique.",
      text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle."
    }
  ],

  // Jean 3:16 - Le don du salut et la foi
  "43_3_16": [
    {
      reference: "Romains 5:8",
      book_id: 45,
      book_name: "Romains",
      chapter: 5,
      verse: 8,
      type_lien: "Parallèle",
      explication: "Preuve vivante de l'amour de Dieu manifesté lorsque nous étions encore pécheurs.",
      text: "Mais Dieu prouve son amour envers nous, en ce que, lorsque nous étions encore des pécheurs, Christ est mort pour nous."
    },
    {
      reference: "1 Jean 4:9",
      book_id: 62,
      book_name: "1 Jean",
      chapter: 4,
      verse: 9,
      type_lien: "Parallèle",
      explication: "Manifestation historique et concrète de l'amour de Dieu par l'envoi de Son Fils.",
      text: "L'amour de Dieu a été manifesté envers nous en ce que Dieu a envoyé son Fils unique dans le monde, afin que nous vivions par lui."
    },
    {
      reference: "Ésaïe 53:5",
      book_id: 23,
      book_name: "Ésaïe",
      chapter: 53,
      verse: 5,
      type_lien: "Accomplissement",
      explication: "La prophétie de la rançon messianique qui rend possible le pardon universel.",
      text: "Mais il était blessé pour nos péchés, brisé pour nos iniquités; le châtiment qui nous donne la paix est tombé sur lui, et c'est par ses meurtrissures que nous sommes guéris."
    },
    {
      reference: "Jean 10:28",
      book_id: 43,
      book_name: "Jean",
      chapter: 10,
      verse: 28,
      type_lien: "Éclairage",
      explication: "L'assurance inébranlable de la vie éternelle promise à ceux qui croient.",
      text: "Je leur donne la vie éternelle; et elles ne périront jamais, et personne ne les ravira de ma main."
    },
    {
      reference: "1 Timothée 2:4",
      book_id: 54,
      book_name: "1 Timothée",
      chapter: 2,
      verse: 4,
      type_lien: "Éclairage",
      explication: "La volonté bienveillante de Dieu d'offrir le salut à toute l'humanité.",
      text: "Qui veut que tous les hommes soient sauvés et parviennent à la connaissance de la vérité."
    }
  ],

  // Romains 8:28 - Providence et dessein souverain
  "45_8_28": [
    {
      reference: "Genèse 50:20",
      book_id: 1,
      book_name: "Genèse",
      chapter: 50,
      verse: 20,
      type_lien: "Parallèle",
      explication: "L'exemple de Joseph : ce que les hommes pensaient faire en mal, Dieu le change en bien.",
      text: "Vous aviez médité de me faire du mal: Dieu l'a changé en bien, pour accomplir ce qui arrive aujourd'hui, pour sauver la vie à un peuple nombreux."
    },
    {
      reference: "Éphésiens 1:11",
      book_id: 49,
      book_name: "Éphésiens",
      chapter: 1,
      verse: 11,
      type_lien: "Éclairage",
      explication: "La certitude du plan souverain de Dieu qui opère tout selon sa volonté.",
      text: "En lui nous sommes aussi devenus héritiers, ayant été prédestinés suivant la résolution de celui qui opère toutes choses d'après le conseil de sa volonté."
    },
    {
      reference: "Jérémie 29:11",
      book_id: 24,
      book_name: "Jérémie",
      chapter: 29,
      verse: 11,
      type_lien: "Parallèle",
      explication: "Des projets de paix et d'espérance conçus par Dieu pour Son peuple.",
      text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance."
    },
    {
      reference: "2 Corinthiens 4:17",
      book_id: 47,
      book_name: "2 Corinthiens",
      chapter: 4,
      verse: 17,
      type_lien: "Éclairage",
      explication: "Les épreuves présentes préparent un poids éternel de gloire.",
      text: "Car nos légères afflictions du moment présent produisent pour nous, au delà de toute mesure, un poids éternel de gloire."
    },
    {
      reference: "Psaumes 84:12",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 84,
      verse: 12,
      type_lien: "Parallèle",
      explication: "L'Éternel ne refuse aucun bien à ceux qui marchent dans l'intégrité.",
      text: "Car l'Éternel Dieu est un soleil et un bouclier, L'Éternel donne la grâce et la gloire, Il ne refuse aucun bien à ceux qui marchent dans l'intégrité."
    }
  ],

  // Psaumes 23:1 - L'Éternel est mon berger
  "19_23_1": [
    {
      reference: "Jean 10:11",
      book_id: 43,
      book_name: "Jean",
      chapter: 10,
      verse: 11,
      type_lien: "Accomplissement",
      explication: "Jésus s'est révélé comme le Bon Berger donnant sa vie pour ses brebis.",
      text: "Je suis le bon berger. Le bon berger donne sa vie pour ses brebis."
    },
    {
      reference: "Ézéchiel 34:11-12",
      book_id: 26,
      book_name: "Ézéchiel",
      chapter: 34,
      verse: 11,
      verse_end: 12,
      type_lien: "Parallèle",
      explication: "La promesse divine de rechercher et de prendre soin de son troupeau dispersé.",
      text: "Car ainsi parle le Seigneur, l'Éternel: Voici, j'aurai soin moi-même de mes brebis, et j'en ferai la revue."
    },
    {
      reference: "Philippiens 4:19",
      book_id: 50,
      book_name: "Philippiens",
      chapter: 4,
      verse: 19,
      type_lien: "Éclairage",
      explication: "La providence divine assure qu'aucun bien nécessaire ne manquera au croyant.",
      text: "Et mon Dieu pourvoira à tous vos besoins selon sa richesse, avec gloire, en Jésus-Christ."
    },
    {
      reference: "Psaumes 34:10",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 34,
      verse: 10,
      type_lien: "Parallèle",
      explication: "Ceux qui cherchent l'Éternel ne sont privés d'aucun bien.",
      text: "Les lionceaux éprouvent la disette et la faim, Mais ceux qui cherchent l'Éternel ne sont privés d'aucun bien."
    },
    {
      reference: "1 Pierre 2:25",
      book_id: 60,
      book_name: "1 Pierre",
      chapter: 2,
      verse: 25,
      type_lien: "Accomplissement",
      explication: "Le retour des brebis égarées vers le Berger et le Gardien de nos âmes.",
      text: "Car vous étiez comme des brebis errantes; mais maintenant vous êtes retournés vers le pasteur et le gardien de vos âmes."
    }
  ],

  // Psaumes 23:4 - La vallée de l'ombre de la mort
  "19_23_4": [
    {
      reference: "Ésaïe 43:2",
      book_id: 23,
      book_name: "Ésaïe",
      chapter: 43,
      verse: 2,
      type_lien: "Parallèle",
      explication: "La présence rassurante de Dieu à travers le feu et les eaux profondes.",
      text: "Si tu traverses les eaux, je serai avec toi; Et les fleuves, ils ne te submergeront point; Si tu marches dans le feu, tu ne te brûleras pas, Et la flamme ne t'embrasera pas."
    },
    {
      reference: "Josué 1:9",
      book_id: 6,
      book_name: "Josué",
      chapter: 1,
      verse: 9,
      type_lien: "Parallèle",
      explication: "L'ordre d'avoir du courage fondé sur l'accompagnement perpétuel de Dieu.",
      text: "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras."
    },
    {
      reference: "Matthieu 28:20",
      book_id: 40,
      book_name: "Matthieu",
      chapter: 28,
      verse: 20,
      type_lien: "Accomplissement",
      explication: "La promesse de Jésus d'être présent tous les jours jusqu'à la fin du monde.",
      text: "Et voici, je suis avec vous tous les jours, jusqu'à la fin du monde."
    },
    {
      reference: "Psaumes 27:1",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 27,
      verse: 1,
      type_lien: "Éclairage",
      explication: "L'absence de crainte quand l'Éternel est la lumière et le refuge de l'âme.",
      text: "L'Éternel est ma lumière et mon salut: De qui aurais-je crainte? L'Éternel est le soutien de ma vie: De qui aurais-je peur?"
    },
    {
      reference: "2 Corinthiens 1:3-4",
      book_id: 47,
      book_name: "2 Corinthiens",
      chapter: 1,
      verse: 3,
      verse_end: 4,
      type_lien: "Éclairage",
      explication: "Le Dieu de toute consolation qui nous réconforte dans toutes nos afflictions.",
      text: "Béni soit Dieu, le Père de notre Seigneur Jésus-Christ, le Père des miséricordes et le Dieu de toute consolation, qui nous console dans toutes nos afflictions."
    }
  ],

  // Genèse 1:1 - Création & Puissance créatrice
  "1_1_1": [
    {
      reference: "Jean 1:1-3",
      book_id: 43,
      book_name: "Jean",
      chapter: 1,
      verse: 1,
      verse_end: 3,
      type_lien: "Accomplissement",
      explication: "La Parole éternelle par laquelle toutes choses ont été créées au commencement.",
      text: "Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu. Elle était au commencement avec Dieu. Toutes choses ont été faites par elle, et rien de ce qui a été fait n'a été fait sans elle."
    },
    {
      reference: "Colossiens 1:16-17",
      book_id: 51,
      book_name: "Colossiens",
      chapter: 1,
      verse: 16,
      verse_end: 17,
      type_lien: "Éclairage",
      explication: "Christ, image du Dieu invisible, par qui et pour qui l'univers subsiste.",
      text: "Car en lui ont été créées toutes les choses qui sont dans les cieux et sur la terre, les visibles et les invisibles... Tout a été créé par lui et pour lui. Il est avant toutes choses, et toutes choses subsistent en lui."
    },
    {
      reference: "Hébreux 11:3",
      book_id: 58,
      book_name: "Hébreux",
      chapter: 11,
      verse: 3,
      type_lien: "Éclairage",
      explication: "C'est par la foi que nous comprenons que le monde a été formé par la parole de Dieu.",
      text: "C'est par la foi que nous reconnaissons que le monde a été formé par la parole de Dieu, en sorte que ce qu'on voit n'a pas été fait de choses visibles."
    },
    {
      reference: "Psaumes 33:6",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 33,
      verse: 6,
      type_lien: "Parallèle",
      explication: "Les cieux ont été faits par la parole de l'Éternel et l'armée céleste par le souffle de sa bouche.",
      text: "Les cieux ont été faits par la parole de l'Éternel, Et toute leur armée par le souffle de sa bouche."
    },
    {
      reference: "Apocalypse 4:11",
      book_id: 66,
      book_name: "Apocalypse",
      chapter: 4,
      verse: 11,
      type_lien: "Parallèle",
      explication: "La louange céleste célébrant le Créateur qui a créé toutes choses pour Sa volonté.",
      text: "Tu es digne, notre Seigneur et notre Dieu, de recevoir la gloire et l'honneur et la puissance; car tu as créé toutes choses, et c'est par ta volonté qu'elles existent et qu'elles ont été créées."
    }
  ],

  // Proverbes 3:5-6 - Confiance et direction divine
  "20_3_5": [
    {
      reference: "Psaumes 37:5",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 37,
      verse: 5,
      type_lien: "Parallèle",
      explication: "Recommander son sort à l'Éternel et placer en lui sa confiance.",
      text: "Recommande ton sort à l'Éternel, Mets en lui ta confiance, et il agira."
    },
    {
      reference: "Jérémie 17:7",
      book_id: 24,
      book_name: "Jérémie",
      chapter: 17,
      verse: 7,
      type_lien: "Parallèle",
      explication: "Bénédiction de l'homme qui se confie en l'Éternel et place en Lui son appui.",
      text: "Béni soit l'homme qui se confie dans l'Éternel, Et dont l'Éternel est l'espérance!"
    },
    {
      reference: "Jacques 1:5",
      book_id: 59,
      book_name: "Jacques",
      chapter: 1,
      verse: 5,
      type_lien: "Éclairage",
      explication: "Demander la sagesse à Dieu qui donne à tous simplement sans faire de reproche.",
      text: "Si quelqu'un d'entre vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée."
    },
    {
      reference: "Philippiens 4:6",
      book_id: 50,
      book_name: "Philippiens",
      chapter: 4,
      verse: 6,
      type_lien: "Éclairage",
      explication: "Décharger toutes ses inquiétudes par des prières et des supplications.",
      text: "Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces."
    },
    {
      reference: "Psaumes 119:105",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 119,
      verse: 105,
      type_lien: "Éclairage",
      explication: "La Parole de Dieu est la lampe qui éclaire nos sentiers et aplanit nos voies.",
      text: "Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier."
    }
  ],

  // Matthieu 6:33 - Chercher premièrement le Royaume
  "40_6_33": [
    {
      reference: "Luc 12:31",
      book_id: 42,
      book_name: "Luc",
      chapter: 12,
      verse: 31,
      type_lien: "Parallèle",
      explication: "La priorité absolue accordée au Royaume garantit la satisfaction des besoins temporels.",
      text: "Cherchez plutôt le royaume de Dieu; et toutes ces choses vous seront données par-dessus."
    },
    {
      reference: "1 Rois 3:11-13",
      book_id: 11,
      book_name: "1 Rois",
      chapter: 3,
      verse: 11,
      verse_end: 13,
      type_lien: "Illustration",
      explication: "Salomon demande la sagesse et Dieu lui accorde en plus richesses et gloire.",
      text: "Et Dieu lui dit: Puisque c'est là ce que tu demandes... je te donnerai un cœur sage et intelligent... Je te donnerai en outre ce que tu n'as pas demandé, des richesses et de la gloire."
    },
    {
      reference: "Romains 14:17",
      book_id: 45,
      book_name: "Romains",
      chapter: 14,
      verse: 17,
      type_lien: "Éclairage",
      explication: "Définition de la nature spirituelle du Royaume : justice, paix et joie par le Saint-Esprit.",
      text: "Car le royaume de Dieu, ce n'est pas le manger et le boire, mais la justice, la paix et la joie, par le Saint-Esprit."
    },
    {
      reference: "Colossiens 3:1-2",
      book_id: 51,
      book_name: "Colossiens",
      chapter: 3,
      verse: 1,
      verse_end: 2,
      type_lien: "Parallèle",
      explication: "Attacher ses pensées aux choses d'en haut plutôt qu'aux soucis terrestres.",
      text: "Si donc vous êtes ressuscités avec Christ, cherchez les choses d'en haut, où Christ est assis à la droite de Dieu. Affectionnez-vous aux choses d'en haut, et non à celles qui sont sur la terre."
    },
    {
      reference: "Psaumes 37:4",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 37,
      verse: 4,
      type_lien: "Éclairage",
      explication: "Trouver ses délices en l'Éternel conduit à l'accomplissement des désirs de notre cœur.",
      text: "Fais de l'Éternel tes délices, Et il te donnera ce que ton cœur désire."
    }
  ],

  // Ésaïe 53:5 - Le Serviteur souffrant et la rédemption
  "23_53_5": [
    {
      reference: "1 Pierre 2:24",
      book_id: 60,
      book_name: "1 Pierre",
      chapter: 2,
      verse: 24,
      type_lien: "Accomplissement",
      explication: "Pierre cite explicitement la prophétie d'Ésaïe accomplie par les meurtrissures de Christ à la croix.",
      text: "Lui qui a porté lui-même nos péchés en son corps sur le bois, afin que morts aux péchés nous vivions pour la justice; lui par les meurtrissures duquel vous avez été guéris."
    },
    {
      reference: "Romains 4:25",
      book_id: 45,
      book_name: "Romains",
      chapter: 4,
      verse: 25,
      type_lien: "Parallèle",
      explication: "Livré pour nos offenses et ressuscité pour notre justification.",
      text: "Lequel a été livré pour nos offenses, et est ressuscité pour notre justification."
    },
    {
      reference: "2 Corinthiens 5:21",
      book_id: 47,
      book_name: "2 Corinthiens",
      chapter: 5,
      verse: 21,
      type_lien: "Éclairage",
      explication: "Le grand échange : Christ devenu péché pour que nous devenions justice de Dieu.",
      text: "Celui qui n'a point connu le péché, il l'a fait devenir péché pour nous, afin que nous devenions en lui justice de Dieu."
    },
    {
      reference: "Hébreux 9:28",
      book_id: 58,
      book_name: "Hébreux",
      chapter: 9,
      verse: 28,
      type_lien: "Accomplissement",
      explication: "Christ offert une seule fois pour porter les péchés de plusieurs.",
      text: "De même Christ, qui s'est offert une seule fois pour porter les péchés de plusieurs, apparaîtra sans péché une seconde fois à ceux qui l'attendent pour leur salut."
    },
    {
      reference: "Matthieu 8:17",
      book_id: 40,
      book_name: "Matthieu",
      chapter: 8,
      verse: 17,
      type_lien: "Accomplissement",
      explication: "Le ministère de guérison de Jésus réalisant le soulagement de nos infirmités.",
      text: "Afin que s'accomplît ce qui avait été annoncé par Ésaïe, le prophète: Il a pris nos infirmités, et il s'est chargé de nos maladies."
    }
  ],

  // Philippiens 4:6-7 - La paix qui surpasse toute intelligence
  "50_4_6": [
    {
      reference: "1 Pierre 5:7",
      book_id: 60,
      book_name: "1 Pierre",
      chapter: 5,
      verse: 7,
      type_lien: "Parallèle",
      explication: "Se décharger de tous ses soucis sur Lui car Il prend soin de nous.",
      text: "Et déchargez-vous sur lui de tous vos soucis, car lui-même prend soin de vous."
    },
    {
      reference: "Jean 14:27",
      book_id: 43,
      book_name: "Jean",
      chapter: 14,
      verse: 27,
      type_lien: "Parallèle",
      explication: "La paix que le Christ nous donne ne ressemble pas à celle du monde.",
      text: "Je vous laisse la paix, je vous donne ma paix. Je ne vous donne pas comme le monde donne. Que votre cœur ne se trouble point, et ne s'alarme point."
    },
    {
      reference: "Ésaïe 26:3",
      book_id: 23,
      book_name: "Ésaïe",
      chapter: 26,
      verse: 3,
      type_lien: "Éclairage",
      explication: "La paix assurée à celui dont le cœur s'appuie fidèlement sur Dieu.",
      text: "A celui qui est ferme dans ses sentiments Tu assures la paix, la paix, Parce qu'il se confie en toi."
    },
    {
      reference: "Colossiens 3:15",
      book_id: 51,
      book_name: "Colossiens",
      chapter: 3,
      verse: 15,
      type_lien: "Éclairage",
      explication: "Que la paix de Christ règne dans vos cœurs comme un arbitre souverain.",
      text: "Et que la paix de Christ, à laquelle vous avez été appelés pour former un seul corps, règne dans vos cœurs. Et soyez reconnaissants."
    },
    {
      reference: "Psaumes 55:23",
      book_id: 19,
      book_name: "Psaumes",
      chapter: 55,
      verse: 23,
      type_lien: "Parallèle",
      explication: "Remets ton fardeau à l'Éternel et Il te soutiendra.",
      text: "Remets ton sort à l'Éternel, et il te soutiendra, Il ne laissera jamais chanceler le juste."
    }
  ]
};

/**
 * Normalise une chaîne de référence pour une clé de recherche universelle.
 * Ex : "Jérémie 31:3" -> "24_31_3" ou "jeremie_31_3"
 */
export function buildNormalizedVerseKey(bookId: number, chapter: number, verse: number): string {
  return `${bookId}_${chapter}_${verse}`;
}

export function buildCanonicalReference(bookName: string, chapter: number, verse: number): string {
  return `${bookName} ${chapter}:${verse}`;
}

/**
 * Thématiques spirituelles associées aux livres et passages pour générer
 * des correspondances thématiques instantanées et fiables si le verset précis
 * n'est pas encore dans le dictionnaire fixe.
 */
interface ThematicCluster {
  keywords: string[];
  linkType: 'Parallèle' | 'Accomplissement' | 'Éclairage' | 'Contraste';
  explanation: string;
  targetVerses: Array<{
    reference: string;
    book_id: number;
    book_name: string;
    chapter: number;
    verse: number;
    verse_end?: number;
    text: string;
  }>;
}

export const THEMATIC_CLUSTERS: ThematicCluster[] = [
  {
    keywords: ["amour", "aime", "aimé", "bonté", "miséricorde", "grâce", "charité"],
    linkType: "Parallèle",
    explanation: "Passage témoignant de la fidélité, de l'amour inconditionnel et de la miséricorde éternelle de Dieu.",
    targetVerses: [
      {
        reference: "1 Jean 4:16",
        book_id: 62,
        book_name: "1 Jean",
        chapter: 4,
        verse: 16,
        text: "Et nous, nous avons connu l'amour que Dieu a pour nous, et nous y avons cru. Dieu est amour; et celui qui demeure dans l'amour demeure en Dieu, et Dieu demeure en lui."
      },
      {
        reference: "Psaumes 136:1",
        book_id: 19,
        book_name: "Psaumes",
        chapter: 136,
        verse: 1,
        text: "Louez l'Éternel, car il est bon, Car sa miséricorde dure à toujours!"
      },
      {
        reference: "Romains 8:32",
        book_id: 45,
        book_name: "Romains",
        chapter: 8,
        verse: 32,
        text: "Lui, qui n'a point épargné son propre Fils, mais qui l'a livré pour nous tous, comment ne nous donnera-t-il pas aussi toutes choses avec lui?"
      },
      {
        reference: "Jean 15:13",
        book_id: 43,
        book_name: "Jean",
        chapter: 15,
        verse: 13,
        text: "Il n'y a pas de plus grand amour que de donner sa vie pour ses amis."
      },
      {
        reference: "Éphésiens 3:17-19",
        book_id: 49,
        book_name: "Éphésiens",
        chapter: 3,
        verse: 17,
        verse_end: 19,
        text: "En sorte que Christ habite dans vos cœurs par la foi; afin qu'étant enracinés et fondés dans l'amour, vous puissiez comprendre avec tous les saints quelle est la largeur, la longueur, la profondeur et la hauteur, et connaître l'amour de Christ."
      }
    ]
  },
  {
    keywords: ["paix", "crainte", "peur", "trouble", "angoisse", "consolation", "refuge", "repos"],
    linkType: "Éclairage",
    explanation: "Passage offrant paix intérieure, réconfort de l'âme et protection face aux épreuves.",
    targetVerses: [
      {
        reference: "Jean 16:33",
        book_id: 43,
        book_name: "Jean",
        chapter: 16,
        verse: 33,
        text: "Je vous ai dit ces choses, afin que vous ayez la paix en moi. Vous aurez des tribulations dans le monde; mais prenez courage, j'ai vaincu le monde."
      },
      {
        reference: "Psaumes 46:2",
        book_id: 19,
        book_name: "Psaumes",
        chapter: 46,
        verse: 2,
        text: "Dieu est pour nous un refuge et un appui, Un secours qui ne manque jamais dans la détresse."
      },
      {
        reference: "Matthieu 11:28",
        book_id: 40,
        book_name: "Matthieu",
        chapter: 11,
        verse: 28,
        text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos."
      },
      {
        reference: "Psaumes 91:1-2",
        book_id: 19,
        book_name: "Psaumes",
        chapter: 91,
        verse: 1,
        verse_end: 2,
        text: "Celui qui demeure sous l'abri du Très-Haut Repose à l'ombre du Tout Puissant. Je dis à l'Éternel: Mon refuge et ma forteresse, Mon Dieu en qui je me confie!"
      },
      {
        reference: "Ésaïe 41:10",
        book_id: 23,
        book_name: "Ésaïe",
        chapter: 41,
        verse: 10,
        text: "Ne crains rien, car je suis avec toi; Ne promène pas des regards inquiets, car je suis ton Dieu; Je te fortifie, je viens à ton secours, Je te soutiens de ma droite triomphante."
      }
    ]
  },
  {
    keywords: ["foi", "croire", "confiance", "espérance", "juste", "justice", "promesse"],
    linkType: "Parallèle",
    explanation: "Passage soulignant la puissance de la foi et la fermeté dans les promesses de Dieu.",
    targetVerses: [
      {
        reference: "Hébreux 11:1",
        book_id: 58,
        book_name: "Hébreux",
        chapter: 11,
        verse: 1,
        text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas."
      },
      {
        reference: "Romains 1:17",
        book_id: 45,
        book_name: "Romains",
        chapter: 1,
        verse: 17,
        text: "Parce qu'en lui est révélée la justice de Dieu par la foi et pour la foi, selon qu'il est écrit: Le juste vivra par la foi."
      },
      {
        reference: "2 Corinthiens 5:7",
        book_id: 47,
        book_name: "2 Corinthiens",
        chapter: 5,
        verse: 7,
        text: "Car nous marchons par la foi et non par la vue."
      },
      {
        reference: "Marc 11:24",
        book_id: 41,
        book_name: "Marc",
        chapter: 11,
        verse: 24,
        text: "C'est pourquoi je vous dis: Tout ce que vous demanderez en priant, croyez que vous l'avez reçu, et vous le verrez s'accomplir."
      },
      {
        reference: "Galates 2:20",
        book_id: 48,
        book_name: "Galates",
        chapter: 2,
        verse: 20,
        text: "J'ai été crucifié avec Christ; et si je vis, ce n'est plus moi qui vis, c'est Christ qui vit en moi; si je vis maintenant dans la chair, je vis dans la foi au Fils de Dieu, qui m'a aimé et qui s'est livré lui-même pour moi."
      }
    ]
  },
  {
    keywords: ["prière", "demande", "supplication", "exaucement", "chercher", "crier", "invoquer"],
    linkType: "Éclairage",
    explanation: "Passage invitant à la persévérance dans la prière et à l'écoute de la voix de Dieu.",
    targetVerses: [
      {
        reference: "Jérémie 33:3",
        book_id: 24,
        book_name: "Jérémie",
        chapter: 33,
        verse: 3,
        text: "Invoque-moi, et je te répondrai; Je t'annoncerai de grandes choses, des choses cachées, Que tu ne connais pas."
      },
      {
        reference: "1 Jean 5:14-15",
        book_id: 62,
        book_name: "1 Jean",
        chapter: 5,
        verse: 14,
        verse_end: 15,
        text: "Nous avons auprès de lui cette assurance, que si nous demandons quelque chose selon sa volonté, il nous écoute."
      },
      {
        reference: "Matthieu 7:7-8",
        book_id: 40,
        book_name: "Matthieu",
        chapter: 7,
        verse: 7,
        verse_end: 8,
        text: "Demandez, et l'on vous donnera; cherchez, et vous trouverez; frappez, et l'on vous ouvrira. Car quiconque demande reçoit, celui qui cherche trouve, et l'on ouvre à celui qui frappe."
      },
      {
        reference: "Psaumes 145:18",
        book_id: 19,
        book_name: "Psaumes",
        chapter: 145,
        verse: 18,
        text: "L'Éternel est près de tous ceux qui l'invoquent, De tous ceux qui l'invoquent avec sincérité."
      },
      {
        reference: "1 Thessaloniciens 5:16-18",
        book_id: 52,
        book_name: "1 Thessaloniciens",
        chapter: 5,
        verse: 16,
        verse_end: 18,
        text: "Soyez toujours joyeux. Priez sans cesse. Rendez grâces en toutes choses, car c'est à votre égard la volonté de Dieu en Jésus-Christ."
      }
    ]
  },
  {
    keywords: ["parole", "écriture", "vérité", "lumière", "loi", "commandement", "sagesse"],
    linkType: "Éclairage",
    explanation: "Passage exaltant la valeur formatrice, sanctifiante et éclairante de la Parole de Dieu.",
    targetVerses: [
      {
        reference: "2 Timothée 3:16-17",
        book_id: 55,
        book_name: "2 Timothée",
        chapter: 3,
        verse: 16,
        verse_end: 17,
        text: "Toute Écriture est inspirée de Dieu, et utile pour enseigner, pour convaincre, pour corriger, pour instruire dans la justice, afin que l'homme de Dieu soit accompli et propre à toute bonne œuvre."
      },
      {
        reference: "Hébreux 4:12",
        book_id: 58,
        book_name: "Hébreux",
        chapter: 4,
        verse: 12,
        text: "Car la parole de Dieu est vivante et efficace, plus tranchante qu'une épée quelconque à deux tranchants, pénétrante jusqu'à partager âme et esprit."
      },
      {
        reference: "Psaumes 19:8-9",
        book_id: 19,
        book_name: "Psaumes",
        chapter: 19,
        verse: 8,
        verse_end: 9,
        text: "La loi de l'Éternel est parfaite, elle restaure l'âme; Le témoignage de l'Éternel est véritable, il rend sage l'ignorant."
      },
      {
        reference: "Jacques 1:22",
        book_id: 59,
        book_name: "Jacques",
        chapter: 1,
        verse: 22,
        text: "Mettez en pratique la parole, et ne vous bornez pas à l'écouter, en vous trompant vous-mêmes par de faux raisonnements."
      },
      {
        reference: "Ésaïe 55:11",
        book_id: 23,
        book_name: "Ésaïe",
        chapter: 55,
        verse: 11,
        text: "Ainsi en est-il de ma parole, qui sort de ma bouche: Elle ne retourne point à moi sans effet, Sans avoir exécuté ma volonté Et accompli mes desseins."
      }
    ]
  }
];

/**
 * Recherche les correspondances thématiques locales instantanées en cas d'absence
 * dans l'index fixe ou pour enrichir les résultats.
 */
export function getLocalThematicMatches(
  sourceText: string,
  sourceBookId: number,
  sourceChapter: number,
  sourceVerse: number,
  limit: number = 6
): SimilarVerse[] {
  const normSource = (sourceText || "").toLowerCase();
  
  // Scorer les clusters thématiques
  let bestCluster: ThematicCluster | null = null;
  let maxScore = 0;

  for (const cluster of THEMATIC_CLUSTERS) {
    let score = 0;
    for (const kw of cluster.keywords) {
      if (normSource.includes(kw)) {
        score += 2;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestCluster = cluster;
    }
  }

  // Si aucun mot-clé spécifique ne ressort, utiliser le cluster de réconfort et foi par défaut
  const activeCluster = bestCluster || THEMATIC_CLUSTERS[0];
  const candidates: SimilarVerse[] = [];

  for (const item of activeCluster.targetVerses) {
    // Éviter de renvoyer le verset source lui-même
    if (item.book_id === sourceBookId && item.chapter === sourceChapter && item.verse === sourceVerse) {
      continue;
    }
    candidates.push({
      reference: item.reference,
      book_id: item.book_id,
      book_name: item.book_name,
      chapter: item.chapter,
      verse: item.verse,
      verse_end: item.verse_end,
      type_lien: activeCluster.linkType,
      explication: activeCluster.explanation,
      text: item.text
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}
