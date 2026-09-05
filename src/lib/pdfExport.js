import { jsPDF } from 'jspdf'

const MARGE_GAUCHE = 18
const LARGEUR_UTILE = 210 - MARGE_GAUCHE * 2

function creerDocument(titrePage, profil) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 20

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(titrePage, MARGE_GAUCHE, y)
  y += 9

  if (profil?.nom_complet || profil?.ecole) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const entete = [profil?.nom_complet, profil?.ecole].filter(Boolean).join(' · ')
    doc.text(entete, MARGE_GAUCHE, y)
    y += 6
  }

  doc.setDrawColor(200)
  doc.line(MARGE_GAUCHE, y, 210 - MARGE_GAUCHE, y)
  y += 8

  return { doc, y }
}

function nomFichierDepuis(prefixe, titre) {
  return `${prefixe}-${(titre || 'document')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}.pdf`
}

export function exporterFichePDF(fiche, profil) {
  const { doc, y: yInitial } = creerDocument('Fiche de préparation de cours', profil)
  let y = yInitial

  const verifierPage = (espaceNecessaire) => {
    if (y + espaceNecessaire > 285) {
      doc.addPage()
      y = 20
    }
  }

  const ajouterChamp = (label, valeur) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(label, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignes = doc.splitTextToSize(valeur || '—', LARGEUR_UTILE)
    doc.text(lignes, MARGE_GAUCHE, y)
    y += lignes.length * 5 + 4
  }

  ajouterChamp('Matière', fiche.matiere)
  ajouterChamp('Cycle / Classe', `${fiche.cycle} — ${fiche.classe}`)
  ajouterChamp('Thème', fiche.titre)
  if (fiche.annee_scolaire) ajouterChamp('Année scolaire', fiche.annee_scolaire)

  const objectifsTexte = Array.isArray(fiche.objectifs)
    ? fiche.objectifs.map((o) => `•  ${o}`).join('\n')
    : fiche.objectifs
  ajouterChamp('Objectifs pédagogiques', objectifsTexte)

  verifierPage(16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Déroulement', MARGE_GAUCHE, y)
  y += 7

  const etapes = Array.isArray(fiche.deroulement) ? fiche.deroulement : []
  etapes.forEach((etape) => {
    verifierPage(18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const titreEtape = `${etape.etape || ''}${etape.duree ? '  (' + etape.duree + ')' : ''}`
    doc.text(titreEtape, MARGE_GAUCHE, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const lignes = doc.splitTextToSize(etape.activite || '', LARGEUR_UTILE)
    doc.text(lignes, MARGE_GAUCHE, y)
    y += lignes.length * 5 + 4
  })

  ajouterChamp('Matériel nécessaire', fiche.materiel)
  ajouterChamp('Évaluation', fiche.evaluation)

  doc.save(nomFichierDepuis('fiche', fiche.titre))
}

export function exporterExercicesPDF(exercice, profil) {
  const { doc, y: yInitial } = creerDocument('Exercices et devoirs', profil)
  let y = yInitial

  const verifierPage = (espaceNecessaire) => {
    if (y + espaceNecessaire > 285) {
      doc.addPage()
      y = 20
    }
  }

  const ajouterChamp = (label, valeur) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(label, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignes = doc.splitTextToSize(valeur || '—', LARGEUR_UTILE)
    doc.text(lignes, MARGE_GAUCHE, y)
    y += lignes.length * 5 + 4
  }

  ajouterChamp('Matière', exercice.matiere)
  ajouterChamp('Cycle / Classe', `${exercice.cycle} — ${exercice.classe}`)
  ajouterChamp('Titre', exercice.titre)
  if (exercice.consignes) ajouterChamp('Consignes', exercice.consignes)

  const items = Array.isArray(exercice.contenu) ? exercice.contenu : []
  items.forEach((item, index) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Exercice ${index + 1}`, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignesEnonce = doc.splitTextToSize(item.enonce || '', LARGEUR_UTILE)
    doc.text(lignesEnonce, MARGE_GAUCHE, y)
    y += lignesEnonce.length * 5 + 6
  })

  doc.addPage()
  y = 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Corrigé', MARGE_GAUCHE, y)
  y += 9

  items.forEach((item, index) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Exercice ${index + 1}`, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignesCorrige = doc.splitTextToSize(item.corrige || '', LARGEUR_UTILE)
    doc.text(lignesCorrige, MARGE_GAUCHE, y)
    y += lignesCorrige.length * 5 + 6
  })

  doc.save(nomFichierDepuis('exercices', exercice.titre))
}

export function exporterEvaluationPDF(evaluation, profil) {
  const { doc, y: yInitial } = creerDocument("Fiche d'évaluation", profil)
  let y = yInitial

  const verifierPage = (espaceNecessaire) => {
    if (y + espaceNecessaire > 285) {
      doc.addPage()
      y = 20
    }
  }

  const ajouterChamp = (label, valeur) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(label, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignes = doc.splitTextToSize(valeur || '—', LARGEUR_UTILE)
    doc.text(lignes, MARGE_GAUCHE, y)
    y += lignes.length * 5 + 4
  }

  ajouterChamp('Matière', evaluation.matiere)
  ajouterChamp('Cycle / Classe', `${evaluation.cycle} — ${evaluation.classe}`)
  ajouterChamp('Titre', evaluation.titre)
  ajouterChamp(
    'Type / Durée / Barème',
    `${evaluation.type_evaluation || ''} — ${evaluation.duree_minutes ? evaluation.duree_minutes + ' min' : ''} — ${evaluation.bareme_total || ''} points`
  )
  if (evaluation.consignes) ajouterChamp('Consignes', evaluation.consignes)

  const items = Array.isArray(evaluation.contenu) ? evaluation.contenu : []
  items.forEach((item, index) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Question ${index + 1}${item.bareme ? '  (' + item.bareme + ')' : ''}`, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignesEnonce = doc.splitTextToSize(item.enonce || '', LARGEUR_UTILE)
    doc.text(lignesEnonce, MARGE_GAUCHE, y)
    y += lignesEnonce.length * 5 + 6
  })

  doc.addPage()
  y = 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Corrigé et barème détaillé', MARGE_GAUCHE, y)
  y += 9

  items.forEach((item, index) => {
    verifierPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Question ${index + 1}${item.bareme ? '  (' + item.bareme + ')' : ''}`, MARGE_GAUCHE, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignesCorrige = doc.splitTextToSize(item.corrige || '', LARGEUR_UTILE)
    doc.text(lignesCorrige, MARGE_GAUCHE, y)
    y += lignesCorrige.length * 5 + 6
  })

  doc.save(nomFichierDepuis('evaluation', evaluation.titre))
}
