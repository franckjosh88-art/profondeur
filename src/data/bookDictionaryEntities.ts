// Curated prominent biblical figures, places and key theological notions mapped by biblical book
// to allow fast, rich and contextual exploration in the Bible Dictionary.

export interface BookEntities {
  bookId: number;
  bookName: string;
  testament: 'AT' | 'NT';
  category: string;
  persons: string[];
  places: string[];
  notions: string[];
}

export const BOOK_DICTIONARY_ENTITIES: Record<number, { persons: string[]; places: string[]; notions: string[] }> = {
  1: { // Genèse
    persons: ["Adam", "Ève", "Noé", "Abraham", "Sara", "Isaac", "Jacob", "Joseph", "Melchisédek", "Loth"],
    places: ["Éden", "Ararat", "Ur en Chaldée", "Béthel", "Hébron", "Sodome", "Moriah", "Galaad", "Égypte"],
    notions: ["Création", "Chute de l'Homme", "Déluge", "Alliance Abramique", "Circoncision", "Bénédiction Patriarcale"]
  },
  2: { // Exode
    persons: ["Moïse", "Aaron", "Myriam", "Pharaon", "Jethro", "Bétsaleel", "Josué"],
    places: ["Mont Sinaï (Horeb)", "Mer Rouge", "Goshen", "Mara", "Élim", "Rephidim", "Madian"],
    notions: ["Dix Plaies d'Égypte", "La Pâque (Pessah)", "Passage de la Mer Rouge", "Le Décalogue (Dix Commandements)", "Le Tabernacle", "L'Arche de l'Alliance", "Colonne de Nuée et de Feu"]
  },
  3: { // Lévitique
    persons: ["Aaron", "Nadab et Abihu", "Éléazar", "Ithamar"],
    places: ["Tente d'Assignation", "Le Sinaï", "Le Sanctuaire"],
    notions: ["Holocauste", "Sacrifice d'Expiation", "Jour des Expiations (Yom Kippour)", "Bouc Émissaire", "Loi de Sainteté", "Année du Jubilé", "Sacerdoce Lévitique"]
  },
  4: { // Nombres
    persons: ["Moïse", "Josué", "Caleb", "Balaam", "Balak", "Coré", "Phinées"],
    places: ["Désert de Paran", "Kadès-Barnéa", "Plaines de Moab", "Mont Hor", "Torrent d'Eschcol"],
    notions: ["Recensement d'Israël", "La Manne céleste", "Le Serpent d'Airain", "Rébellion de Coré", "L'Ânesse de Balaam", "Villes de Refuge"]
  },
  5: { // Deutéronome
    persons: ["Moïse", "Josué", "Éléazar"],
    places: ["Mont Nébo", "Sommet du Pisga", "Plaines de Moab", "Mont Ébal", "Mont Garizim"],
    notions: ["Le Shema Israël", "Renouvellement de l'Alliance", "Bénédictions et Malédictions", "Villes de refuge", "Mort et Sépulture de Moïse"]
  },
  6: { // Josué
    persons: ["Josué", "Rahab", "Caleb", "Acan", "Éléazar"],
    places: ["Jéricho", "Aï", "Le Jourdain", "Guilgal", "Gabaon", "Sichem", "Silo"],
    notions: ["Traversée du Jourdain", "Chute des murailles de Jéricho", "Arrêt du soleil à Gabaon", "Partage de la Terre Promise"]
  },
  7: { // Juges
    persons: ["Othniel", "Éhud", "Débora", "Barak", "Gédéon", "Jephthé", "Samson", "Dalila"],
    places: ["Silo", "Torrent de Kischon", "Rocher d'Oreb", "Thimna", "Gaza", "Guibea"],
    notions: ["Cycle des Juges", "Toison de Gédéon", "Les 300 de Gédéon", "Vœu de Jephthé", "Force nazaréenne de Samson"]
  },
  8: { // Ruth
    persons: ["Ruth", "Boaz", "Naomi", "Élimélec", "Obed"],
    places: ["Bethléem de Juda", "Pays de Moab", "L'Aire de battage de Boaz"],
    notions: ["Droit de Rachat (Goël)", "Fidélité et Grâce", "Moisson de l'Orge", "Ascendance Royale Davidique"]
  },
  9: { // 1 Samuel
    persons: ["Samuel", "Anne", "Éli", "Saül", "David", "Jonathan", "Goliath", "Abigaïl"],
    places: ["Silo", "Rama", "Bethléem", "Vallée d'Éla", "En-Guédi", "Guilboa", "Nob"],
    notions: ["Appel nocturne de Samuel", "Début de la Monarchie", "Combat de David et Goliath", "Pacte d'amitié David-Jonathan", "Onction Royale"]
  },
  10: { // 2 Samuel
    persons: ["David", "Abner", "Joab", "Bath-Schéba", "Nathan", "Absalom", "Mephiboscheth"],
    places: ["Hébron", "Jérusalem (Sion)", "Vallée de Rephaïm", "Mont des Oliviers", "Aire d'Aravna"],
    notions: ["Prise de la Forteresse de Sion", "Alliance Davidique éternelle", "Péché de David et Repentance", "Rébellion d'Absalom", "Transport de l'Arche à Jérusalem"]
  },
  11: { // 1 Rois
    persons: ["Salomon", "Adonija", "Reine de Saba", "Roboam", "Jéroboam", "Élie le Thischbite", "Achab", "Jézabel"],
    places: ["Jérusalem", "Mont Carmel", "Désert de Beer-Schéba", "Mont Horeb", "Sarepta", "Tirtsa", "Samarie"],
    notions: ["Sagesse et Jugement de Salomon", "Construction et Dédicace du Temple", "Schisme des Deux Royaumes", "Épreuve du feu sur le Carmel", "Murmure doux et léger de l'Éternel"]
  },
  12: { // 2 Rois
    persons: ["Élie", "Élisée", "Naaman le Syrien", "Jéhu", "Ézéchias", "Ésaïe", "Josias", "Nébucadnetsar"],
    places: ["Le Jourdain", "Damas", "Samarie", "Jérusalem", "Siloé", "Babylone", "Ninive"],
    notions: ["Enlèvement d'Élie dans un char de feu", "Double portion de l'Esprit", "Guérison de Naaman", "Chute du Royaume du Nord", "Réforme religieuse de Josias", "Exil à Babylone"]
  },
  13: { // 1 Chroniques
    persons: ["Adam", "David", "Joab", "Asaph", "Salomon"],
    places: ["Jérusalem", "Aire d'Ornan", "Gabaon"],
    notions: ["Généalogies saintes", "Organisation des Lévites et chantres", "Prière de Jaebets", "Préparatifs du Temple"]
  },
  14: { // 2 Chroniques
    persons: ["Salomon", "Asa", "Josaphat", "Ézéchias", "Manassé", "Josias", "Cyrus le Grand"],
    places: ["Jérusalem", "Mont Moriah", "Vallée de Beraca"],
    notions: ["Gloire du Temple de Salomon", "Jeûne et Victoire de Josaphat", "Prière d'Ézéchias", "Destruction de Jérusalem", "Décret de libération de Cyrus"]
  },
  15: { // Esdras
    persons: ["Esdras le scribe", "Zorobabel", "Josué fils de Jotsadak", "Cyrus", "Darius", "Artaxerxès"],
    places: ["Babylone", "Jérusalem", "Au-delà du Fleuve (Euphrate)"],
    notions: ["Retour d'exil", "Reconstruction du Second Temple", "Restauration de la Loi de Moïse", "Repentance pour les mariages mixtes"]
  },
  16: { // Néhémie
    persons: ["Néhémie", "Esdras", "Sanballat", "Tobija", "Guéschem"],
    places: ["Suse (Palais)", "Jérusalem", "Porte des Eaux", "Porte des Brebis"],
    notions: ["Reconstruction des murailles en 52 jours", "Prière persévérante du gouverneur", "Lecture publique de la Loi", "Restauration du Sabbat"]
  },
  17: { // Esther
    persons: ["Esther (Hadassa)", "Mardochée", "Assuérus (Xerxès)", "Aman l'Agaguite", "Vaschti"],
    places: ["Suse la capitale", "Palais royal perse"],
    notions: ["Providence cachée de Dieu", "Pour un temps comme celui-ci", "Fête de Pourim", "Courage d'intercession"]
  },
  18: { // Job
    persons: ["Job", "Éliphaz de Théman", "Bildad de Schuach", "Tsophar de Naama", "Élihu", "L'Adversaire (Satan)"],
    places: ["Pays d'Uts"],
    notions: ["Souffrance de l'innocent", "Théodicée", "Rédempteur vivant", "Béhémoth et Léviathan", "Restauration au double"]
  },
  19: { // Psaumes
    persons: ["David", "Asaph", "Fils de Koré", "Moïse", "Salomon", "Héman", "Éthan"],
    places: ["Sion", "Jérusalem", "Sanctuaire", "Vallée de l'Ombre de la Mort", "Mont Hermon"],
    notions: ["Le Bon Berger (Ps 23)", "Psaumes Messianiques (Ps 2, 22, 110)", "Psaume de Repentance (Ps 51)", "Louange cosmique (Ps 150)", "Amour de la Torah (Ps 119)"]
  },
  20: { // Proverbes
    persons: ["Salomon", "Agur fils de Jaké", "Roi Lemuel", "La Femme vertueuse"],
    places: ["La cité", "Les places publiques", "La maison du sage"],
    notions: ["Crainte de l'Éternel, début de la sagesse", "Personnification de la Sagesse", "Voie de la vie vs Voie de la mort", "Femme de valeur"]
  },
  21: { // Ecclésiaste
    persons: ["Qohélet (L'Ecclésiaste)", "Salomon"],
    places: ["Sous le soleil"],
    notions: ["Vanité des vanités", "Temps pour toute chose", "Jouissance du labeur comme don de Dieu", "Conclusion finale: crains Dieu et observe ses lois"]
  },
  22: { // Cantique des Cantiques
    persons: ["Salomon", "La Sulamithe", "Filles de Jérusalem"],
    places: ["Vignes d'En-Guédi", "Liban", "Saron", "Tirtsa", "Jérusalem"],
    notions: ["Amour conjugal pur", "Allégorie de l'amour divin pour Son peuple", "L'amour est fort comme la mort"]
  },
  23: { // Ésaïe
    persons: ["Ésaïe", "Roi Ozias", "Achaz", "Ézéchias", "Cyrus l'Oint", "Le Serviteur souffrant"],
    places: ["Jérusalem", "Sion", "Babylone", "Égypte", "Assyrie"],
    notions: ["Vision du trône divin (Saint, Saint, Saint)", "Emmanuel (Dieu avec nous)", "Chants du Serviteur Souffrant (És 53)", "Nouveaux cieux et nouvelle terre", "Rameau d'Isaï"]
  },
  24: { // Jérémie
    persons: ["Jérémie", "Baruc le scribe", "Roi Josias", "Jojakim", "Sédécias", "Ébed-Mélec"],
    places: ["Anathoth", "Jérusalem", "Cour de la prison", "Babylone", "Mizpa"],
    notions: ["Prophète pleureur", "La Nouvelle Alliance gravée dans les cœurs (Jér 31)", "Maison du potier", "Joug babylonien", "Projet de paix et non de malheur"]
  },
  25: { // Lamentations
    persons: ["Jérémie"],
    places: ["Jérusalem dévastée", "Sion en larmes"],
    notions: ["Compassions renouvelées chaque matin", "Fidélité sans bornes de l'Éternel", "Deuil de la cité sainte"]
  },
  26: { // Ézéchiel
    persons: ["Ézéchiel fils de Buzi", "Pelathia"],
    places: ["Fleuve Kebar (Babylone)", "Jérusalem", "Vallée des Ossements Desséchés", "Nouveau Temple visionnaire"],
    notions: ["Vision du char de gloire (Merkabah)", "Sentinelle pour la maison d'Israël", "Cœur de pierre changé en cœur de chair", "Résurrection des ossements desséchés", "Source jaillissant du Temple"]
  },
  27: { // Daniel
    persons: ["Daniel (Beltschatsar)", "Schadrac", "Méschac", "Abed-Nego", "Nébucadnetsar", "Belshatsar", "Darius le Mède", "L'archange Michel", "Gabriel"],
    places: ["Babylone", "Palais de Suse", "Fosse aux lions", "Fournaise ardente", "Fleuve Hiddékel (Tigre)"],
    notions: ["Statue aux pieds d'argile", "Délivrance de la fournaise", "L'inscription Mené Mené Thékel Oufarsin", "La fosse aux lions", "Vision du Fils de l'Homme et de l'Ancien des Jours", "Les 70 Semaines"]
  },
  28: { // Osée
    persons: ["Osée", "Gomer", "Jizreel", "Lo-Ruchama", "Lo-Ammi"],
    places: ["Royaume d'Israël (Samarie)", "Béthel (Beth-Aven)"],
    notions: ["Amour inconditionnel de Dieu", "Métaphore des fiançailles divines", "Guérison de l'infidélité du peuple"]
  },
  29: { // Joël
    persons: ["Joël fils de Pethuel"],
    places: ["Sion", "Jérusalem", "Vallée de Josaphat"],
    notions: ["Invasion de sauterelles", "Le grand Jour de l'Éternel", "Effusion de l'Esprit sur toute chair", "Déchirez vos cœurs et non vos vêtements"]
  },
  30: { // Amos
    persons: ["Amos le berger", "Amatsia le sacrificateur", "Jéroboam II"],
    places: ["Thekoa", "Béthel", "Samarie", "Damas"],
    notions: ["Justice sociale comme un torrent intarissable", "Le fil à plomb", "Panier de fruits mûrs", "Restauration de la hutte de David"]
  },
  31: { // Abdias
    persons: ["Abdias", "Ésaü", "Jacob"],
    places: ["Montagne de Séir", "Édom", "Mont Sion"],
    notions: ["Jugement de l'orgueil d'Édom", "Solidarité fraternelle trahie", "Royaume appartenant à l'Éternel"]
  },
  32: { // Jonas
    persons: ["Jonas fils d'Amittaï", "Marins phéniciens", "Roi de Ninive"],
    places: ["Joppé", "Tarsis", "Ninive", "Le ventre du grand poisson"],
    notions: ["Fuite loin de la face de Dieu", "Signe du prophète Jonas", "Repentance collective avec le sac et la cendre", "Compassion universelle de Dieu"]
  },
  33: { // Michée
    persons: ["Michée de Moréscheth", "Ézéchias"],
    places: ["Samarie", "Jérusalem", "Bethléem Éphrata"],
    notions: ["Annonce de la naissance du Messie à Bethléem", "Pratiquer la justice, aimer la miséricorde, marcher humblement avec Dieu", "Dieu jetant les péchés au fond de la mer"]
  },
  34: { // Nahum
    persons: ["Nahum d'Elkosch"],
    places: ["Ninive", "Le Tigre", "Juda"],
    notions: ["Chute de la cité sanguinaire", "L'Éternel est bon, refuge au jour de la détresse", "Beauté des pieds de celui qui annonce la paix"]
  },
  35: { // Habacuc
    persons: ["Habacuc"],
    places: ["Tour de garde", "Mont Paran"],
    notions: ["Pourquoi le silence face à l'injustice ?", "Le juste vivra par sa foi", "Même si le figuier ne fleurit pas, je me réjouirai en l'Éternel"]
  },
  36: { // Sophonie
    persons: ["Sophonie", "Roi Josias"],
    places: ["Jérusalem", "Gaza", "Éthiopie", "Assyrie"],
    notions: ["Jour de la fureur de l'Éternel", "Un peuple humble et petit", "L'Éternel pousse des cris de joie pour les siens"]
  },
  37: { // Aggée
    persons: ["Aggée", "Zorobabel", "Josué fils de Jotsadak"],
    places: ["Jérusalem", "Temple rebâti"],
    notions: ["Considérez attentivement vos voies", "Reconstruction de la maison de Dieu", "La gloire de ce dernier temple sera plus grande que la première"]
  },
  38: { // Zacharie
    persons: ["Zacharie fils de Bérékia", "Josué le grand prêtre", "Zorobabel"],
    places: ["Jérusalem", "Mont des Oliviers", "Babylone"],
    notions: ["Ni par force, ni par puissance, mais par mon Esprit", "Vision des chevaux et des myrtes", "Le Roi humble monté sur un ânon", "Regard sur celui qu'ils ont transpercé"]
  },
  39: { // Malachie
    persons: ["Malachie", "Élie le prophète"],
    places: ["Jérusalem", "Temple"],
    notions: ["Dîmes et offrandes éprouvées", "Le messager qui préparera la voie", "Soleil de justice avec la guérison sous ses ailes", "Réconciliation des pères avec les enfants"]
  },
  40: { // Matthieu
    persons: ["Jésus-Christ", "Marie", "Joseph", "Jean-Baptiste", "Pierre", "Jean", "Hérode le Grand", "Pilate"],
    places: ["Bethléem", "Nazareth", "Capernaüm", "Mer de Galilée", "Montagne des Béatitudes", "Gethsémané", "Golgotha"],
    notions: ["Généalogie royale messianique", "Sermon sur la Montagne (Béatitudes)", "Notre Père", "Paraboles du Royaume des Cieux", "Grande Mission d'évangélisation"]
  },
  41: { // Marc
    persons: ["Jésus le Serviteur", "Marc (Jean-Marc)", "Pierre", "Légion de Gérasa", "Bartimée", "Le centurion romain"],
    places: ["Désert de Judée", "Capernaüm", "Décapole", "Césarée de Philippe", "Jérusalem"],
    notions: ["Évangile de l'action immédiate", "Le Messie Serviteur souffrant", "Secret Messianique", "Le Fils de l'homme venu pour donner sa vie en rançon"]
  },
  42: { // Luc
    persons: ["Jésus", "Luc le médecin bien-aimé", "Zacharie et Élisabeth", "Marie", "Siméon et Anne", "Zachée", "Le Bon Samaritain", "Le Fils prodigue"],
    places: ["Nazareth", "Temple de Jérusalem", "Emmaüs", "Colline du Crâne", "Béthanie"],
    notions: ["Cantique du Magnificat", "Annonce de la Nativité aux bergers", "Compassion pour les exclus et pécheurs", "Parabole du Fils Prodigue", "Disciples d'Emmaüs"]
  },
  43: { // Jean
    persons: ["Jésus le Logos Divin", "Jean l'apôtre", "Nicodème", "La Samaritaine", "Lazare, Marthe et Marie", "Thomas", "Barabbas"],
    places: ["Cana de Galilée", "Puits de Jacob à Sychar", "Piscine de Béthesda", "Piscine de Siloé", "Béthanie", "Prétoire", "Plage de Tibériade"],
    notions: ["Prologue du Verbe incarné (Jean 1)", "Nouvelle Naissance (Jean 3)", "Sept déclarations 'Je Suis' (Pain de vie, Lumière du monde...)", "Promesse du Consolateur (Esprit Saint)", "Résurrection de Lazare"]
  },
  44: { // Actes
    persons: ["Pierre", "Paul (Saul de Tarse)", "Étienne", "Philippe", "Barnabas", "Jacques", "Corneille", "Lydie", "Aquilas et Priscille"],
    places: ["Chambre haute de Jérusalem", "Chemin de Damas", "Antioche de Syrie", "Aréopage d'Athènes", "Éphèse", "Malte", "Rome"],
    notions: ["Pentecôte et effusion de l'Esprit", "Martyre d'Étienne", "Conversion fulgurante de Saul", "Concile apostolique de Jérusalem", "Voyages missionnaires de Paul"]
  },
  45: { // Romains
    persons: ["Paul", "Phoebé", "Tertius", "Adam", "Abraham"],
    places: ["Corinthe", "Rome", "Espagne"],
    notions: ["Justification par la foi seule (Sola Fide)", "Épître maîtresse de la grâce", "Affranchissement du péché (Romains 6-8)", "Plus que vainqueurs en Christ", "Mystère de la greffe d'Israël (Rom 9-11)"]
  },
  46: { // 1 Corinthiens
    persons: ["Paul", "Sosthène", "Apollos", "Céphaw (Pierre)", "Crispus"],
    places: ["Corinthe", "Éphèse", "Macédoine"],
    notions: ["La folie de la prédication de la Croix", "L'Église comme Corps de Christ", "Sainte Cène", "Hymne à l'Amour fraternel (1 Cor 13)", "Victoire de la Résurrection corporelle (1 Cor 15)"]
  },
  47: { // 2 Corinthiens
    persons: ["Paul", "Timothée", "Tite"],
    places: ["Troas", "Macédoine", "Corinthe"],
    notions: ["Consolation dans les tribulations", "Trésor dans des vases d'argile", "Ministère de la Réconciliation", "Écharde dans la chair ('Ma grâce te suffit')", "Libéralité joyeuse"]
  },
  48: { // Galates
    persons: ["Paul", "Pierre", "Barnabas", "Jacques le frère du Seigneur", "Agar et Sara"],
    places: ["Galatie (Antioche de Pisidie, Icone, Lystre, Derbe)", "Jérusalem"],
    notions: ["La Charte de la Liberté Chrétienne", "Anathème contre un faux évangile", "Crucifié avec Christ", "Fruit de l'Esprit vs Œuvres de la chair"]
  },
  49: { // Éphésiens
    persons: ["Paul", "Tychique"],
    places: ["Éphèse", "Prison de Rome"],
    notions: ["Bénédictions spirituelles dans les lieux célestes", "Sauvés par grâce au moyen de la foi", "Un seul Seigneur, une seule foi, un seul baptême", "Mystère de l'Église et du mariage", "L'Armure complète de Dieu"]
  },
  50: { // Philippiens
    persons: ["Paul", "Timothée", "Épaphrodite", "Évodie et Syntyche"],
    places: ["Philippes", "Prison de Rome"],
    notions: ["Épître de la Joie", "Hymne christologique de la Kénose (abaissement et exaltation de Christ)", "Oublier ce qui est en arrière et courir vers le but", "Je puis tout par celui qui me fortifie"]
  },
  51: { // Colossiens
    persons: ["Paul", "Timothée", "Épaphras", "Onésime", "Tychique", "Archippe"],
    places: ["Colosses", "Laodicée", "Hiérapolis"],
    notions: ["Suprématie absolue de Christ, image du Dieu invisible", "Plénitude de la divinité habitant corporellement en Lui", "Recherche des choses d'en haut", "Dépouiller le vieil homme"]
  },
  52: { // 1 Thessaloniciens
    persons: ["Paul", "Silvain (Silas)", "Timothée"],
    places: ["Thessalonique", "Athènes", "Corinthe"],
    notions: ["Trilogie chrétienne: foi, amour et espérance", "Modèle d'une communauté vivante", "Enlèvement et retour glorieux du Seigneur", "Priez sans cesse"]
  },
  53: { // 2 Thessaloniciens
    persons: ["Paul", "Silas", "Timothée"],
    places: ["Thessalonique", "Corinthe"],
    notions: ["L'Homme du péché et l'Apostasie", "Ce qui retient le mystère de l'iniquité", "Tenir ferme dans les traditions enseignées", "Que celui qui ne veut pas travailler ne mange pas"]
  },
  54: { // 1 Timothée
    persons: ["Paul", "Timothée", "Hyménée et Alexandre"],
    places: ["Éphèse", "Macédoine"],
    notions: ["Un seul médiateur entre Dieu et les hommes: Jésus-Christ", "Qualifications des évêques/pasteurs et diacres", "Que personne ne méprise ta jeunesse", "L'amour de l'argent racine de tous les maux"]
  },
  55: { // 2 Timothée
    persons: ["Paul l'apôtre captif", "Timothée", "Loïs et Eunice", "Démas", "Luc", "Onésiphore"],
    places: ["Prison sévère de Rome"],
    notions: ["Testament spirituel de Paul", "Esprit de force, d'amour et de sagesse", "Toute Écriture est inspirée de Dieu", "J'ai combattu le bon combat, j'ai gardé la foi"]
  },
  56: { // Tite
    persons: ["Paul", "Tite", "Artémas", "Zénas l'homme de loi", "Apollos"],
    places: ["Île de Crète", "Nicopolis"],
    notions: ["Établissement d'anciens dans chaque ville", "Saine doctrine pour chaque génération", "La grâce de Dieu source de salut pour tous les hommes", "Bons modèles d'œuvres excellentes"]
  },
  57: { // Philémon
    persons: ["Paul", "Philémon", "Onésime l'esclave fugitif", "Apphia", "Archippe"],
    places: ["Colosses", "Prison de Rome"],
    notions: ["Réconciliation fraternelle au-delà des classes sociales", "Non plus comme un esclave mais comme un frère bien-aimé", "Imputation et pardon généreux"]
  },
  58: { // Hébreux
    persons: ["Auteur inspiré anonyme", "Melchisédek", "Moïse", "Aaron", "Abraham", "Josué", "Héros de la foi"],
    places: ["Sanctuaire céleste", "Mont Sion céleste", "Jérusalem céleste"],
    notions: ["Jésus supérieur aux anges, à Moïse et au sacerdoce lévitique", "Souverain Sacrificateur selon l'ordre de Melchisédek", "Le Rideau déchiré ouvrant l'accès au Trône de la Grâce", "La nuée de témoins et la galerie de la Foi (Héb 11)"]
  },
  59: { // Jacques
    persons: ["Jacques serviteur de Dieu", "Abraham", "Rahab", "Élie"],
    places: ["Dispersion des douze tribus"],
    notions: ["La foi sans les œuvres est morte", "Maîtrise de la langue comme gouvernail", "Prière fervente du juste efficace", "Sagesse d'en haut pure et pacifique"]
  },
  60: { // 1 Pierre
    persons: ["Pierre apôtre de Jésus-Christ", "Silvain", "Marc"],
    places: ["Babylone (Rome codée)", "Pont, Galatie, Cappadoce, Asie, Bithynie"],
    notions: ["Espérance vivante par la résurrection", "Pierres vivantes d'un sacerdoce royal", "Souffrir en chrétien avec patience", "Déchargez-vous sur Lui de tous vos soucis"]
  },
  61: { // 2 Pierre
    persons: ["Simon Pierre", "Noé", "Loth", "Balaam", "Paul"],
    places: ["Montagne sainte de la Transfiguration"],
    notions: ["Participants de la nature divine", "Échelle des vertus chrétiennes", "Inspiration prophétique guidée par l'Esprit Saint", "La patience du Seigneur est notre salut", "Attente de nouveaux cieux et d'une nouvelle terre"]
  },
  62: { // 1 Jean
    persons: ["Jean l'ancien", "Cain", "L'Antéchrist"],
    places: ["Éphèse et églises d'Asie"],
    notions: ["Dieu est Lumière et Amour", "Purification par le sang de Jésus", "L'Avocat auprès du Père", "Aimer en action et en vérité", "L'amour parfait bannit la crainte"]
  },
  63: { // 2 Jean
    persons: ["L'Ancien", "La dame élue et ses enfants"],
    places: ["Asie Mineure"],
    notions: ["Marcher dans la vérité et l'amour", "Garde contre les séducteurs qui nient l'incarnation de Christ", "Persévérer dans la saine doctrine"]
  },
  64: { // 3 Jean
    persons: ["L'Ancien", "Gaïus le bien-aimé", "Diotrèphe qui aime dominer", "Démétrius"],
    places: ["Asie Mineure"],
    notions: ["Hospitalité envers les serviteurs de l'Évangile", "Prospérer à tous égards comme prospère l'âme", "Imiter le bien et non le mal"]
  },
  65: { // Jude
    persons: ["Jude frère de Jacques", "Michel l'archange", "Moïse", "Cain", "Balaam", "Coré", "Énoch septième depuis Adam"],
    places: ["Sodome et Gomorrhe"],
    notions: ["Combattre pour la foi transmise aux saints une fois pour toutes", "Arbres d'automne sans fruit", "Édification mutuelle sur la très sainte foi", "Doxologie: à Celui qui peut vous préserver de toute chute"]
  },
  66: { // Apocalypse
    persons: ["Jésus-Christ Roi des rois", "Jean à Patmos", "Les 24 Vieillards", "Les 4 Êtres vivants", "Les Deux Témoins", "La Femme vêtue du soleil", "L'Agneau immolé", "L'archange Michel"],
    places: ["Île de Patmos", "Les 7 Églises d'Asie (Éphèse, Smyrne, Pergame, Thyatire, Sardes, Philadelphie, Laodicée)", "Mont Sion", "Nouvelle Jérusalem céleste", "Fleuve d'eau de la vie"],
    notions: ["Révélation finale de Jésus-Christ triomphant", "Le Rouleau aux Sept Sceaux", "Les Sept Trompettes et Coupes", "Chute de Babylone la Grande", "Noces de l'Agneau", "Bataille d'Harmaguédon", "Le Grand Trône Blanc", "Fin des larmes, de la mort et du deuil", "Voici, je viens bientôt !"]
  }
};
