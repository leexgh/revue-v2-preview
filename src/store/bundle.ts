import bundleJson from '../data/revue.v2.json';
import {
    Bundle,
    CancerTypeIndexEntry,
    Gene,
    Reference,
    Variant,
    VueEvent,
} from '../model/v2';

export const bundle = bundleJson as unknown as Bundle;

export const events: VueEvent[] = bundle.events;
export const genes: Gene[] = bundle.genes;
export const variants: Variant[] = events.reduce<Variant[]>(
    (all, event) => all.concat(event.variants),
    []
);

const eventById = new Map(events.map(event => [event.id, event]));
const variantById = new Map(variants.map(variant => [variant.id, variant]));
const geneByName = new Map(genes.map(gene => [gene.gene, gene]));

export const getEvent = (id: string) => eventById.get(id);
export const getVariant = (id: string) => variantById.get(id);
export const getGene = (symbol: string) => geneByName.get(symbol);
export const getReference = (id: string): Reference | undefined =>
    bundle.references[id];

export const eventsForGene = (symbol: string) =>
    events.filter(event => event.gene === symbol);

export const variantsForGene = (symbol: string) =>
    variants.filter(variant => variant.gene === symbol);

export const cancerTypeName = (code: string) =>
    bundle.oncotree[code]?.name || bundle.cancerTypeIndex[code]?.name || code;

/** Events with at least one variant carrying an OncoKB therapeutic level. */
export const actionableEvents = events.filter(event => event.highestLevel);

/** Events whose curated associations include this cancer type. */
export const eventsForCancerType = (code: string) =>
    events.filter(event => event.cancerTypes.some(entry => entry.code === code));

/** Variants observed in this cancer type in the cohorts. */
export const variantsObservedIn = (code: string) =>
    variants
        .filter(variant =>
            variant.observedCancerTypes.some(row => row.code === code)
        )
        .sort((a, b) => observedCount(b, code) - observedCount(a, code));

export const observedCount = (variant: Variant, code: string) =>
    variant.observedCancerTypes.find(row => row.code === code)?.count || 0;

export interface CancerTypeSummary extends CancerTypeIndexEntry {
    curated: boolean;
    observedVariants: number;
}

export const cancerTypeSummaries: CancerTypeSummary[] = Object.values(
    bundle.cancerTypeIndex
)
    .map(entry => ({
        ...entry,
        curated: entry.events.length > 0,
        observedVariants: variants.filter(variant =>
            variant.observedCancerTypes.some(row => row.code === entry.code)
        ).length,
    }))
    .sort((a, b) => {
        if (a.curated !== b.curated) {
            return a.curated ? -1 : 1;
        }
        return b.observedCount - a.observedCount;
    });

export const curatedCancerTypes = cancerTypeSummaries.filter(
    entry => entry.curated
);

/** Total curated + observed numbers used on the home page. */
export const totals = {
    sourceRows: bundle.stats.sourceRows,
    mergedRecords: bundle.stats.mergedRecords,
    genes: bundle.stats.genes,
    events: bundle.stats.events,
    variants: bundle.stats.variants,
    cancerTypes: curatedCancerTypes.length,
    observedCancerTypes: cancerTypeSummaries.length,
    references: bundle.stats.references,
    withOncoKbLevel: bundle.stats.withOncoKbLevel,
    occurrences: variants.reduce(
        (sum, variant) =>
            sum +
            variant.counts.total.somatic +
            variant.counts.total.germline +
            variant.counts.total.unknown,
        0
    ),
    actionable: bundle.stats.eventsWithOncoKbLevel,
    withWarnings: events.filter(event => event.warnings.length > 0).length,
};

export const outcomeLabel: { [key: string]: string } = {
    SKIP: 'Exon skipping',
    EXT: 'Exon extension',
    SHORT: 'Exon shortening',
    RETAIN: 'Intron retention',
    PROMOTER: 'Promoter',
    OTHER: 'Other',
};

export const assayLabel: { [key: string]: string } = {
    RT_PCR: 'RT-PCR',
    QUANTITATIVE_RT_PCR: 'qRT-PCR',
    DIGITAL_PCR: 'digital PCR',
    RNA_SEQ: 'RNA-seq',
    TARGETED_RNA_SEQ: 'targeted RNA-seq',
    LONG_READ_RNA_SEQ: 'long-read RNA-seq',
    NORTHERN_BLOT: 'Northern blot',
    ALLELE_SPECIFIC_EXPRESSION: 'allele-specific expression',
    WESTERN_BLOT: 'Western blot',
    PROTEIN_TRUNCATION_TEST: 'protein truncation test',
    IMMUNOHISTOCHEMISTRY: 'immunohistochemistry',
    MASS_SPECTROMETRY: 'mass spectrometry',
    REPORTER_ASSAY: 'reporter assay',
    DNA_BINDING_ASSAY: 'binding assay (EMSA/ChIP)',
    EXPRESSION_ANALYSIS: 'expression analysis',
    FUNCTIONAL_ASSAY: 'functional assay',
    CLINICAL_RESPONSE: 'clinical response',
    COHORT_RECURRENCE: 'observed in a sequenced cohort',
    IN_SILICO_PREDICTION: 'in silico prediction',
    METHOD_NOT_STATED: 'method not stated in the source',
};

export const systemLabel: { [key: string]: string } = {
    PATIENT_SAMPLE: 'patient sample',
    MINIGENE: 'minigene construct',
    EDITED_CELL: 'edited cell line',
    CELL_LINE: 'cell line',
    SATURATION_LIBRARY: 'saturation library',
    NONE: '—',
};

/** What a result demonstrates, and how directly it bears on the reVUE claim. */
export const showsLabel: { [key: string]: string } = {
    STRUCTURE: 'transcript structure',
    ABUNDANCE: 'transcript abundance',
    PROTEIN: 'protein product',
    FUNCTION: 'downstream function',
    OCCURRENCE: 'occurrence',
    PREDICTION: 'prediction only',
};

export const showsTone: { [key: string]: 'ok' | 'accent' | 'neutral' } = {
    STRUCTURE: 'ok',
    ABUNDANCE: 'ok',
    PROTEIN: 'accent',
    FUNCTION: 'accent',
    OCCURRENCE: 'neutral',
    PREDICTION: 'neutral',
};

export const sampleTypeLabel: { [key: string]: string } = {
    PATIENT_TUMOR: 'patient tumour',
    PATIENT_BLOOD: 'patient blood',
    PATIENT_NORMAL_TISSUE: 'patient normal tissue',
    CELL_LINE: 'cell line',
    MINIGENE_CONSTRUCT: 'minigene construct',
    ENGINEERED_CELL: 'engineered cell',
    NONE: 'not applicable',
};

export const variantUrl = (id: string) => `/variant/${encodeURIComponent(id)}`;
export const eventUrl = (id: string) => `/event/${encodeURIComponent(id)}`;
export const geneUrl = (symbol: string) => `/gene/${encodeURIComponent(symbol)}`;
export const cancerTypeUrl = (code: string) =>
    `/cancer-type/${encodeURIComponent(code)}`;

export const variantTotal = (variant: Variant) =>
    variant.counts.total.somatic +
    variant.counts.total.germline +
    variant.counts.total.unknown;

/** One flat list used by the global search box. */
export interface SearchItem {
    kind: 'gene' | 'event' | 'variant' | 'cancerType';
    id: string;
    label: string;
    sublabel: string;
    url: string;
    haystack: string;
}

export const searchIndex: SearchItem[] = [
    ...genes.map(gene => ({
        kind: 'gene' as const,
        id: gene.gene,
        label: gene.gene,
        sublabel: `${gene.eventIds.length} event${
            gene.eventIds.length === 1 ? '' : 's'
        } · ${gene.variantCount} variants`,
        url: geneUrl(gene.gene),
        haystack: `${gene.gene} ${gene.transcriptId}`.toLowerCase(),
    })),
    ...events.map(event => ({
        kind: 'event' as const,
        id: event.id,
        label: event.name,
        sublabel: `${event.id} · ${event.variantCount} variants`,
        url: eventUrl(event.id),
        haystack: `${event.id} ${event.name} ${event.gene} ${event.outcome} ${
            event.mechanism
        } ${event.cancerTypes.map(c => `${c.code} ${c.name}`).join(' ')}`.toLowerCase(),
    })),
    ...variants.map(variant => ({
        kind: 'variant' as const,
        id: variant.id,
        label: variant.id,
        sublabel: `${variant.grch37} · ${variant.revisedProteinEffect || '—'}`,
        url: variantUrl(variant.id),
        haystack: `${variant.id} ${variant.grch37} ${variant.hgvsc} ${
            variant.revisedProteinEffect || ''
        } ${variant.vepPredictedProteinEffect || ''}`.toLowerCase(),
    })),
    ...cancerTypeSummaries.map(entry => ({
        kind: 'cancerType' as const,
        id: entry.code,
        label: entry.name,
        sublabel: `${entry.code} · ${
            entry.curated ? `${entry.events.length} curated events` : 'observed only'
        }`,
        url: cancerTypeUrl(entry.code),
        haystack: `${entry.code} ${entry.name}`.toLowerCase(),
    })),
];

export const search = (query: string, limit = 12): SearchItem[] => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return [];
    }
    const kindRank = { gene: 0, cancerType: 1, event: 2, variant: 3 };
    return searchIndex
        .filter(item => item.haystack.includes(needle))
        .sort((a, b) => {
            const aStarts = a.label.toLowerCase().startsWith(needle) ? 0 : 1;
            const bStarts = b.label.toLowerCase().startsWith(needle) ? 0 : 1;
            if (aStarts !== bStarts) {
                return aStarts - bStarts;
            }
            if (kindRank[a.kind] !== kindRank[b.kind]) {
                return kindRank[a.kind] - kindRank[b.kind];
            }
            return a.label.localeCompare(b.label);
        })
        .slice(0, limit);
};
