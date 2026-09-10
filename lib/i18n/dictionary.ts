/**
 * Bilingual copy.
 *
 * Layout rule that comes with this file: French runs roughly 15-20% longer than
 * English for the same sentence. Every component that consumes these strings is
 * sized against the FRENCH string, never the English one, so switching language
 * can never clip a line or push a block out of its container.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dictionary = typeof en;

export const en = {
  meta: { label: "English", short: "EN" },

  nav: {
    products: "Products",
    craft: "Craft",
    about: "About",
    skip: "Skip to content",
    index: "Index",
  },

  loader: {
    status: "Loading",
    hint: "Just a moment",
  },

  hero: {
    eyebrow: "Independent showcase",
    lines: ["Every", "angle.", "In motion."],
    lede: "Five products. One obsession with the details most people will never notice, and always feel.",
    cta: "Begin",
    scroll: "Scroll to turn",
    // Three quiet words the whole collection is built around, drifting past
    // as the opening product turns.
    pillars: ["Form.", "Material.", "Restraint."],
  },

  sectionLabels: {
    specification: "Specification",
    keepScrolling: "Keep scrolling",
  },

  products: {
    iphone: {
      index: "01",
      tagline: "The ultimate canvas",
      lede: "A grade 5 titanium chassis wrapped around the brightest display Apple has ever shipped. Turn it in the light and watch the polish break across the rails in one unbroken line, the kind of detail that only survives when the tolerance is measured in microns.",
      detail: {
        title: "Machined, not moulded",
        body: "The frame starts as a solid billet and leaves the mill as a shell. Every antenna break, every button seat and every speaker perforation is cut rather than cast, so the seams land exactly where the eye expects them, and nowhere else.",
      },
      stat: { value: "2000", unit: "nits", label: "Peak outdoor brightness" },
      callouts: [
        { label: "Titanium rail", note: "Bead-blasted, then polished" },
        { label: "Fusion camera", note: "48MP, 5x tetraprism" },
        { label: "Ceramic Shield", note: "Front and back" },
      ],
      specs: [
        { label: "Chip", value: "A19 Pro" },
        { label: "CPU", value: "6 cores" },
        { label: "GPU", value: "6 cores, ray tracing" },
        { label: "Neural Engine", value: "16 cores" },
        { label: "Chassis", value: "Grade 5 titanium" },
        { label: "Display", value: "6.9\" Super Retina XDR" },
        { label: "Refresh", value: "Adaptive 1–120 Hz" },
        { label: "Camera", value: "48MP Fusion triple" },
        { label: "Video", value: "4K120 Dolby Vision" },
        { label: "Weight", value: "221 g" },
      ],
      cta: "Learn more",
    },

    "macbook-m5": {
      index: "02",
      tagline: "Unrivalled power",
      lede: "Open it. The hinge holds anywhere across its arc, the display wakes before the lid finishes moving, and the whole machine stays silent doing it. On battery, it performs exactly as it does plugged in, a claim almost nothing else in the category can make.",
      detail: {
        title: "Silent under load",
        body: "The thermal system is sized for the work, not for the benchmark. A full export runs at the same clock in the fortieth minute as in the first, while the fans stay below the noise floor of a quiet room.",
      },
      stat: { value: "22", unit: "hours", label: "Battery, at full performance" },
      callouts: [
        { label: "Liquid Retina XDR", note: "1600 nits peak HDR" },
        { label: "Unibody deck", note: "Machined from one piece" },
        { label: "Six-speaker array", note: "Force-cancelling woofers" },
      ],
      specs: [
        { label: "Chip", value: "M5 Pro" },
        { label: "CPU", value: "12 cores" },
        { label: "GPU", value: "18 cores" },
        { label: "Memory", value: "24 GB unified" },
        { label: "Display", value: "14.2\" Liquid Retina XDR" },
        { label: "Refresh", value: "ProMotion up to 120 Hz" },
        { label: "Battery", value: "22 hours" },
        { label: "Ports", value: "3x TB5, HDMI, SDXC" },
        { label: "Thickness", value: "15.5 mm" },
        { label: "Weight", value: "1.55 kg" },
      ],
      cta: "Learn more",
    },

    "airpods-max": {
      index: "03",
      tagline: "Sound, redefined",
      lede: "Forty millimetres of dynamic driver, a canopy of knitted mesh, and a frame of anodised aluminium. Nothing here hides behind a cover. The mesh is the structure, the aluminium is the finish, and the engineering is the design.",
      detail: {
        title: "The mesh is structural",
        body: "The canopy spreads the weight of the headband across the top of the head instead of concentrating it on one line. It is a textile doing a mechanical job, so it can stay this thin and still hold its shape after a year of daily use.",
      },
      stat: { value: "20", unit: "hours", label: "With cancellation and spatial on" },
      callouts: [
        { label: "Knitted canopy", note: "Distributes headband load" },
        { label: "Telescoping arm", note: "Stainless steel, notched" },
        { label: "Memory foam cushion", note: "Acoustically sealed" },
      ],
      specs: [
        { label: "Driver", value: "40 mm dynamic" },
        { label: "Motor", value: "Dual ring magnet" },
        { label: "Chip", value: "H2, one per cup" },
        { label: "Microphones", value: "9 total, 6 outward facing" },
        { label: "Cancellation", value: "Active, with Transparency" },
        { label: "Audio", value: "Spatial with head tracking" },
        { label: "Frame", value: "Anodised aluminium" },
        { label: "Canopy", value: "Knitted mesh" },
        { label: "Battery", value: "20 hours" },
        { label: "Weight", value: "384 g" },
      ],
      cta: "Learn more",
    },

    "macbook-neo": {
      index: "04",
      tagline: "The next icon",
      lede: "The thinnest enclosure ever machined from a single billet. Nothing was added to make it look light. Everything unnecessary was removed until it was, leaving no fan, no vent, no moving part anywhere in the machine.",
      detail: {
        title: "Nothing left to remove",
        body: "Removing the fan removed the vents, the ducting and the dust path with it. What remains is a sealed aluminium shell that is also the heatsink, thin enough to disappear and still run at full clock in a warm room.",
      },
      stat: { value: "988", unit: "grams", label: "Lighter than the display it replaces" },
      callouts: [
        { label: "Single billet", note: "Recycled aluminium" },
        { label: "Fanless", note: "The shell is the heatsink" },
        { label: "Thunderbolt 5", note: "120 Gb/s, either side" },
      ],
      specs: [
        { label: "Weight", value: "988 g" },
        { label: "Thickness", value: "9.1 mm" },
        { label: "Enclosure", value: "Single billet aluminium" },
        { label: "Cooling", value: "Passive, fanless" },
        { label: "Display", value: "13.6\" Liquid Retina" },
        { label: "Refresh", value: "Up to 120 Hz" },
        { label: "Ports", value: "2x Thunderbolt 5" },
        { label: "Charging", value: "Either side, 70 W" },
        { label: "Battery", value: "18 hours" },
        { label: "Keyboard", value: "Full-height, backlit" },
      ],
      cta: "Learn more",
    },

    "airpods-pro": {
      index: "05",
      tagline: "Pure silence",
      lede: "Open the case and the world goes quiet. Adaptive Audio reads the room a hundred times a second and decides what you should still hear. A siren stays, a train does not, and you never touch a control to make that happen.",
      detail: {
        title: "It decides what stays",
        body: "Cancellation used to be a switch. Here it is a judgement made continuously. The sound of a room is sampled, classified and reduced selectively, so a conversation beside you survives while the extractor fan above you disappears.",
      },
      stat: { value: "96,000", unit: "samples/s", label: "Computational audio rate" },
      callouts: [
        { label: "H3 chip", note: "One per earbud" },
        { label: "Vent system", note: "Equalises pressure" },
        { label: "Skin-detect sensor", note: "Optical, not capacitive" },
      ],
      specs: [
        { label: "Chip", value: "H3" },
        { label: "Processing", value: "96,000 samples/s" },
        { label: "Cancellation", value: "2x the previous generation" },
        { label: "Modes", value: "Adaptive, Transparency, Off" },
        { label: "Conversation", value: "Automatic detection" },
        { label: "Fit", value: "Four tip sizes, from XS" },
        { label: "Tips", value: "Memory-foam infused" },
        { label: "Battery", value: "8 hours, 30 with the case" },
        { label: "Case", value: "USB-C, MagSafe, speaker" },
        { label: "Rating", value: "IP54, dust and water" },
      ],
      cta: "Learn more",
    },
  },

  footer: {
    title: ["Crafted", "by", "Clémentin"],
    subtitle: "An independent exploration of product design on the web.",
    cta: "See the portfolio",
    marquee: "Apple Motion · Crafted in detail · Apple Motion · Crafted in detail ·",
    colophon: "Colophon",
    tech: "A personal study in restraint. What happens when a product photograph is given room to move.",
    typeLabel: "Typeface",
    typeValue: "Inter Tight, Inter",
    yearLabel: "Year",
    disclaimer: "An independent, non-commercial project. Not affiliated with Apple Inc.",
    backToTop: "Back to top",
  },

  a11y: {
    languageSwitch: "Change language",
    reducedMotion: "Reduced motion is on. Animations are simplified.",
  },
};

export const fr: Dictionary = {
  meta: { label: "Français", short: "FR" },

  nav: {
    products: "Produits",
    craft: "Fabrication",
    about: "À propos",
    skip: "Aller au contenu",
    index: "Sommaire",
  },

  loader: {
    status: "Chargement",
    hint: "Un instant",
  },

  hero: {
    eyebrow: "Vitrine indépendante",
    lines: ["Chaque", "angle.", "En mouvement."],
    lede: "Cinq produits. Une obsession pour les détails que personne ne remarque, et que tout le monde ressent.",
    cta: "Commencer",
    scroll: "Défilez pour tourner",
    pillars: ["Forme.", "Matière.", "Retenue."],
  },

  sectionLabels: {
    specification: "Fiche technique",
    keepScrolling: "Continuez à défiler",
  },

  products: {
    iphone: {
      index: "01",
      tagline: "La toile absolue",
      lede: "Un châssis en titane de grade 5 refermé sur l'écran le plus lumineux jamais produit par Apple. Inclinez-le vers la lumière et regardez le poli se briser le long des arêtes en une seule ligne continue, le genre de détail qui ne survit que lorsque la tolérance se mesure en microns.",
      detail: {
        title: "Usiné, pas moulé",
        body: "L'armature part d'un bloc plein et sort de la fraiseuse à l'état de coque. Chaque coupure d'antenne, chaque logement de bouton et chaque perforation de haut-parleur est taillée plutôt que coulée, si bien que les jointures tombent là où l'œil les attend, et nulle part ailleurs.",
      },
      stat: { value: "2000", unit: "nits", label: "Luminosité de crête en plein soleil" },
      callouts: [
        { label: "Arête en titane", note: "Microbillée, puis polie" },
        { label: "Module Fusion", note: "48 Mpx, tétraprisme 5x" },
        { label: "Ceramic Shield", note: "Avant et arrière" },
      ],
      specs: [
        { label: "Puce", value: "A19 Pro" },
        { label: "CPU", value: "6 cœurs" },
        { label: "GPU", value: "6 cœurs, ray tracing" },
        { label: "Neural Engine", value: "16 cœurs" },
        { label: "Châssis", value: "Titane grade 5" },
        { label: "Écran", value: "Super Retina XDR 6,9\"" },
        { label: "Rafraîchissement", value: "Adaptatif 1–120 Hz" },
        { label: "Photo", value: "Fusion 48 Mpx triple" },
        { label: "Vidéo", value: "4K120 Dolby Vision" },
        { label: "Poids", value: "221 g" },
      ],
      cta: "En savoir plus",
    },

    "macbook-m5": {
      index: "02",
      tagline: "Puissance sans rivale",
      lede: "Ouvrez-le. La charnière tient sur toute sa course, l'écran s'allume avant que le capot ait fini sa trajectoire, et la machine reste silencieuse en le faisant. Sur batterie, elle tient exactement la même performance que sur secteur, une affirmation que presque rien d'autre dans la catégorie ne peut tenir.",
      detail: {
        title: "Silencieux en charge",
        body: "Le système thermique est dimensionné pour le travail réel, pas pour le banc d'essai. Un export complet tourne à la même fréquence à la quarantième minute qu'à la première, pendant que les ventilateurs restent sous le seuil sonore d'une pièce calme.",
      },
      stat: { value: "22", unit: "heures", label: "Batterie, à pleine performance" },
      callouts: [
        { label: "Liquid Retina XDR", note: "1600 nits en crête HDR" },
        { label: "Coque unibody", note: "Usinée dans une seule pièce" },
        { label: "Six haut-parleurs", note: "Woofers à annulation de force" },
      ],
      specs: [
        { label: "Puce", value: "M5 Pro" },
        { label: "CPU", value: "12 cœurs" },
        { label: "GPU", value: "18 cœurs" },
        { label: "Mémoire", value: "24 Go unifiée" },
        { label: "Écran", value: "Liquid Retina XDR 14,2\"" },
        { label: "Rafraîchissement", value: "ProMotion jusqu'à 120 Hz" },
        { label: "Autonomie", value: "22 heures" },
        { label: "Ports", value: "3x TB5, HDMI, SDXC" },
        { label: "Épaisseur", value: "15,5 mm" },
        { label: "Poids", value: "1,55 kg" },
      ],
      cta: "En savoir plus",
    },

    "airpods-max": {
      index: "03",
      tagline: "Le son, redéfini",
      lede: "Quarante millimètres de transducteur, une voûte de maille tricotée, une armature en aluminium anodisé. Rien n'est ici dissimulé derrière un capot. La maille est la structure, l'aluminium est la finition, et l'ingénierie est le design.",
      detail: {
        title: "La maille est structurelle",
        body: "La voûte répartit le poids de l'arceau sur le dessus du crâne au lieu de le concentrer sur une ligne. C'est un textile qui fait un travail mécanique, assez fin pour disparaître et garder pourtant sa forme après un an d'usage quotidien.",
      },
      stat: { value: "20", unit: "heures", label: "Réduction du bruit et spatial actifs" },
      callouts: [
        { label: "Voûte tricotée", note: "Répartit la charge de l'arceau" },
        { label: "Bras télescopique", note: "Acier inoxydable, cranté" },
        { label: "Coussinet à mémoire", note: "Scellé acoustiquement" },
      ],
      specs: [
        { label: "Transducteur", value: "Dynamique 40 mm" },
        { label: "Moteur", value: "Double aimant annulaire" },
        { label: "Puce", value: "H2, une par écouteur" },
        { label: "Micros", value: "9 au total, 6 vers l'extérieur" },
        { label: "Réduction", value: "Active, avec Transparence" },
        { label: "Audio", value: "Spatial avec suivi de tête" },
        { label: "Armature", value: "Aluminium anodisé" },
        { label: "Voûte", value: "Maille tricotée" },
        { label: "Autonomie", value: "20 heures" },
        { label: "Poids", value: "384 g" },
      ],
      cta: "En savoir plus",
    },

    "macbook-neo": {
      index: "04",
      tagline: "La prochaine icône",
      lede: "Le boîtier le plus fin jamais usiné dans un bloc unique. Rien n'a été ajouté pour le faire paraître léger. Tout le superflu a été retiré jusqu'à ce qu'il le soit, sans ventilateur, sans grille, sans la moindre pièce mobile.",
      detail: {
        title: "Plus rien à retirer",
        body: "Retirer le ventilateur a retiré avec lui les grilles, les conduits et le chemin de la poussière. Ce qui reste est une coque d'aluminium scellée qui est aussi le dissipateur, assez fine pour disparaître et tenir sa fréquence même dans une pièce chaude.",
      },
      stat: { value: "988", unit: "grammes", label: "Plus léger que l'écran qu'il remplace" },
      callouts: [
        { label: "Bloc unique", note: "Aluminium recyclé" },
        { label: "Sans ventilateur", note: "La coque est le dissipateur" },
        { label: "Thunderbolt 5", note: "120 Gb/s, des deux côtés" },
      ],
      specs: [
        { label: "Poids", value: "988 g" },
        { label: "Épaisseur", value: "9,1 mm" },
        { label: "Boîtier", value: "Aluminium, bloc unique" },
        { label: "Refroidissement", value: "Passif, sans ventilateur" },
        { label: "Écran", value: "Liquid Retina 13,6\"" },
        { label: "Rafraîchissement", value: "Jusqu'à 120 Hz" },
        { label: "Ports", value: "2x Thunderbolt 5" },
        { label: "Recharge", value: "Des deux côtés, 70 W" },
        { label: "Autonomie", value: "18 heures" },
        { label: "Clavier", value: "Pleine hauteur, rétroéclairé" },
      ],
      cta: "En savoir plus",
    },

    "airpods-pro": {
      index: "05",
      tagline: "Silence absolu",
      lede: "Ouvrez le boîtier et le monde se tait. L'audio adaptatif analyse la pièce cent fois par seconde et décide de ce que vous devez encore entendre. Une sirène reste, un train disparaît, et vous ne touchez jamais une commande pour que cela arrive.",
      detail: {
        title: "C'est lui qui décide",
        body: "La réduction du bruit était un interrupteur. Ici, c'est un jugement rendu en continu. Le son d'une pièce est échantillonné, classé puis réduit sélectivement, de sorte qu'une conversation à côté de vous survit pendant que la hotte au-dessus disparaît.",
      },
      stat: { value: "96 000", unit: "échant./s", label: "Cadence de l'audio calculé" },
      callouts: [
        { label: "Puce H3", note: "Une par écouteur" },
        { label: "Système d'évent", note: "Égalise la pression" },
        { label: "Capteur de peau", note: "Optique, pas capacitif" },
      ],
      specs: [
        { label: "Puce", value: "H3" },
        { label: "Traitement", value: "96 000 échant./s" },
        { label: "Réduction", value: "2x la génération précédente" },
        { label: "Modes", value: "Adaptatif, Transparence, Arrêt" },
        { label: "Conversation", value: "Détection automatique" },
        { label: "Maintien", value: "Quatre tailles, à partir du XS" },
        { label: "Embouts", value: "Mousse à mémoire de forme" },
        { label: "Autonomie", value: "8 heures, 30 avec le boîtier" },
        { label: "Boîtier", value: "USB-C, MagSafe, haut-parleur" },
        { label: "Indice", value: "IP54, poussière et eau" },
      ],
      cta: "En savoir plus",
    },
  },

  footer: {
    title: ["Conçu", "par", "Clémentin"],
    subtitle: "Une exploration indépendante du design produit sur le web.",
    cta: "Voir le portfolio",
    marquee: "Apple Motion · Conçu dans le détail · Apple Motion · Conçu dans le détail ·",
    colophon: "Colophon",
    tech: "Une étude personnelle sur la retenue. Ce qu'il se passe quand une photographie de produit a enfin la place de bouger.",
    typeLabel: "Typographie",
    typeValue: "Inter Tight, Inter",
    yearLabel: "Année",
    disclaimer: "Projet indépendant et non commercial. Non affilié à Apple Inc.",
    backToTop: "Haut de page",
  },

  a11y: {
    languageSwitch: "Changer de langue",
    reducedMotion: "Le mouvement réduit est activé. Les animations sont simplifiées.",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };
