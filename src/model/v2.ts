/**
 * Types for the reVUE v2 bundle (schemaVersion 1).
 *
 * Produced by scripts/build_v2_bundle.py from the curated reVUE-data v1 JSON.
 * Fields listed in a record's `placeholders` array are not curated values.
 */

export type MutationOrigin = 'somatic' | 'germline' | 'both' | 'unknown';

export interface CuratedCancerType {
    code: string;
    name: string;
    origin: MutationOrigin;
    note: string | null;
    sources: string[];
    broaderCodes: string[];
    placeholder: boolean;
}

export interface ObservedCancerType {
    code: string;
    name: string;
    somatic?: number;
    germline?: number;
    unknown?: number;
    count: number;
    fraction: number;
    mapping?: 'exact' | 'approximate' | 'unmapped';
}

export interface EvidenceItem {
    source: string;
    /** How it was measured. Null means nobody has read the paper yet. */
    assay: string | null;
    sequenced?: boolean | null;
    /** What it was measured in: PATIENT_SAMPLE, MINIGENE, EDITED_CELL, … */
    system: string | null;
    /** What the result demonstrates: STRUCTURE, ABUNDANCE, PROTEIN, FUNCTION, … */
    shows: string | null;
    supports: string;
    direction: 'SUPPORTS' | 'CONTRADICTS' | 'INCONCLUSIVE';
    sample: {
        type: string;
        cancerType: string | null;
        description?: string | null;
        n?: number | null;
    };
    finding: string | null;
    quantification: string | null;
    locator: { [key: string]: string } | null;
    quote: string | null;
    curation: {
        curatedBy: string | null;
        curatedDate: string | null;
        reviewedBy: string | null;
        reviewedDate: string | null;
        method: 'MANUAL' | 'AI_ASSISTED' | 'LEGACY';
    };
    placeholders: string[];
}

export interface CohortCount {
    somatic: number;
    germline: number;
    unknown: number;
    totalPatientCount: number;
    genePatientCount: number;
}

export interface OncoKbCall {
    queriedAlteration: string;
    oncogenic: string | null;
    highestLevel: string | null;
    highestResistanceLevel: string | null;
    variantExists: boolean | null;
    treatments: { level: string; drugs: string[]; cancerType: string | null }[];
}

export interface OncoKbInfo {
    /** "OncoKB API" when refreshed with a token, otherwise "reVUE-data v1". */
    source: string;
    /** OncoKB's answer for the revised protein change. */
    asRevised: OncoKbCall | null;
    /** OncoKB's answer for what VEP predicts — what a pipeline gets without reVUE. */
    asVepPredicted: OncoKbCall | null;
    levelLostWithoutRevue: boolean;
    oncogenic: string | null;
    highestLevel: string | null;
    byCancerType: {
        code: string;
        name: string;
        level: string;
        drugs: string[];
    }[];
    placeholders: string[];
}

export interface Variant {
    id: string;
    version: number;
    eventId: string;
    gene: string;
    grch37: string;
    grch38: string | null;
    genomicLocation: string;
    transcriptId: string;
    hgvsc: string;
    vepPredictedProteinEffect: string | null;
    vepPredictedVariantClassification: string | null;
    revisedProteinEffect: string | null;
    revisedVariantClassification: string | null;
    revisedStandardVariantClassification: string | null;
    rnaChange: string | null;
    mutationOrigin: MutationOrigin;
    note: string | null;
    alternativeOutcomes: { id: string; description: string }[];
    cancerTypes: CuratedCancerType[];
    evidence: EvidenceItem[];
    counts: {
        cohorts: { [cohort: string]: CohortCount };
        total: { somatic: number; germline: number; unknown: number };
    };
    observedCancerTypes: ObservedCancerType[];
    topCancerTypes: string[];
    oncokb: OncoKbInfo;
    history: HistoryEntry[];
    placeholders: string[];
    /** Equivalent genomic spellings of the same cDNA change, merged into one record. */
    genomicRepresentations: {
        grch37: string;
        genomicLocation: string;
        total: { somatic: number; germline: number; unknown: number };
    }[];
    multipleGenomicRepresentations: boolean;
}

export interface HistoryEntry {
    version: number;
    release: string;
    change: string;
    material: boolean;
    method: string;
    summary: string;
}

export interface VueEvent {
    id: string;
    /** Full readable name, e.g. "MET exon 14 skipping (in frame)". */
    name: string;
    version: number;
    gene: string;
    transcriptId: string;
    eventType: string;
    outcome: string;
    outcomeCode: 'SKIP' | 'EXT' | 'SHORT' | 'RETAIN' | 'PROMOTER' | 'OTHER';
    frameCode: string | null;
    exon: string | null;
    exonSource: 'computed' | 'text' | null;
    /** Distinct [protein effect, reVUE class, MAF class] this event produces. */
    outcomes: [string | null, string | null, string | null][];
    mechanismSource?: string | null;
    location: string;
    mechanism: string;
    context: string;
    legacyContext: string;
    cancerTypes: CuratedCancerType[];
    observedCancerTypes: ObservedCancerType[];
    references: string[];
    variants: Variant[];
    variantCount: number;
    counts: { somatic: number; germline: number; unknown: number };
    highestLevel: string | null;
    oncogenic: string | null;
    warnings: string[];
    placeholders: string[];
    history: HistoryEntry[];
}

export interface Gene {
    gene: string;
    transcriptId: string;
    eventIds: string[];
    variantCount: number;
    notes: string | null;
}

export interface Reference {
    id: string;
    type: string;
    citation: string;
    pubmedId: string | null;
    title: string | null;
    journal: string | null;
    year: string | null;
    usedBy: string[];
    placeholders?: string[];
}

export interface OncoTreeNode {
    code: string;
    name: string;
    mainType: string | null;
    tissue: string | null;
    level: number | null;
    parent: string | null;
    color?: string | null;
    inOncoTree: boolean;
    sentinel?: boolean;
}

export interface CancerTypeIndexEntry {
    code: string;
    name: string;
    events: string[];
    genes: string[];
    variantCount: number;
    observedCount: number;
}

export interface Bundle {
    schemaVersion: number;
    release: string;
    source: { repository: string; file: string; model: string };
    notice: string;
    stats: {
        sourceRows: number;
        mergedRecords: number;
        genes: number;
        events: number;
        variants: number;
        references: number;
        cancerTypes: number;
        curatedAssociations: number;
        withOncoKbLevel: number;
        eventsWithOncoKbLevel: number;
    };
    genes: Gene[];
    events: VueEvent[];
    references: { [id: string]: Reference };
    cancerTypeIndex: { [code: string]: CancerTypeIndexEntry };
    oncotree: { [code: string]: OncoTreeNode };
}
