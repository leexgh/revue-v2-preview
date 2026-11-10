import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import { CancerTypeList, Card, LevelPill } from '../components/ui';
import { CuratedCancerType } from '../model/v2';
import {
    eventsForGene,
    geneUrl,
    genes,
    variantsForGene,
} from '../store/bundle';

interface GeneRow {
    gene: string;
    transcriptId: string;
    events: number;
    variants: number;
    cancerTypes: CuratedCancerType[];
    highestLevel: string | null;
    occurrences: number;
}

const LEVEL_ORDER = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3A', 'LEVEL_3B', 'LEVEL_4'];

const rows: GeneRow[] = genes.map(gene => {
    const geneEvents = eventsForGene(gene.gene);
    const geneVariants = variantsForGene(gene.gene);
    const seen = new Map<string, CuratedCancerType>();
    geneEvents.forEach(event =>
        event.cancerTypes.forEach(entry => seen.set(entry.code, entry))
    );
    return {
        gene: gene.gene,
        transcriptId: gene.transcriptId,
        events: geneEvents.length,
        variants: geneVariants.length,
        cancerTypes: Array.from(seen.values()),
        highestLevel:
            LEVEL_ORDER.find(level =>
                geneVariants.some(variant => variant.oncokb.highestLevel === level)
            ) || null,
        occurrences: geneVariants.reduce(
            (sum, variant) =>
                sum +
                variant.counts.total.somatic +
                variant.counts.total.germline +
                variant.counts.total.unknown,
            0
        ),
    };
});

export const GenesPage: React.FC = () => {
    const [text, setText] = useState('');

    const filtered = useMemo(
        () =>
            rows.filter(row =>
                `${row.gene} ${row.transcriptId} ${row.cancerTypes
                    .map(entry => entry.name)
                    .join(' ')}`
                    .toLowerCase()
                    .includes(text.trim().toLowerCase())
            ),
        [text]
    );

    const columns: Column<GeneRow>[] = [
        {
            id: 'gene',
            header: 'Gene',
            value: row => row.gene,
            render: row => (
                <>
                    <Link className="mono" style={{ fontWeight: 600 }} to={geneUrl(row.gene)}>
                        {row.gene}
                    </Link>
                    <div className="tiny faint mono">{row.transcriptId}</div>
                </>
            ),
            width: 150,
        },
        { id: 'events', header: 'Events', value: row => row.events, align: 'right', width: 90 },
        {
            id: 'variants',
            header: 'Variants',
            value: row => row.variants,
            align: 'right',
            width: 100,
        },
        {
            id: 'cancerTypes',
            header: 'Cancer types',
            value: row => row.cancerTypes.map(entry => entry.name).join(', '),
            render: row => <CancerTypeList entries={row.cancerTypes} limit={4} />,
        },
        {
            id: 'level',
            header: 'OncoKB',
            value: row => row.highestLevel || '',
            render: row => <LevelPill level={row.highestLevel} />,
            width: 100,
        },
        {
            id: 'occurrences',
            header: 'Occurrences',
            value: row => row.occurrences,
            align: 'right',
            render: row => (
                <span className="mono">{row.occurrences.toLocaleString()}</span>
            ),
            width: 120,
        },
    ];

    return (
        <div className="page stack">
            <div>
                <h1>Genes</h1>
                <p className="muted" style={{ marginTop: 6 }}>
                    {genes.length} genes with curated variants, each with the reference
                    transcript their exon numbering follows.
                </p>
            </div>
            <Card
                title={`${filtered.length} genes`}
                pad={false}
                actions={
                    <input
                        className="filter-input"
                        placeholder="Filter genes…"
                        value={text}
                        onChange={event => setText(event.target.value)}
                    />
                }
            >
                <DataTable
                    rows={filtered}
                    columns={columns}
                    rowKey={row => row.gene}
                    initialSort={{ id: 'gene', desc: false }}
                />
            </Card>
        </div>
    );
};

export default GenesPage;
