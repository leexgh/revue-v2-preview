#!/usr/bin/env python3
"""Build a reVUE v2 preview bundle from today's reVUE-data v1 JSON.

This is a stand-in for `revue.py build` described in the v2 design plan. It reads
the current `generated/VUEs.json` (the real curated data) and produces the
event-based v2 bundle the redesigned website consumes.

Everything that exists in the v1 data is carried over unchanged. Everything the
v2 model adds but the v1 data cannot supply (evidence detail, GRCh38
coordinates, per-tumour-type OncoKB levels, reference metadata that cannot be
fetched) is filled with clearly flagged placeholder values: each record lists
the fields that are placeholders in `placeholders`, and the UI labels them.

Usage:
    python3 scripts/build_v2_bundle.py [--revue-data ../reVUE-data] [--offline]
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import collections
from collections import OrderedDict, defaultdict

RELEASE = "v2.0.0-preview.1"
SCHEMA_VERSION = 1

ONCOTREE_API = "https://oncotree.mskcc.org/api/tumorTypes"
PUBMED_API = ("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
              "?db=pubmed&retmode=json&id=")

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT_PATH = os.path.join(REPO, "src", "data", "revue.v2.json")
CACHE_DIR = os.path.join(HERE, ".cache")


# --------------------------------------------------------------------------
# network helpers (cached, so a rebuild works offline)
# --------------------------------------------------------------------------

def fetch_json(url, cache_key, offline=False, token=None):
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, cache_key)
    if os.path.exists(cache_path):
        with open(cache_path) as handle:
            return json.load(handle)
    if offline:
        return None
    try:
        # Ensembl REST returns XML unless JSON is explicitly requested.
        headers = {"User-Agent": "revue-build/1.0",
                   "Accept": "application/json",
                   "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer %s" % token
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.load(response)
    except (urllib.error.URLError, ValueError, TimeoutError) as error:
        print("  ! fetch failed for %s (%s)" % (cache_key, error), file=sys.stderr)
        return None
    with open(cache_path, "w") as handle:
        json.dump(payload, handle)
    return payload


# --------------------------------------------------------------------------
# OncoTree
# --------------------------------------------------------------------------

# Cohort cancer type names are cBioPortal display names, which are not always
# OncoTree node names. Confident mappings first; approximate ones are flagged.
COHORT_NAME_TO_CODE = {
    "Ampullary Cancer": ("AMPCA", "approximate"),
    "Anal Cancer": ("ANSC", "approximate"),
    "Appendiceal Cancer": ("APAD", "approximate"),
    "Bladder Cancer": ("BLADDER", "exact"),
    "Bone Cancer": ("BONE", "exact"),
    "Breast Cancer": ("BREAST", "exact"),
    "CNS Cancer": ("BRAIN", "exact"),
    "Cervical Cancer": ("CERVIX", "exact"),
    "Colorectal Cancer": ("COADREAD", "exact"),
    "Endometrial Cancer": ("UCEC", "exact"),
    "Esophagogastric Cancer": ("EGC", "approximate"),
    "Gastrointestinal Neuroendocrine Tumor": ("GINET", "exact"),
    "Glioma": ("DIFG", "approximate"),
    "Head and Neck Cancer": ("HEAD_NECK", "exact"),
    "Hepatobiliary Cancer": ("LIVER", "approximate"),
    "Histiocytosis": ("HDCN", "approximate"),
    "Leukemia": ("MYELOID", "approximate"),
    "Mesothelioma": ("PLMESO", "approximate"),
    "Other Cancer": ("OTHER", "exact"),
    "Ovarian Cancer": ("OVARY", "exact"),
    "Pancreatic Cancer": ("PANCREAS", "exact"),
    "Penile Cancer": ("PENIS", "exact"),
    "Peritoneal Cancer, NOS": ("PERITONEUM", "exact"),
    "Prostate Cancer": ("PROSTATE", "exact"),
    "Salivary Gland Cancer": ("SACA", "approximate"),
    "Skin Cancer, Non-Melanoma": ("SKIN", "approximate"),
    "Soft Tissue Sarcoma": ("SOFT_TISSUE", "approximate"),
    "Thyroid Cancer": ("THYROID", "exact"),
    "Uterine Sarcoma": ("USARC", "exact"),
    "Vaginal Cancer": ("VULVA", "approximate"),
    "Wilms Tumor": ("WT", "exact"),
}

PANCAN = {
    "code": "PANCAN",
    "name": "Many cancer types",
    "mainType": "Many cancer types",
    "tissue": None,
    "level": 0,
    "parent": None,
    "sentinel": True,
}


class OncoTree(object):
    def __init__(self, nodes):
        self.by_code = {}
        self.by_name = {}
        for node in nodes or []:
            self.by_code[node["code"]] = node
            self.by_name.setdefault(node["name"], node)
        self.used = OrderedDict()

    def resolve_cohort_name(self, name):
        """Map a cohort display name to (code, name, confidence, mapped)."""
        if name in self.by_name:
            node = self.by_name[name]
            return node["code"], node["name"], "exact", True
        if name in COHORT_NAME_TO_CODE:
            code, confidence = COHORT_NAME_TO_CODE[name]
            node = self.by_code.get(code)
            if node:
                return code, node["name"], confidence, True
        pseudo = "X_" + re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")
        return pseudo, name, "unmapped", False

    def register(self, code, name, mapped=True):
        if code in self.used:
            return self.used[code]
        node = self.by_code.get(code)
        entry = {
            "code": code,
            "name": (node or {}).get("name", name),
            "mainType": (node or {}).get("mainType"),
            "tissue": (node or {}).get("tissue"),
            "level": (node or {}).get("level"),
            "parent": (node or {}).get("parent"),
            "color": (node or {}).get("color"),
            "inOncoTree": bool(node),
        }
        if not mapped:
            entry["inOncoTree"] = False
        self.used[code] = entry
        return entry

    def ancestors(self, code):
        """Broader OncoTree codes, from immediate parent upwards."""
        out = []
        node = self.by_code.get(code)
        seen = set()
        while node and node.get("parent") and node["parent"] not in seen:
            seen.add(node["parent"])
            parent = self.by_code.get(node["parent"])
            if not parent:
                break
            out.append(parent["code"])
            node = parent
        return out


ENSEMBL_API = "https://grch37.rest.ensembl.org/lookup/id/%s?expand=1"


def exon_structure(transcript_id, offline):
    """Exons in transcript order (5' -> 3') for a GRCh37 transcript."""
    if not transcript_id:
        return None
    payload = fetch_json(ENSEMBL_API % transcript_id,
                         "ensembl-%s.json" % transcript_id, offline)
    if not payload or not payload.get("Exon"):
        return None
    strand = payload.get("strand", 1)
    exons = sorted(payload["Exon"], key=lambda e: e["start"], reverse=strand < 0)
    return dict(strand=strand,
                exons=[(i + 1, e["start"], e["end"]) for i, e in enumerate(exons)])


def nearest_exon(structure, start, end):
    """Rank of the exon a position sits in or nearest to, and the distance."""
    if not structure:
        return None, None
    best = None
    for pos in (start, end):
        for rank, lo, hi in structure["exons"]:
            d = 0 if lo <= pos <= hi else min(abs(pos - lo), abs(pos - hi))
            if best is None or d < best[1]:
                best = (rank, d)
    return best


ONCOKB_API = ("https://www.oncokb.org/api/v1/annotate/mutations/byProteinChange"
              "?hugoSymbol=%s&alteration=%s&referenceGenome=GRCh37")


def oncokb_lookup(gene, alteration, token, offline):
    """Current OncoKB call for one gene + protein change.

    Needs an OncoKB API token: every data endpoint rejects anonymous requests.
    Returns None when no token is available, so the caller falls back to the
    level stored in reVUE-data.
    """
    if not token or not alteration:
        return None
    alteration = alteration[2:] if alteration.startswith("p.") else alteration
    cache_key = "oncokb-%s-%s.json" % (
        gene, re.sub(r"[^A-Za-z0-9_.*+-]", "_", alteration))
    payload = fetch_json(ONCOKB_API % (gene, urllib.parse.quote(alteration)),
                         cache_key, offline, token)
    if payload is None:
        return None
    treatments = []
    for treatment in payload.get("treatments") or []:
        treatments.append({
            "level": treatment.get("level"),
            "drugs": [drug.get("drugName") for drug in treatment.get("drugs") or []],
            "cancerType": (treatment.get("levelAssociatedCancerType") or {}).get("code")
                          or (treatment.get("levelAssociatedCancerType") or {}).get("mainType",
                                                                                    {}).get("name"),
        })
    return {
        "queriedAlteration": alteration,
        "oncogenic": payload.get("oncogenic"),
        "highestLevel": payload.get("highestSensitiveLevel"),
        "highestResistanceLevel": payload.get("highestResistanceLevel"),
        "variantExists": payload.get("variantExist"),
        "treatments": treatments,
    }


# --------------------------------------------------------------------------
# curated cancer type associations
#
# Converted by hand from the 26 gene-level `context` strings in the v1 data,
# following the migration table in the v2 design plan. Entries marked
# placeholder=True are the ones the plan leaves to a curator.
# --------------------------------------------------------------------------

def ct(code, origin="somatic", note=None, placeholder=False):
    return {
        "code": code,
        "origin": origin,
        "note": note,
        "placeholder": placeholder,
    }


CURATED_CANCER_TYPES = {
    "APC": [ct("COADREAD")],
    "ATM": [
        ct("PROSTATE", "germline", "Familial prostate cancer"),
        ct("BREAST", "germline"),
        ct("PANCREAS", "germline"),
    ],
    "BAP1": [ct("KIDNEY", "somatic", "Also recurrent in kidney cancer")],
    "BRAF": [ct("LCH")],
    "BRCA1": [
        ct("BREAST", "germline", placeholder=True),
        ct("OVARY", "germline", placeholder=True),
    ],
    "BRCA2": [
        ct("BREAST", "germline", placeholder=True),
        ct("OVARY", "germline", placeholder=True),
    ],
    "BRIP1": [
        ct("BREAST", "germline"),
        ct("OVARY", "germline"),
    ],
    "CDH1": [ct("DSTAD", "germline", "Diffuse gastric cancer", placeholder=True)],
    "CHEK2": [ct("BREAST", "germline", placeholder=True)],
    "CTNNB1": [ct("COADREAD")],
    "EGFR": [ct("NSCLC", "somatic", "EGFR TKIs")],
    "EIF1AX": [ct("THYROID")],
    "ERBB2": [ct("PANCAN", "somatic", "NSCLC, ovary, breast, esophageal, gastric, urinary, melanoma, "
                 "colorectal, head and neck, biliary, endometrial, glioma")],
    "F11": [],
    "FLT3": [ct("AML")],
    "KIT": [ct("GIST", "somatic", "Imatinib and later-line KIT inhibitors")],
    "KRAS": [ct("PANCAN")],
    "MET": [ct("NSCLC", "somatic", "MET inhibitors")],
    "MLH1": [ct("COADREAD", "germline", "Lynch syndrome")],
    "MSH2": [
        ct("COADREAD", "germline", "Lynch syndrome"),
        ct("PANCAN"),
    ],
    "PALB2": [ct("BREAST", "germline", placeholder=True)],
    "PIK3R1": [ct("BREAST"), ct("UTERUS")],
    "RAD51D": [ct("OVARY", "germline", placeholder=True)],
    "RB1": [ct("RBL", "germline", "Unilateral retinoblastoma")],
    "TERT": [
        ct("DIFG"), ct("BLADDER"), ct("THYROID"),
        ct("LIVER"), ct("MEL"),
    ],
    "TP53": [ct("PANCAN")],
}

# Prose that is not a cancer type and stays in `context` after the conversion.
RESIDUAL_CONTEXT = {
    "ATM": "In ataxia telangiectasia",
    "F11": "Largely found in cancer-related thrombosis",
    "MLH1": "Lynch syndrome; also reported across several cancer types",
    "TP53": "Results in P53 protein loss of function",
}


# --------------------------------------------------------------------------
# events
# --------------------------------------------------------------------------

TYPE_FROM_CLASSIFICATION = [
    ("Splice_Exon_Skip", "SKIP", "Exon skipping"),
    ("Splice_Exon_Extension", "EXT", "Exon extension"),
    ("Splice_Exon_Shortening", "SHORT", "Exon shortening"),
    ("Splice_Intron_Retention", "RETAIN", "Intron retention"),
]

FRAME_SUFFIX = [
    ("_In_Frame", "IF", "in frame"),
    ("_Frame_Shift", "FS", "frameshift"),
    ("_Out_Of_Frame", "FS", "frameshift"),
    ("_Nonsense", "NS", "nonsense"),
    ("_Non_Start", "NST", "start lost"),
]


# How each outcome reads in an event name, with and without a known exon.
OUTCOME_PHRASE = {
    "SKIP": ("exon %s skipping", "exon skipping"),
    "EXT": ("exon %s extension", "exon extension"),
    "SHORT": ("exon %s shortening", "exon shortening"),
    "RETAIN": ("intron %s retention", "intron retention"),
    "PROMOTER": ("promoter activation", "promoter activation"),
    "OTHER": ("unexpected effect in exon %s", "unexpected effect"),
}

FRAME_PHRASE = {
    "IF": "in frame",
    "FS": "frameshift",
    "NS": "nonsense",
    "NST": "start lost",
}


def classify_event(gene, classification, default_effect):
    """Return (type_code, frame_code, human label) for an event group."""
    if not classification:
        if (default_effect or "").lower().startswith("promoter") or gene == "TERT":
            return "PROMOTER", None, "Promoter activation"
        return "OTHER", None, "Other unexpected effect"
    type_code, label = "OTHER", "Other unexpected effect"
    for prefix, code, text in TYPE_FROM_CLASSIFICATION:
        if classification.startswith(prefix):
            type_code, label = code, text
            break
    frame_code, frame_label = None, None
    for suffix, code, text in FRAME_SUFFIX:
        if classification.endswith(suffix):
            frame_code, frame_label = code, text
            break
    if frame_label:
        label = "%s, %s" % (label, frame_label)
    return type_code, frame_code, label


def event_name(gene, type_code, frame_code, exon):
    """Full, readable event name: "MET exon 14 skipping (in frame)"."""
    with_exon, without_exon = OUTCOME_PHRASE.get(
        type_code, OUTCOME_PHRASE["OTHER"])
    phrase = (with_exon % exon) if (exon and "%s" in with_exon) else without_exon
    name = "%s %s" % (gene, phrase)
    if frame_code and type_code not in ("PROMOTER", "OTHER"):
        name = "%s (%s)" % (name, FRAME_PHRASE.get(frame_code, frame_code))
    return name


def exon_hints(*texts):
    found = []
    for text in texts:
        for match in re.findall(r"[Ee]xons? (\d+)", text or ""):
            if match not in found:
                found.append(match)
    return found


# --------------------------------------------------------------------------
# evidence
# --------------------------------------------------------------------------

# Evidence read out of papers, in the four-field schema. Keyed by (pmid, gene).
# Quotes are copied verbatim from the source.
CURATED_EVIDENCE = {
    ("29316426", "APC"): [
        dict(assay="DIGITAL_PCR", system="PATIENT_SAMPLE", shows="STRUCTURE",
             finding="The splice variant was detected in all five tumours tested.",
             quantification="5 of 5 tumours tested",
             quote="we were able to detect the presence of this splice variant in "
                   "all five tumors that we tested using a digital PCR assay",
             locator={"section": "Results > WNT Pathway alterations",
                      "methods": "STAR Methods > Method Details > Digital droplet PCR"}),
        dict(assay="IMMUNOHISTOCHEMISTRY", system="PATIENT_SAMPLE", shows="FUNCTION",
             finding="All five tumours showed nuclear beta-catenin staining, "
                    "consistent with WNT pathway activation.",
             quote="all five exhibited nuclear \u03b2-catenin staining, consistent "
                   "with WNT activation",
             locator={"figure": "2B",
                      "methods": "STAR Methods > Method Details > Immunohistochemistry (IHC)"}),
        dict(assay="COHORT_RECURRENCE", system="PATIENT_SAMPLE", shows="OCCURRENCE",
             finding="Recurrent in microsatellite stable colorectal cancer, and "
                    "absent from every other tumour type in MSK-IMPACT.",
             quantification="35 MSS cases of 1134; not seen in 9,939 other tumours",
             quote="we identified 35 MSS cases harboring a recurrent intronic "
                   "single-nucleotide variant eight nucleotides upstream of APC exon 9",
             locator={"section": "Results > WNT Pathway alterations",
                      "supplement": "Table S3"}),
    ],
    ("29316426", "CTNNB1"): [
        dict(assay="IMMUNOHISTOCHEMISTRY", system="PATIENT_SAMPLE", shows="FUNCTION",
             finding="Tumours with these exon 3-spanning in-frame deletions showed "
                    "nuclear beta-catenin staining.",
             quote="In cases with these large CTNNB1 exon 3-spanning in-frame "
                   "deletions, IHC for \u03b2-catenin showed nuclear staining of "
                   "\u03b2-catenin, indicating WNT pathway activation in these tumors",
             locator={"figure": "2C"}),
        dict(assay="COHORT_RECURRENCE", system="PATIENT_SAMPLE", shows="OCCURRENCE",
             finding="A cluster of intragenic in-frame deletions spanning exon 3, "
                    "exclusive to microsatellite stable tumours.",
             quantification="29 cases",
             quote="a cluster of intragenic in-frame deletions that spanned exon 3, "
                   "which occurred in 29 cases and were exclusive to MSS tumors",
             locator={"section": "Results > WNT Pathway alterations",
                      "supplement": "Table S3"}),
    ],
}

# Mechanism text taken from the paper, where it has been read.
CURATED_MECHANISM = {
    ("29316426", "APC"): "Introduces a splice acceptor site that results in a "
                         "frameshift in the protein",
}

SAMPLE_TYPE_FROM_ORIGIN = {
    "germline": "PATIENT_BLOOD",
    "somatic": "PATIENT_TUMOR",
    "both": "PATIENT_TUMOR",
}

# No invented evidence detail. Assay, finding, locator and quote come from
# reading the papers (see reVUE-data/paper/), not from this script.


def build_evidence(gene, variant, references, top_cancer_code, pmid_evidence):
    """One item per cited source.

    Assay, system and what the result shows come from reading the paper. When a
    paper has been read, CURATED_EVIDENCE carries what it actually says; when it
    has not, the item records the citation and leaves `assay` unset, which means
    "not curated yet" rather than "the paper does not say".
    """
    items = []
    origin = (variant.get("mutationOrigin") or "").lower()
    sample_type = SAMPLE_TYPE_FROM_ORIGIN.get(origin, "PATIENT_TUMOR")

    for reference in references:
        pubmed_id = str(reference.get("pubmedId") or "0")
        source = ("INTERNAL:MSK-CBT" if pubmed_id in ("0", "")
                  else "PMID:%s" % pubmed_id)
        curated = pmid_evidence.get((pubmed_id, gene)) or []
        if curated:
            for entry in curated:
                item = dict(entry)
                item["source"] = source
                item.setdefault("direction", "SUPPORTS")
                item.setdefault("supports", "primary")
                item.setdefault("sample", {"type": sample_type,
                                           "cancerType": top_cancer_code})
                item["curation"] = {"curatedBy": None, "curatedDate": None,
                                    "reviewedBy": None, "reviewedDate": None,
                                    "method": "AI_ASSISTED"}
                item["placeholders"] = []
                items.append(item)
            continue
        items.append(dict(
            source=source, assay=None, sequenced=None, system=None, shows=None,
            supports="primary", direction="SUPPORTS",
            sample={"type": sample_type, "cancerType": top_cancer_code,
                    "description": None},
            finding=None, quantification=None, locator=None, quote=None,
            curation={"curatedBy": None, "curatedDate": None, "reviewedBy": None,
                      "reviewedDate": None, "method": "LEGACY"},
            placeholders=["assay", "sample.cancerType"]))
    return items


# (no confirmed/unconfirmed flag: every curated entry is a VUE)


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------

def total_counts(counts):
    out = {"somatic": 0, "germline": 0, "unknown": 0}
    total = (counts or {}).get("total") or {}
    out["somatic"] = total.get("somaticVariantsCount") or 0
    out["germline"] = total.get("germlineVariantsCount") or 0
    out["unknown"] = total.get("unknownVariantsCount") or 0
    return out


def observed_cancer_types(counts, oncotree):
    """Collapse the v1 per-cohort cancer type maps into one OncoTree list."""
    total = (counts or {}).get("total") or {}
    buckets = defaultdict(lambda: {"somatic": 0, "germline": 0, "unknown": 0})
    name_by_code = {}
    confidence_by_code = {}
    for key, bucket in (("somaticVariantsCountByCancerType", "somatic"),
                        ("germlineVariantsCountByCancerType", "germline"),
                        ("unknownVariantsCountByCancerType", "unknown")):
        for name, count in (total.get(key) or {}).items():
            code, resolved, confidence, mapped = oncotree.resolve_cohort_name(name)
            oncotree.register(code, resolved, mapped)
            buckets[code][bucket] += count
            name_by_code[code] = resolved
            confidence_by_code[code] = confidence
    rows = []
    grand = sum(sum(v.values()) for v in buckets.values())
    for code, value in buckets.items():
        count = sum(value.values())
        rows.append({
            "code": code,
            "name": name_by_code[code],
            "somatic": value["somatic"],
            "germline": value["germline"],
            "unknown": value["unknown"],
            "count": count,
            "fraction": round(count / grand, 4) if grand else 0.0,
            "mapping": confidence_by_code[code],
        })
    rows.sort(key=lambda row: (-row["count"], row["name"]))
    top = [row["code"] for row in rows if row["fraction"] >= 0.10][:3]
    return rows, top


def build_variant(gene, event_id, raw, oncotree, reference_index,
                  oncokb_token=None, offline=False):
    hgvsc = raw.get("hgvsc") or ""
    short_hgvsc = hgvsc.split(":")[-1] if ":" in hgvsc else hgvsc
    variant_id = "%s:%s" % (gene, short_hgvsc) if short_hgvsc else "%s:%s" % (gene, raw["variant"])

    rows, top = observed_cancer_types(raw.get("counts"), oncotree)
    top_code = top[0] if top else None

    references = raw.get("references") or []
    for reference in references:
        pubmed_id = str(reference.get("pubmedId") or "0")
        key = ("INTERNAL:MSK-CBT" if pubmed_id in ("0", "")
               else "PMID:%s" % pubmed_id)
        entry = reference_index.setdefault(key, {
            "id": key,
            "type": "INTERNAL" if key.startswith("INTERNAL") else "JOURNAL_ARTICLE",
            "citation": reference.get("referenceText"),
            "pubmedId": None if key.startswith("INTERNAL") else pubmed_id,
            "title": None,
            "journal": None,
            "year": None,
            "usedBy": [],
        })
        if variant_id not in entry["usedBy"]:
            entry["usedBy"].append(variant_id)

    evidence = build_evidence(gene, raw, references, top_code, CURATED_EVIDENCE)

    therapeutic_level = raw.get("therapeuticLevel")
    as_revised = oncokb_lookup(gene, raw.get("revisedProteinEffect"),
                               oncokb_token, offline)
    as_vep = oncokb_lookup(gene, raw.get("vepPredictedProteinEffect"),
                           oncokb_token, offline)
    if as_revised:
        therapeutic_level = as_revised["highestLevel"]
    oncokb = {
        "source": "OncoKB API" if as_revised else "reVUE-data v1",
        "asRevised": as_revised,
        "asVepPredicted": as_vep,
        "levelLostWithoutRevue": bool(
            as_revised and as_revised["highestLevel"] and
            (not as_vep or as_vep["highestLevel"] != as_revised["highestLevel"])),
        "oncogenic": (as_revised or {}).get("oncogenic") or raw.get("oncogenic"),
        "highestLevel": therapeutic_level,
        "byCancerType": ([] if not therapeutic_level or not top_code else [{
            "code": top_code,
            "name": next((row["name"] for row in rows if row["code"] == top_code), top_code),
            "level": therapeutic_level,
            "drugs": [],
        }]),
        "placeholders": ["byCancerType"] if therapeutic_level else [],
    }

    counts = raw.get("counts") or {}
    cohorts = {}
    for name, bucket in counts.items():
        cohorts[name] = {
            "somatic": bucket.get("somaticVariantsCount") or 0,
            "germline": bucket.get("germlineVariantsCount") or 0,
            "unknown": bucket.get("unknownVariantsCount") or 0,
            "totalPatientCount": bucket.get("totalPatientCount") or 0,
            "genePatientCount": bucket.get("genePatientCount") or 0,
        }

    placeholders = ["grch38", "rnaChange"]
    if not raw.get("mutationOrigin"):
        placeholders.append("mutationOrigin")

    return {
        "id": variant_id,
        "version": 1,
        "eventId": event_id,
        "gene": gene,
        "grch37": raw.get("variant"),
        "grch38": None,
        "genomicLocation": raw.get("genomicLocation"),
        "transcriptId": raw.get("transcriptId"),
        "hgvsc": hgvsc,
        "vepPredictedProteinEffect": raw.get("vepPredictedProteinEffect"),
        "vepPredictedVariantClassification": raw.get("vepPredictedVariantClassification"),
        "revisedProteinEffect": raw.get("revisedProteinEffect"),
        "revisedVariantClassification": raw.get("revisedVariantClassification"),
        "revisedStandardVariantClassification": raw.get("revisedStandardVariantClassification"),
        "rnaChange": None,
        "mutationOrigin": raw.get("mutationOrigin") or "unknown",
        "note": raw.get("variantNote") or None,
        "alternativeOutcomes": ([{"id": "alt1", "description": raw["otherVariation"]}]
                                if raw.get("otherVariation") else []),
        "cancerTypes": [],
        "evidence": evidence,
        "counts": {"cohorts": cohorts, "total": total_counts(counts)},
        "observedCancerTypes": rows,
        "topCancerTypes": top,
        "oncokb": oncokb,
        "genomicRepresentations": [],
        "multipleGenomicRepresentations": False,
        "history": [{
            "version": 1,
            "release": RELEASE,
            "change": "MIGRATED",
            "material": True,
            "method": "LEGACY",
            "summary": "Migrated from VUEs.txt",
        }],
        "placeholders": placeholders,
    }


def merge_equivalent_variants(variants):
    """Collapse records that share a variant id.

    Variant ids are HGVSc-based, so equivalent genomic spellings of the same
    cDNA change (a duplication written as a dup and as two insertions, for
    example) resolve to one id. They are one variant: the record keeps every
    genomic representation, because Genome Nexus matches on HGVSg, and sums the
    cohort counts.
    """
    grouped = OrderedDict()
    for variant in variants:
        grouped.setdefault(variant["id"], []).append(variant)

    merged = []
    for group in grouped.values():
        base = group[0]
        if len(group) == 1:
            merged.append(base)
            continue

        base["genomicRepresentations"] = [{
            "grch37": item["grch37"],
            "genomicLocation": item["genomicLocation"],
            "total": item["counts"]["total"],
        } for item in group]
        base["multipleGenomicRepresentations"] = True

        for item in group[1:]:
            for cohort, counts in item["counts"]["cohorts"].items():
                target = base["counts"]["cohorts"].setdefault(
                    cohort, {"somatic": 0, "germline": 0, "unknown": 0,
                             "totalPatientCount": counts["totalPatientCount"],
                             "genePatientCount": counts["genePatientCount"]})
                for key in ("somatic", "germline", "unknown"):
                    target[key] += counts[key]
            for key in ("somatic", "germline", "unknown"):
                base["counts"]["total"][key] += item["counts"]["total"][key]
            for evidence in item["evidence"]:
                if not any(existing["source"] == evidence["source"] and
                           existing.get("assay") == evidence.get("assay")
                           for existing in base["evidence"]):
                    base["evidence"].append(evidence)

        buckets = OrderedDict()
        for item in group:
            for row in item["observedCancerTypes"]:
                entry = buckets.setdefault(row["code"], dict(row, count=0, somatic=0,
                                                             germline=0, unknown=0))
                for key in ("count", "somatic", "germline", "unknown"):
                    entry[key] += row.get(key) or 0
        total = sum(entry["count"] for entry in buckets.values())
        rows = sorted(buckets.values(), key=lambda row: -row["count"])
        for row in rows:
            row["fraction"] = round(row["count"] / total, 4) if total else 0.0
        base["observedCancerTypes"] = rows
        base["topCancerTypes"] = [row["code"] for row in rows if row["fraction"] >= 0.10][:3]
        merged.append(base)
    return merged


def build_bundle(v1_data, oncotree, offline, oncokb_token=None):
    reference_index = {}
    events = []
    genes = []

    for gene_record in sorted(v1_data, key=lambda record: record["hugoGeneSymbol"]):
        gene = gene_record["hugoGeneSymbol"]
        hints = exon_hints(gene_record.get("genomicLocationDescription"),
                           gene_record.get("comment"), gene_record.get("context"))

        groups = OrderedDict()
        for raw in gene_record["revisedProteinEffects"]:
            key = raw.get("revisedVariantClassification") or "__NONE__"
            groups.setdefault(key, []).append(raw)

        gene_event_ids = []
        for index, (classification, raws) in enumerate(groups.items()):
            cls = None if classification == "__NONE__" else classification
            type_code, frame_code, label = classify_event(
                gene, cls, gene_record.get("defaultEffect"))

            # Prefer the exon computed from the variants' genomic positions;
            # fall back to a number mentioned in the curated text.
            structure = exon_structure(gene_record.get("transcriptId"), offline)
            ranks = collections.Counter()
            for raw in raws:
                parts = (raw.get("genomicLocation") or "").split(",")
                if len(parts) >= 3:
                    try:
                        rank, _ = nearest_exon(structure, int(parts[1]), int(parts[2]))
                    except (TypeError, ValueError):
                        rank = None
                    if rank:
                        ranks[rank] += 1
            exon = str(ranks.most_common(1)[0][0]) if ranks else (
                hints[0] if len(hints) == 1 else None)
            exon_source = "computed" if ranks else ("text" if exon else None)
            parts = [gene]
            if exon and type_code != "PROMOTER":
                parts.append("EX%s" % exon)
            parts.append(type_code)
            if frame_code and len(groups) > 1:
                parts.append(frame_code)
            event_id = "-".join(parts)
            if any(event["id"] == event_id for event in events):
                event_id = "%s-%d" % (event_id, index + 1)
            full_name = event_name(gene, type_code, frame_code, exon)

            variants = merge_equivalent_variants(
                [build_variant(gene, event_id, raw, oncotree, reference_index,
                               oncokb_token, offline)
                 for raw in raws])

            warnings = []
            for variant in variants:
                if variant.get("multipleGenomicRepresentations"):
                    warnings.append(
                        "Merged record: %s is written %d different ways in genomic "
                        "coordinates in the source data (one cDNA change, several "
                        "spellings). They are one record here; every spelling is kept "
                        "because Genome Nexus matches on genomic position."
                        % (variant["id"], len(variant["genomicRepresentations"])))

            cancer_types = []
            for entry in CURATED_CANCER_TYPES.get(gene, []):
                node = oncotree.by_code.get(entry["code"])
                if entry["code"] == "PANCAN":
                    oncotree.used.setdefault("PANCAN", dict(PANCAN))
                    name = PANCAN["name"]
                else:
                    oncotree.register(entry["code"], entry["code"], bool(node))
                    name = (node or {}).get("name", entry["code"])
                cancer_types.append({
                    "code": entry["code"],
                    "name": name,
                    "origin": entry["origin"],
                    "note": entry["note"],
                    "sources": sorted({
                        item["source"] for variant in variants
                        for item in variant["evidence"] if item["source"].startswith("PMID")
                    })[:2],
                    "broaderCodes": oncotree.ancestors(entry["code"]),
                    "placeholder": entry["placeholder"],
                })

            event_references = sorted({
                item["source"] for variant in variants for item in variant["evidence"]
            })

            observed = defaultdict(lambda: {"count": 0, "name": None})
            for variant in variants:
                for row in variant["observedCancerTypes"]:
                    observed[row["code"]]["count"] += row["count"]
                    observed[row["code"]]["name"] = row["name"]
            observed_rows = sorted(
                ({"code": code, "name": value["name"], "count": value["count"]}
                 for code, value in observed.items()),
                key=lambda row: -row["count"])
            observed_total = sum(row["count"] for row in observed_rows) or 0
            for row in observed_rows:
                row["fraction"] = round(row["count"] / observed_total, 4) if observed_total else 0.0

            events.append({
                "id": event_id,
                "name": full_name,
                "version": 1,
                "gene": gene,
                "transcriptId": gene_record.get("transcriptId"),
                "eventType": "promoter" if type_code == "PROMOTER" else (
                    gene_record.get("defaultEffect") or "splicing"),
                "outcome": label,
                "outcomeCode": type_code,
                "frameCode": frame_code,
                "exon": exon,
                "exonSource": exon_source,
                "location": gene_record.get("genomicLocationDescription"),
                "mechanism": next(
                    (text for (pmid, g), text in CURATED_MECHANISM.items()
                     if g == gene and any(i["source"] == "PMID:" + pmid
                                          for v in variants for i in v["evidence"])),
                    gene_record.get("comment")),
                "mechanismSource": next(
                    ("PMID:" + pmid for (pmid, g) in CURATED_MECHANISM
                     if g == gene and any(i["source"] == "PMID:" + pmid
                                          for v in variants for i in v["evidence"])),
                    None),
                "context": RESIDUAL_CONTEXT.get(gene, ""),
                "legacyContext": gene_record.get("context") or "",
                "cancerTypes": cancer_types,
                "observedCancerTypes": observed_rows[:8],
                "references": event_references,
                "variants": variants,
                "variantCount": len(variants),
                "counts": {
                    "somatic": sum(v["counts"]["total"]["somatic"] for v in variants),
                    "germline": sum(v["counts"]["total"]["germline"] for v in variants),
                    "unknown": sum(v["counts"]["total"]["unknown"] for v in variants),
                },
                "highestLevel": next((level for level in
                                      ("LEVEL_1", "LEVEL_2", "LEVEL_3A", "LEVEL_3B", "LEVEL_4")
                                      if any(v["oncokb"]["highestLevel"] == level
                                             for v in variants)), None),
                "oncogenic": next((value for value in
                                   ("Oncogenic", "Likely Oncogenic", "Resistance",
                                    "Likely Neutral", "Inconclusive", "Unknown")
                                   if any(v["oncokb"]["oncogenic"] == value
                                          for v in variants)), None),
                "warnings": warnings,
                "placeholders": (["id"] if not exon else []),
                "outcomes": sorted(
                    {(v["revisedProteinEffect"], v["revisedVariantClassification"],
                      v["revisedStandardVariantClassification"]) for v in variants},
                    key=lambda o: str(o[0])),
                "history": [{
                    "version": 1,
                    "release": RELEASE,
                    "change": "MIGRATED",
                    "material": True,
                    "method": "LEGACY",
                    "summary": "Migrated from VUEs.txt (%d row%s); context converted to cancerTypes"
                               % (len(variants), "" if len(variants) == 1 else "s"),
                }],
            })
            gene_event_ids.append(event_id)

        genes.append({
            "gene": gene,
            "transcriptId": gene_record.get("transcriptId"),
            "eventIds": gene_event_ids,
            "variantCount": len(gene_record["revisedProteinEffects"]),
            "notes": None,
        })

    # reference metadata from PubMed, when reachable
    pubmed_ids = [entry["pubmedId"] for entry in reference_index.values()
                  if entry.get("pubmedId")]
    if pubmed_ids:
        summary = fetch_json(PUBMED_API + ",".join(sorted(set(pubmed_ids))),
                             "pubmed.json", offline)
        result = (summary or {}).get("result") or {}
        for entry in reference_index.values():
            record = result.get(entry.get("pubmedId") or "")
            if record:
                entry["title"] = record.get("title")
                entry["journal"] = record.get("source")
                entry["year"] = (record.get("pubdate") or "")[:4]
            elif entry["type"] == "JOURNAL_ARTICLE":
                entry.setdefault("placeholders", []).append("title")

    variants_flat = [variant for event in events for variant in event["variants"]]
    cancer_type_index = {}
    for event in events:
        for entry in event["cancerTypes"]:
            bucket = cancer_type_index.setdefault(entry["code"], {
                "code": entry["code"], "name": entry["name"],
                "events": [], "genes": [], "variantCount": 0, "observedCount": 0,
            })
            bucket["events"].append(event["id"])
            if event["gene"] not in bucket["genes"]:
                bucket["genes"].append(event["gene"])
            bucket["variantCount"] += event["variantCount"]
    for variant in variants_flat:
        for row in variant["observedCancerTypes"]:
            bucket = cancer_type_index.setdefault(row["code"], {
                "code": row["code"], "name": row["name"],
                "events": [], "genes": [], "variantCount": 0, "observedCount": 0,
            })
            bucket["observedCount"] += row["count"]

    return {
        "schemaVersion": SCHEMA_VERSION,
        "release": RELEASE,
        "source": {
            "repository": "knowledgesystems/reVUE-data",
            "file": "generated/VUEs.json",
            "model": "v1 → v2 preview conversion",
        },
        "notice": (
            "Preview bundle. Curated values (coordinates, protein effects, "
            "classifications, references, cohort counts, OncoKB calls) are the real "
            "reVUE data. Fields the v2 model adds but v1 cannot supply — evidence "
            "detail, GRCh38 coordinates, per-tumour-type OncoKB levels, some cancer "
            "type assignments — are placeholders and are labelled as such."
        ),
        "stats": {
            "sourceRows": sum(len(record["revisedProteinEffects"]) for record in v1_data),
            "mergedRecords": sum(1 for variant in variants_flat
                                 if variant.get("multipleGenomicRepresentations")),
            "genes": len(genes),
            "events": len(events),
            "variants": len(variants_flat),
            "references": len(reference_index),
            "cancerTypes": len(cancer_type_index),
            "curatedAssociations": sum(len(event["cancerTypes"]) for event in events),
            "withOncoKbLevel": sum(1 for variant in variants_flat
                                   if variant["oncokb"]["highestLevel"]),
            "eventsWithOncoKbLevel": sum(1 for event in events
                                         if event["highestLevel"]),
        },
        "genes": genes,
        "events": events,
        "references": reference_index,
        "cancerTypeIndex": cancer_type_index,
        "oncotree": oncotree.used,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revue-data",
                        default=os.path.join(os.path.dirname(REPO), "reVUE-data"))
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--out", default=OUT_PATH)
    parser.add_argument("--oncokb-token", default=os.environ.get("ONCOKB_TOKEN"),
                        help="OncoKB API token; without it the levels stored in "
                             "reVUE-data are kept as they are")
    args = parser.parse_args()

    token = args.oncokb_token
    print("OncoKB: %s" % ("refreshing levels from the API" if token
                          else "no token, keeping the levels stored in reVUE-data"))

    source = os.path.join(args.revue_data, "generated", "VUEs.json")
    print("reading %s" % source)
    with open(source) as handle:
        v1_data = json.load(handle)

    print("fetching OncoTree")
    oncotree = OncoTree(fetch_json(ONCOTREE_API, "oncotree.json", args.offline))

    bundle = build_bundle(v1_data, oncotree, args.offline, token)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as handle:
        json.dump(bundle, handle, indent=1)
        handle.write("\n")

    stats = bundle["stats"]
    print("wrote %s" % args.out)
    print("  genes %(genes)d  events %(events)d  variants %(variants)d" % stats)
    print("  references %(references)d  cancer types %(cancerTypes)d" % stats)
    print("  curated associations %(curatedAssociations)d  "
          "variants with an OncoKB level %(withOncoKbLevel)d" % stats)
    warned = [event["id"] for event in bundle["events"] if event["warnings"]]
    print("  events with warnings: %d %s" % (len(warned), warned[:5]))


if __name__ == "__main__":
    main()
