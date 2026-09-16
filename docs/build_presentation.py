#!/usr/bin/env python3
"""Génère la synthèse PowerPoint PayRollFlow à partir de l’ensemble du brief."""

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml
from pptx.util import Emu, Inches, Pt

# 16:9
W, H = Inches(13.333), Inches(7.5)

SAGE = RGBColor(0x0F, 0x3D, 0x32)
SAGE_MID = RGBColor(0x1A, 0x5C, 0x4C)
GOLD = RGBColor(0xC4, 0xA5, 0x74)
GOLD_DK = RGBColor(0xA8, 0x86, 0x4E)
PAPER = RGBColor(0xF6, 0xF2, 0xEA)
INK = RGBColor(0x1A, 0x24, 0x21)
MUTED = RGBColor(0x5C, 0x6B, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CARD = RGBColor(0xFF, 0xFF, 0xFF)
LINE = RGBColor(0xE4, 0xDD, 0xD0)

TITLE_FONT = "Georgia"
BODY_FONT = "Calibri"


def rgb(color: RGBColor) -> str:
    return f"{color[0]:02X}{color[1]:02X}{color[2]:02X}"


def set_fill(shape, color: RGBColor) -> None:
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def set_line(shape, color: RGBColor, pt: float = 1.0) -> None:
    shape.line.color.rgb = color
    shape.line.width = Pt(pt)


def rect(slide, l, t, w, h, fill: RGBColor, line: RGBColor | None = None):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    set_fill(s, fill)
    if line:
        set_line(s, line, 0.75)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def round_rect(slide, l, t, w, h, fill: RGBColor, line: RGBColor | None = None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    set_fill(s, fill)
    if line:
        set_line(s, line, 0.75)
    else:
        s.line.fill.background()
    # milder corners
    try:
        s.adjustments[0] = 0.08
    except Exception:
        pass
    return s


def tb(slide, l, t, w, h, text, *, size=14, bold=False, color=INK, font=BODY_FONT, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return box


def add_runs(paragraph, parts):
    """parts: list of (text, size, bold, color, font)"""
    # clear existing
    paragraph.clear()
    for text, size, bold, color, font in parts:
        run = paragraph.add_run()
        run.text = text
        run.font.name = font
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = color


def footer(slide, page: int, total: int, dark=False):
    c = GOLD if dark else MUTED
    tb(slide, Inches(0.55), Inches(7.18), Inches(8), Inches(0.24), "PayRollFlow  ·  ANTARES DS  ·  Synthèse projet", size=10, color=c)
    tb(slide, Inches(11.4), Inches(7.18), Inches(1.4), Inches(0.24), f"{page}  /  {total}", size=10, color=c, align=PP_ALIGN.RIGHT)


def gold_bar(slide, l, t, w=Inches(0.55), h=Inches(0.07)):
    return rect(slide, l, t, w, h, GOLD)


def card(slide, l, t, w, h, title, body, kicker=None):
    round_rect(slide, l, t, w, h, WHITE, LINE)
    y = t + Inches(0.18)
    if kicker:
        tb(slide, l + Inches(0.22), y, w - Inches(0.4), Inches(0.22), kicker.upper(), size=10, bold=True, color=GOLD_DK, font=BODY_FONT)
        y += Inches(0.22)
    tb(slide, l + Inches(0.22), y, w - Inches(0.4), Inches(0.36), title, size=16, bold=True, color=SAGE, font=TITLE_FONT)
    tb(slide, l + Inches(0.22), y + Inches(0.38), w - Inches(0.4), h - (y - t) - Inches(0.5), body, size=13, color=MUTED)


def bullets_box(slide, l, t, w, h, items, *, size=14, color=INK):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(8)
        p.level = 0
        run = p.add_run()
        run.text = "▸  " + item
        run.font.name = BODY_FONT
        run.font.size = Pt(size)
        run.font.color.rgb = color
    return box


def new_prs():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    return prs


def blank(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def build():
    prs = new_prs()
    slides_meta = []  # filled as we go; page numbers applied at end via rebuild... we'll pass TOTAL

    TOTAL = 18

    # 1 COVER
    s = blank(prs)
    rect(s, 0, 0, W, H, SAGE)
    rect(s, 0, 0, Inches(0.18), H, GOLD)
    tb(s, Inches(0.7), Inches(1.35), Inches(11.5), Inches(0.35), "SYNTHÈSE PROJET  ·  PAIE  ·  RH  ·  CLOUD", size=13, bold=True, color=GOLD, font=BODY_FONT)
    tb(s, Inches(0.7), Inches(1.85), Inches(12), Inches(1.5), "PayRollFlow", size=54, bold=True, color=WHITE, font=TITLE_FONT)
    tb(s, Inches(0.7), Inches(3.35), Inches(11.2), Inches(1.1),
       "Plateforme de paie française, assistant RH ancré dans les données,\nhébergement Oracle Cloud et monitoring sur instance.",
       size=20, color=RGBColor(0xD7, 0xE6, 0xE0), font=BODY_FONT)
    gold_bar(s, Inches(0.7), Inches(4.65), Inches(1.1))
    tb(s, Inches(0.7), Inches(4.9), Inches(10), Inches(0.8),
       "ANTARES DS   ·   bulletin officiel A4   ·   console admin & espace collaborateur\nPas d’inscription en ligne  ·  comptes créés par le RH / Oracle Cloud",
       size=14, color=RGBColor(0xC9, 0xD8, 0xD3))
    tb(s, Inches(0.7), Inches(6.55), Inches(10), Inches(0.35), "Document de restitution  —  ensemble du brief partagé", size=12, color=GOLD)
    footer(s, 1, TOTAL, dark=True)

    # 2 SOMMAIRE
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "SOMMAIRE", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.55), "Ce que couvre ce document", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.25))
    cols = [
        ("01", "Intention", "Brief métier, concurrence, bulletin Cerfa, deux rôles, pas d’inscription."),
        ("02", "Produit", "Assistant RH, KPI, simulateur, contrats, attestations, paie, portail."),
        ("03", "Technique", "Microservices, stack visuelle, auth, sécurité, données démo."),
        ("04", "Cloud", "Instance OCI existante, comptes/groupes/rôles, SQL, ELK, Prometheus, Grafana, CI/CD."),
    ]
    for i, (n, t, b) in enumerate(cols):
        x = Inches(0.55) + i * Inches(3.15)
        round_rect(s, x, Inches(1.7), Inches(2.98), Inches(4.7), WHITE, LINE)
        tb(s, x + Inches(0.22), Inches(1.95), Inches(2.5), Inches(0.4), n, size=22, bold=True, color=GOLD, font=TITLE_FONT)
        tb(s, x + Inches(0.22), Inches(2.5), Inches(2.55), Inches(0.8), t, size=20, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.22), Inches(3.4), Inches(2.55), Inches(2.6), b, size=14, color=MUTED)
    footer(s, 2, TOTAL)

    # 3 INTENTION
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "01  —  INTENTION", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.55), "Le brief, tel qu’il a été posé", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.25))
    items = [
        ("Paie française réelle", "Partir des rapports Word et d’un bulletin officiel PDF (matricule 1212, août 2026) pour une app utilisable, pas une démo cosmétique."),
        ("Deux publics, zéro self-signup", "Console RH / admin et espace collaborateur. Les comptes sont créés par le service RH — jamais d’inscription en ligne."),
        ("Tenir face au marché", "KPI, simulateur, contrats, attestations, calendrier, QR, audit… et un assistant RH comme différenciateur (données réelles, pas d’invention)."),
        ("Exploiter Oracle Cloud", "Héberger sur l’instance Compute déjà créée (VCN déjà là). Créer des comptes, groupes et rôles dans le compte Oracle. Monitorer sur la machine (ELK, Prometheus, Grafana)."),
    ]
    for i, (t, b) in enumerate(items):
        y = Inches(1.55) + i * Inches(1.25)
        round_rect(s, Inches(0.55), y, Inches(12.2), Inches(1.15), WHITE, LINE)
        rect(s, Inches(0.55), y, Inches(0.12), Inches(1.15), GOLD)
        tb(s, Inches(0.95), y + Inches(0.16), Inches(11.5), Inches(0.32), t, size=16, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, Inches(0.95), y + Inches(0.5), Inches(11.5), Inches(0.5), b, size=14, color=MUTED)
    footer(s, 3, TOTAL)

    # 4 PRODUIT EN UNE PAGE
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  PRODUIT", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "PayRollFlow en une page", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    tb(s, Inches(0.6), Inches(1.45), Inches(12), Inches(0.45),
       "Application de gestion de paie pour ANTARES DS : bulletins A4 identiques au Cerfa, cycles de paie, RH du quotidien, portail salarié.",
       size=15, color=MUTED)
    blocks = [
        ("Console admin", "/admin", "Pilotage, employés, cycles, calcul, réseau, congés, acomptes, dossiers, attestations, paramètres, assistant."),
        ("Espace collaborateur", "/espace", "Dernier net, bulletins, congés, historique, acomptes, dossier RH, attestations, profil, assistant."),
        ("Cœur paie", "A4 + QR", "URSSAF, CSG, PAS, Fillon, tickets repas, cumuls, versions de bulletins conservées, export virement CSV."),
        ("Cœur RH", "Vie du contrat", "Congés / RTT, calendrier, alertes de fin de contrat, attestations de travail et certificats de salaire."),
    ]
    for i, (t, k, b) in enumerate(blocks):
        x = Inches(0.55) + (i % 2) * Inches(6.35)
        y = Inches(2.05) + (i // 2) * Inches(2.25)
        round_rect(s, x, y, Inches(6.15), Inches(2.08), WHITE, LINE)
        tb(s, x + Inches(0.28), y + Inches(0.22), Inches(5.6), Inches(0.22), k.upper(), size=11, bold=True, color=GOLD_DK)
        tb(s, x + Inches(0.28), y + Inches(0.48), Inches(5.6), Inches(0.4), t, size=18, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.28), y + Inches(1.0), Inches(5.6), Inches(0.85), b, size=14, color=MUTED)
    footer(s, 4, TOTAL)

    # 5 DEUX RÔLES
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  PRODUIT", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Deux portes d’entrée, un seul référentiel", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))

    round_rect(s, Inches(0.55), Inches(1.6), Inches(6.0), Inches(5.15), SAGE)
    tb(s, Inches(0.85), Inches(1.85), Inches(5.4), Inches(0.25), "ADMINISTRATEUR  ·  NADIA KONÉ", size=11, bold=True, color=GOLD)
    tb(s, Inches(0.85), Inches(2.2), Inches(5.4), Inches(0.5), "Pilotage de la masse salariale", size=22, bold=True, color=WHITE, font=TITLE_FONT)
    bullets_box(s, Inches(0.85), Inches(2.85), Inches(5.4), Inches(3.5), [
        "KPI, alertes, anomalies, prévision 3 mois",
        "Calcul pas à pas + simulateur hausse / prime",
        "Validation des cycles : brouillon → payé",
        "Réseau : internes, clients, freelances, factures",
        "Décisions congés / acomptes, journal d’audit",
    ], size=15, color=RGBColor(0xD7, 0xE6, 0xE0))

    round_rect(s, Inches(6.8), Inches(1.6), Inches(6.0), Inches(5.15), WHITE, LINE)
    tb(s, Inches(7.1), Inches(1.85), Inches(5.4), Inches(0.25), "COLLABORATEUR  ·  YAO LASSIDAN", size=11, bold=True, color=GOLD_DK)
    tb(s, Inches(7.1), Inches(2.2), Inches(5.4), Inches(0.5), "Espace personnel nominatif", size=22, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(7.1), Inches(2.85), Inches(5.4), Inches(3.5), [
        "Dernier net à payer et soldes de congés",
        "Bulletins A4, impression, QR de contrôle",
        "Demandes CP / RTT + calendrier + historique",
        "Acomptes, dossier (CNI, RIB, contrat, Vitale)",
        "Attestations de travail et de salaire",
    ], size=15, color=MUTED)
    footer(s, 5, TOTAL)

    # 6 ASSISTANT
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  LEVIER", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "L’assistant RH, vrai différenciateur", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    tb(s, Inches(0.6), Inches(1.45), Inches(12.1), Inches(0.55),
       "Il répond avec les soldes, le bulletin et les contrats. Pas de LLM, pas d’hallucination : si la donnée n’est pas dans PayRollFlow, il le dit.",
       size=16, color=MUTED)

    round_rect(s, Inches(0.55), Inches(2.15), Inches(7.9), Inches(4.55), WHITE, LINE)
    tb(s, Inches(0.85), Inches(2.35), Inches(7.4), Inches(0.3), "EXEMPLES DÉJÀ TESTÉS", size=11, bold=True, color=GOLD_DK)
    examples = [
        ("« Combien de jours de congés me reste-t-il ? »", "Yao : 25 j de CP restants, 10 j de RTT."),
        ("« Comment est calculé mon salaire ? »", "Brut 827,23 €  →  net 704,88 €  (bulletin officiel inchangé)."),
        ("« Quelle est la masse salariale ? »", "Côté admin : dernier cycle calculé, coût employeur."),
        ("« Quels contrats expirent ? »", "Alerte CDD Camille Roux, fin au 31/10/2026."),
    ]
    for i, (q, a) in enumerate(examples):
        y = Inches(2.75) + i * Inches(0.9)
        tb(s, Inches(0.85), y, Inches(7.4), Inches(0.32), q, size=14, bold=True, color=SAGE)
        tb(s, Inches(0.85), y + Inches(0.32), Inches(7.4), Inches(0.4), a, size=13, color=MUTED)

    round_rect(s, Inches(8.65), Inches(2.15), Inches(4.15), Inches(4.55), SAGE)
    tb(s, Inches(8.9), Inches(2.4), Inches(3.7), Inches(0.3), "OÙ LE TROUVER", size=11, bold=True, color=GOLD)
    tb(s, Inches(8.9), Inches(2.85), Inches(3.7), Inches(3.5),
       "Bulle en bas à droite\npartout dans l’app.\n\nPages dédiées :\n/admin/assistant\n/espace/assistant\n\nCitations vers congés,\nbulletin, contrats.\nSuggestions selon le rôle.",
       size=15, color=RGBColor(0xD7, 0xE6, 0xE0))
    footer(s, 6, TOTAL)

    # 7 BULLETIN
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  PAIE OFFICIELLE", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Le bulletin, à l’identique du PDF", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))

    facts = [
        ("Société", "ANTARES DS"),
        ("Matricule", "1212"),
        ("Période", "01/08/26 – 31/08/26"),
        ("Net à payer", "704,88 €"),
        ("Source", "PDF 1212_20260831"),
        ("Support", "A4 impression / PDF + QR"),
    ]
    for i, (k, v) in enumerate(facts):
        x = Inches(0.55) + (i % 3) * Inches(4.2)
        y = Inches(1.55) + (i // 3) * Inches(1.35)
        round_rect(s, x, y, Inches(4.0), Inches(1.2), WHITE, LINE)
        tb(s, x + Inches(0.22), y + Inches(0.18), Inches(3.55), Inches(0.25), k.upper(), size=11, bold=True, color=GOLD_DK)
        tb(s, x + Inches(0.22), y + Inches(0.48), Inches(3.55), Inches(0.5), v, size=20, bold=True, color=SAGE, font=TITLE_FONT)

    round_rect(s, Inches(0.55), Inches(4.4), Inches(12.2), Inches(2.3), WHITE, LINE)
    tb(s, Inches(0.85), Inches(4.58), Inches(11.7), Inches(0.3), "STRUCTURE REPRISE DU BULLETIN FRANÇAIS", size=11, bold=True, color=GOLD_DK)
    tb(s, Inches(0.85), Inches(4.95), Inches(11.7), Inches(1.5),
       "En-tête période / paiement / matricule / ancienneté. Employeur : adresse, SIRET, APE, convention, coef, horaire.\n"
       "Salarié : civilité, n° sécu, emploi, catégorie. Colonnes Désignation / Nombre / Base / Taux / Gain / Retenue / Part employeur.\n"
       "Blocs SANTÉ, RETRAITE, famille, chômage, CSG, allègement Fillon, indemnités repas, compteurs de congés, PAS, cumuls.",
       size=15, color=MUTED)
    footer(s, 7, TOTAL)

    # 8 PILOTAGE
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  PILOTAGE", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "KPI recalculés à chaque cycle", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    kpis = [
        ("Effectif actif", "dont collaborateurs en congé"),
        ("Masse salariale", "coût employeur du cycle"),
        ("Coût moyen / salarié", "net moyen en vis-à-vis"),
        ("Absentéisme", "et validations RH en attente"),
        ("Hommes / femmes", "répartition de l’effectif"),
        ("Types de contrats", "CDI, CDD, stage, alternance"),
        ("Prévision 3 mois", "projection de masse"),
        ("Export CSV", "pilotage + fichier de virement"),
    ]
    for i, (t, b) in enumerate(kpis):
        x = Inches(0.55) + (i % 4) * Inches(3.15)
        y = Inches(1.6) + (i // 4) * Inches(2.4)
        round_rect(s, x, y, Inches(3.0), Inches(2.2), WHITE, LINE)
        rect(s, x, y, Inches(3.0), Inches(0.08), GOLD)
        tb(s, x + Inches(0.2), y + Inches(0.4), Inches(2.6), Inches(0.9), t, size=18, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.2), y + Inches(1.35), Inches(2.6), Inches(0.55), b, size=13, color=MUTED)
    footer(s, 8, TOTAL)

    # 9 PAIE + RH
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  PAIE & RH", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Du cycle de paie au dossier du salarié", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    left = [
        "Cycle : brouillon → calcul → validation → paiement",
        "Anciennes versions de bulletins conservées",
        "Simulateur : hausse % + prime, écart de charges",
        "Calcul pas à pas (bases, taux, Fillon, PAS)",
        "Plafond d’acompte (ratio paramétrable, 30 %)",
        "Export CSV de virement",
    ]
    right = [
        "Congés CP / RTT / maladie / sans solde",
        "Calendrier partagé, impact sur les jours du cycle",
        "Alertes de fin de contrat (CDD Camille Roux)",
        "Attestation de travail + certificat de salaire",
        "Dossier : CNI, RIB, contrat, Vitale",
        "Notifications in-app + journal d’audit",
    ]
    round_rect(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(5.15), WHITE, LINE)
    tb(s, Inches(0.85), Inches(1.78), Inches(5.5), Inches(0.4), "Paie", size=22, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(0.85), Inches(2.35), Inches(5.4), Inches(4.0), left, size=15)
    round_rect(s, Inches(6.8), Inches(1.55), Inches(6.0), Inches(5.15), WHITE, LINE)
    tb(s, Inches(7.1), Inches(1.78), Inches(5.5), Inches(0.4), "RH & portail", size=22, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(7.1), Inches(2.35), Inches(5.4), Inches(4.0), right, size=15)
    footer(s, 9, TOTAL)

    # 10 RESEAU
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "02  —  RÉSEAU", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Au-delà du bulletin : qui travaille avec qui", size=26, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    tb(s, Inches(0.6), Inches(1.5), Inches(12), Inches(0.5),
       "Écran Réseau & factures : salariés internes, clients internes, entreprises facturées, freelances, intérim, portage.",
       size=15, color=MUTED)
    tags = [
        ("Interne", "Salariés PayRollFlow, clients internes"),
        ("Externe", "Entreprises facturées, SIRET, contact"),
        ("Partenaires", "Freelance, auto-entrepreneur, intérim, portage, stagiaire"),
        ("Factures", "À recevoir / à payer, HT + TVA, brouillon → payée"),
    ]
    for i, (t, b) in enumerate(tags):
        x = Inches(0.55) + i * Inches(3.15)
        round_rect(s, x, Inches(2.2), Inches(3.0), Inches(4.35), WHITE, LINE)
        rect(s, x, Inches(2.2), Inches(3.0), Inches(0.1), GOLD)
        tb(s, x + Inches(0.22), Inches(2.55), Inches(2.55), Inches(1.0), t, size=20, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.22), Inches(3.6), Inches(2.55), Inches(2.4), b, size=15, color=MUTED)
    footer(s, 10, TOTAL)

    # 11 ARCHITECTURE
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "03  —  TECHNIQUE", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Architecture microservices", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))

    layers = [
        ("Navigateur", "Vite + React  :45217", "Interface admin / espace, proxy /api"),
        ("Passerelle", "Express  :45218", "Routage, cookies, santé des services"),
        ("Auth", ":45231", "Login local ou Supabase, JWT cookie"),
        ("RH", ":45232", "Employés, départements, réseau, profil"),
        ("Paie", ":45233", "Cycles, bulletins, acomptes, KPI, assistant"),
        ("Temps", ":45234", "Congés, dossiers, notifications, audit"),
    ]
    for i, (t, k, b) in enumerate(layers):
        x = Inches(0.45) + i * Inches(2.12)
        round_rect(s, x, Inches(1.6), Inches(2.02), Inches(3.55), SAGE if i < 2 else WHITE, None if i < 2 else LINE)
        tc, bc = (WHITE, RGBColor(0xD7, 0xE6, 0xE0)) if i < 2 else (SAGE, MUTED)
        tb(s, x + Inches(0.12), Inches(1.8), Inches(1.78), Inches(0.7), t, size=15, bold=True, color=GOLD if i < 2 else GOLD_DK, font=TITLE_FONT)
        tb(s, x + Inches(0.12), Inches(2.55), Inches(1.78), Inches(0.7), k, size=12, bold=True, color=tc)
        tb(s, x + Inches(0.12), Inches(3.35), Inches(1.78), Inches(1.5), b, size=13, color=bc)

    round_rect(s, Inches(0.55), Inches(5.35), Inches(12.2), Inches(1.35), WHITE, LINE)
    tb(s, Inches(0.85), Inches(5.5), Inches(11.7), Inches(1.05),
       "Données : JSON partagé (store.json) avec verrou de fichier entre services. Docker Compose : 6 images. Node 22, Express 5, Zod.\n"
       "Frontend : React 19, TypeScript, Tailwind, shadcn/ui, React Router, Framer Motion. Pas de Next.js.",
       size=15, color=MUTED)
    footer(s, 11, TOTAL)

    # 12 STACK VISUELLE + AUTH
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "03  —  EXPÉRIENCE & ACCÈS", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Rendu soigné, accès nominatif", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))

    vis = [("shadcn/ui", "Composants"), ("Lucide", "Icônes"), ("Unsplash", "Photos"), ("Simple Icons", "Logos tech"), ("Framer Motion", "Animations"), ("CSS aurora", "Fonds")]
    for i, (t, b) in enumerate(vis):
        x = Inches(0.55) + (i % 6) * Inches(2.1)
        round_rect(s, x, Inches(1.55), Inches(1.98), Inches(1.35), WHITE, LINE)
        tb(s, x + Inches(0.12), Inches(1.7), Inches(1.75), Inches(0.55), t, size=13, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.12), Inches(2.3), Inches(1.75), Inches(0.4), b, size=12, color=MUTED)

    round_rect(s, Inches(0.55), Inches(3.15), Inches(6.0), Inches(3.55), WHITE, LINE)
    tb(s, Inches(0.85), Inches(3.35), Inches(5.5), Inches(0.4), "Authentification", size=18, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(0.85), Inches(3.85), Inches(5.4), Inches(2.6), [
        "Pas d’inscription : le RH crée le compte",
        "Supabase Auth si configuré, sinon login local",
        "Session = cookie httpOnly payrollflow_token",
        "Admin vs employé selon la fiche, pas un signup",
    ], size=14)

    round_rect(s, Inches(6.8), Inches(3.15), Inches(6.0), Inches(3.55), WHITE, LINE)
    tb(s, Inches(7.1), Inches(3.35), Inches(5.5), Inches(0.4), "Comptes de démonstration", size=18, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(7.1), Inches(3.85), Inches(5.4), Inches(2.6), [
        "admin@payrollflow.demo  /  AdminHorizon2026!",
        "yao.lassidan@payrollflow.demo  /  Horizon2026!",
        "Autres salariés : Horizon2026!",
        "Jeu : ANTARES DS, cycles juillet / août 2026",
    ], size=14)
    footer(s, 12, TOTAL)

    # 13 SECURITE
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "03  —  SÉCURITÉ", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Garde-fous demandés et en place", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))
    secs = [
        ("JWT_SECRET", "Obligatoire en production (≥ 16 caractères). Secret de dev interdit d’exposer."),
        ("Cookie httpOnly", "Pas de jeton dans localStorage. SameSite Lax, Secure en prod. 12 h."),
        ("Rate limit", "5 échecs de login / 15 min (IP + email) → HTTP 429."),
        ("Plafond d’acompte", "Ratio société (30 % par défaut) pour limiter le risque de trop-perçu."),
        ("Verrou store.json", "Lock fichier entre microservices, écriture atomique."),
        ("CSV maîtrisé", "Import employés borné, export virement côté admin authentifié."),
    ]
    for i, (t, b) in enumerate(secs):
        x = Inches(0.55) + (i % 3) * Inches(4.2)
        y = Inches(1.55) + (i // 3) * Inches(2.5)
        round_rect(s, x, y, Inches(4.0), Inches(2.3), WHITE, LINE)
        tb(s, x + Inches(0.25), y + Inches(0.28), Inches(3.5), Inches(0.5), t, size=16, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.25), y + Inches(0.9), Inches(3.5), Inches(1.1), b, size=14, color=MUTED)
    footer(s, 13, TOTAL)

    # 14 ORACLE HOSTING
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "04  —  ORACLE CLOUD", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.55), "Héberger l’app sur l’instance déjà créée", size=26, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.28))
    tb(s, Inches(0.6), Inches(1.5), Inches(12.1), Inches(0.5),
       "Le compte Oracle Cloud existe. L’instance Compute et le VCN / VNet aussi : on ne les recrée pas, on s’en sert.",
       size=15, color=MUTED)

    boxes = [
        ("Déjà en place", "Instance Compute\nVCN / sous-réseaux\nCompte tenancy Oracle"),
        ("À poser sur la VM", "PayRollFlow (Docker)\nService SQL (PostgreSQL)\nReverse proxy / ports NSG"),
        ("Identité tenancy", "Users dans Oracle Cloud\nGroupes + rôles\nConnexion à l’application"),
        ("Observabilité VM", "Prometheus + Grafana\nELK (Elastic, Filebeat, Kibana)\nPas les alarmes cloud OCI"),
    ]
    for i, (t, b) in enumerate(boxes):
        x = Inches(0.55) + i * Inches(3.15)
        round_rect(s, x, Inches(2.15), Inches(3.0), Inches(4.45), SAGE if i == 0 else WHITE, None if i == 0 else LINE)
        tb(s, x + Inches(0.2), Inches(2.4), Inches(2.6), Inches(0.9), t, size=16, bold=True, color=GOLD if i == 0 else SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.2), Inches(3.4), Inches(2.6), Inches(2.8), b, size=15, color=RGBColor(0xD7, 0xE6, 0xE0) if i == 0 else MUTED)
    footer(s, 14, TOTAL)

    # 15 IAM
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "04  —  IDENTITÉ ORACLE", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.55), "Créer des comptes, attribuer groupes et rôles", size=26, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.28))
    tb(s, Inches(0.6), Inches(1.5), Inches(12.1), Inches(0.55),
       "Dans le compte Oracle : Identity → Users / Groups. Ces comptes sont ceux qui se connectent à PayRollFlow.",
       size=15, color=MUTED)

    round_rect(s, Inches(0.55), Inches(2.2), Inches(6.0), Inches(4.4), WHITE, LINE)
    tb(s, Inches(0.85), Inches(2.4), Inches(5.5), Inches(0.4), "Groupe Oracle", size=14, bold=True, color=GOLD_DK)
    tb(s, Inches(0.85), Inches(2.85), Inches(5.5), Inches(0.45), "PayRollFlow_Admin", size=22, bold=True, color=SAGE, font=TITLE_FONT)
    tb(s, Inches(0.85), Inches(3.45), Inches(5.5), Inches(2.7),
       "Rôle applicatif : administrateur.\nAccès console /admin, cycles, RH, réseau, paramètres.\nSi l’email n’existe pas encore côté paie, un admin peut être provisionné.",
       size=15, color=MUTED)

    round_rect(s, Inches(6.8), Inches(2.2), Inches(6.0), Inches(4.4), WHITE, LINE)
    tb(s, Inches(7.1), Inches(2.4), Inches(5.5), Inches(0.4), "Groupe Oracle", size=14, bold=True, color=GOLD_DK)
    tb(s, Inches(7.1), Inches(2.85), Inches(5.5), Inches(0.45), "PayRollFlow_Employee", size=22, bold=True, color=SAGE, font=TITLE_FONT)
    tb(s, Inches(7.1), Inches(3.45), Inches(5.5), Inches(2.7),
       "Rôle applicatif : collaborateur.\nAccès /espace uniquement.\nL’email doit correspondre à une fiche salarié PayRollFlow.",
       size=15, color=MUTED)
    footer(s, 15, TOTAL)

    # 16 MONITORING + CICD
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "04  —  RUN", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Monitoring sur l’instance, CI/CD vers la VM", size=26, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.25))

    mons = [
        ("Prometheus", "Métriques /metrics des microservices, cAdvisor, node-exporter, PostgreSQL."),
        ("Grafana", "Tableaux de bord : latence, erreurs, CPU. Port dédié sur la VM (ex. 45300)."),
        ("ELK", "Elasticsearch + Filebeat + Kibana. Logs JSON Docker de l’app, sur la machine."),
        ("SQL", "PostgreSQL sur l’instance : identité, audit de connexion, heartbeat. La paie reste dans le store applicatif."),
    ]
    for i, (t, b) in enumerate(mons):
        x = Inches(0.55) + (i % 2) * Inches(6.35)
        y = Inches(1.55) + (i // 2) * Inches(1.7)
        round_rect(s, x, y, Inches(6.15), Inches(1.55), WHITE, LINE)
        tb(s, x + Inches(0.25), y + Inches(0.18), Inches(5.65), Inches(0.35), t, size=16, bold=True, color=SAGE, font=TITLE_FONT)
        tb(s, x + Inches(0.25), y + Inches(0.58), Inches(5.65), Inches(0.75), b, size=13, color=MUTED)

    round_rect(s, Inches(0.55), Inches(5.1), Inches(12.2), Inches(1.6), SAGE)
    tb(s, Inches(0.85), Inches(5.28), Inches(11.6), Inches(0.3), "CI / CD", size=14, bold=True, color=GOLD)
    tb(s, Inches(0.85), Inches(5.62), Inches(11.6), Inches(0.85),
       "CI : typecheck frontend + backend à chaque push.  CD : git pull + docker compose sur l’instance existante (SSH), sans créer de VM ni de VCN.\n"
       "Commande type : docker compose -f docker-compose.yml -f docker-compose.obs.yml up -d --build",
       size=14, color=RGBColor(0xD7, 0xE6, 0xE0))
    footer(s, 16, TOTAL)

    # 17 ETAT / ROADMAP
    s = blank(prs)
    rect(s, 0, 0, W, H, PAPER)
    tb(s, Inches(0.6), Inches(0.35), Inches(10), Inches(0.3), "RESTITUTION", size=12, bold=True, color=GOLD_DK)
    tb(s, Inches(0.6), Inches(0.65), Inches(12), Inches(0.5), "Où on en est, ce qui reste", size=28, bold=True, color=SAGE, font=TITLE_FONT)
    gold_bar(s, Inches(0.6), Inches(1.22))

    round_rect(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(5.15), WHITE, LINE)
    tb(s, Inches(0.85), Inches(1.75), Inches(5.5), Inches(0.4), "Livré dans l’application", size=18, bold=True, color=SAGE, font=TITLE_FONT)
    bullets_box(s, Inches(0.85), Inches(2.3), Inches(5.4), Inches(4.1), [
        "Bulletins officiels (Yao 704,88 €)",
        "Assistant RH ancré dans les données",
        "KPI, simulateur, contrats, attestations",
        "Congés, acomptes, réseau, audit",
        "Auth admin/employé, cookie, rate limit",
        "Docker local, README, comptes démo",
    ], size=15)

    round_rect(s, Inches(6.8), Inches(1.55), Inches(6.0), Inches(5.15), SAGE)
    tb(s, Inches(7.1), Inches(1.75), Inches(5.5), Inches(0.4), "À brancher sur Oracle Cloud", size=18, bold=True, color=GOLD, font=TITLE_FONT)
    bullets_box(s, Inches(7.1), Inches(2.3), Inches(5.4), Inches(4.1), [
        "Déployer Compose sur l’instance existante",
        "Ouvrir les ports NSG (app + monitoring)",
        "Créer users / groupes / rôles dans OCI",
        "Brancher OIDC Identity Domain → login app",
        "Allumer PostgreSQL + ELK + Grafana sur la VM",
        "Activer le CD SSH (OCI_SSH_HOST)",
    ], size=15, color=RGBColor(0xD7, 0xE6, 0xE0))
    footer(s, 17, TOTAL)

    # 18 CLOSE
    s = blank(prs)
    rect(s, 0, 0, W, H, SAGE)
    rect(s, 0, 0, Inches(0.18), H, GOLD)
    tb(s, Inches(0.7), Inches(1.7), Inches(11.5), Inches(0.3), "EN UNE PHRASE", size=13, bold=True, color=GOLD)
    tb(s, Inches(0.7), Inches(2.15), Inches(12), Inches(2.2),
       "PayRollFlow est la paie ANTARES DS,\navec un assistant qui dit vrai,\nprête à vivre sur votre instance Oracle Cloud.",
       size=28, bold=True, color=WHITE, font=TITLE_FONT)
    gold_bar(s, Inches(0.7), Inches(4.6), Inches(1.1))
    tb(s, Inches(0.7), Inches(4.9), Inches(11.5), Inches(1.2),
       "Produit : console RH + espace collaborateur + bulletin Cerfa.\n"
       "Levier : assistant, KPI, simulateur, contrats, attestations.\n"
       "Run : instance existante, comptes Oracle, ELK / Prometheus / Grafana.",
       size=16, color=RGBColor(0xD7, 0xE6, 0xE0))
    tb(s, Inches(0.7), Inches(6.5), Inches(11), Inches(0.3), "PayRollFlow  ·  ANTARES DS", size=12, color=GOLD)
    footer(s, 18, TOTAL, dark=True)

    out = "/workspace/docs/PayRollFlow-synthese.pptx"
    prs.save(out)
    print(out)


if __name__ == "__main__":
    build()
