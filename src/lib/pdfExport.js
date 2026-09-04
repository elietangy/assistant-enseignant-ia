import { jsPDF } from 'jspdf'

export function exporterFichePDF(fiche, profil) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margeGauche = 18
  const largeurUtile = 210 - margeGauche * 2
  let y = 20

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
    doc.text(label, margeGauche, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lignes = doc.splitTextToSize(valeur || '—', largeurUtile)
    doc.text(lignes, margeGauche, y)
    y += lignes.length * 5 + 4
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Fiche de préparation de cours', margeGauche, y)
  y += 9

  if (profil?.nom_complet || profil?.ecole) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const entete = [profil?.nom_complet, profil?.ecole].filter(Boolean).join(' · ')
    doc.text(entete, margeGauche, y)
    y += 6
  }

  doc.setDrawColor(200)
  doc.line(margeGauche, y, 210 - margeGauche, y)
  y += 8

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
  doc.text('Déroulement', margeGauche, y)
  y += 7

  const etapes = Array.isArray(fiche.deroulement) ? fiche.deroulement : []
  etapes.forEach((etape) => {
    verifierPage(18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const titreEtape = `${etape.etape || ''}${etape.duree ? '  (' + etape.duree + ')' : ''}`
    doc.text(titreEtape, margeGauche, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const lignes = doc.splitTextToSize(etape.activite || '', largeurUtile)
    doc.text(lignes, margeGauche, y)
    y += lignes.length * 5 + 4
  })

  ajouterChamp('Matériel nécessaire', fiche.materiel)
  ajouterChamp('Évaluation', fiche.evaluation)

  const nomFichier = `fiche-${(fiche.titre || 'cours')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}.pdf`

  doc.save(nomFichier)
}
