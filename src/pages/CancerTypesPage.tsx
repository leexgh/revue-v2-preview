import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import { Card, Notice } from '../components/ui';
import {
    bundle,
    cancerTypeSummaries,
    CancerTypeSummary,
    cancerTypeUrl,
    curatedCancerTypes,
} from '../store/bundle';

export const CancerTypesPage: React.FC = () => {
    const [text, setText] = useState('');

    const observedOnly = useMemo(
        () =>
            cancerTypeSummaries.filter(
                entry =>
                    !entry.curated &&
                    entry.name.toLowerCase().includes(text.trim().toLowerCase())
            ),
        [text]
    );

    const curated = useMemo(
        () =>
            curatedCancerTypes.filter(entry =>
                `${entry.name} ${entry.code}`
                    .toLowerCase()
                    .includes(text.trim().toLowerCase())
            ),
        [text]
    );

    const columns: Column<CancerTypeSummary>[] = [
        {
            id: 'name',
            header: 'Cancer type',
            value: entry => entry.name,
            render: entry => (
                <Link to={cancerTypeUrl(entry.code)}>{entry.name}</Link>
            ),
        },
        {
            id: 'code',
            header: 'OncoTree',
            value: entry => entry.code,
            render: entry => (
                <span className="mono small">
                    {entry.code}
                    {!bundle.oncotree[entry.code]?.inOncoTree && (
                        <span className="placeholder-tag" style={{ marginLeft: 6 }}>
                            unmapped
                        </span>
                    )}
                </span>
            ),
            width: 170,
        },
        {
            id: 'variants',
            header: 'Variants seen',
            value: entry => entry.observedVariants,
            align: 'right',
            width: 130,
        },
        {
            id: 'occurrences',
            header: 'Occurrences',
            value: entry => entry.observedCount,
            align: 'right',
            render: entry => (
                <span className="mono">{entry.observedCount.toLocaleString()}</span>
            ),
            width: 120,
        },
    ];

    return (
        <div className="page stack">
            <div className="spread">
                <div>
                    <h1>Cancer types</h1>
                    <p className="muted" style={{ marginTop: 6, maxWidth: 760 }}>
                        Two different things live on this page.{' '}
                        <strong>Curated cancer types</strong> are the ones a curator has
                        tied to an event.{' '}
                        <strong>Cancer types observed in cohorts</strong> are where the
                        variants actually turn up in MSK-IMPACT, GENIE and TCGA. They are
                        allowed to disagree.
                    </p>
                </div>
                <input
                    className="filter-input"
                    placeholder="Filter cancer types…"
                    value={text}
                    onChange={event => setText(event.target.value)}
                />
            </div>

            <Card title={`Curated cancer types (${curated.length})`}>
                <div className="cancer-grid">
                    {curated.map(entry => (
                        <Link
                            key={entry.code}
                            className="cancer-card"
                            to={cancerTypeUrl(entry.code)}
                        >
                            <div className="spread" style={{ gap: 8 }}>
                                <h3>{entry.name}</h3>
                                <span className="mono tiny faint">{entry.code}</span>
                            </div>
                            <div className="small muted">
                                {entry.events.length} event
                                {entry.events.length === 1 ? '' : 's'} ·{' '}
                                {entry.genes.length} gene
                                {entry.genes.length === 1 ? '' : 's'}
                                {entry.observedCount > 0 &&
                                    ` · ${entry.observedCount.toLocaleString()} occurrences`}
                            </div>
                            <div className="row" style={{ gap: 4 }}>
                                {entry.genes.slice(0, 6).map(gene => (
                                    <span key={gene} className="chip chip-neutral mono">
                                        {gene}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            </Card>

            <Notice>
                A cancer type below has reVUE variants occurring in it in the cohorts, but
                no curator has written an association for it yet. Large counts here are
                curation leads.
            </Notice>

            <Card
                title={`Observed in cohorts only (${observedOnly.length})`}
                pad={false}
            >
                <DataTable
                    rows={observedOnly}
                    columns={columns}
                    rowKey={entry => entry.code}
                    initialSort={{ id: 'occurrences', desc: true }}
                />
            </Card>
        </div>
    );
};

export default CancerTypesPage;
