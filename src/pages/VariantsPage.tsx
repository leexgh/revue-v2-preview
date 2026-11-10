import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import { Card, Chip, LevelPill, ObservedChip } from '../components/ui';
import { Variant } from '../model/v2';
import {
    cancerTypeSummaries,
    eventUrl,
    getEvent,
    geneUrl,
    genes,
    variantTotal,
    variantUrl,
    variants,
} from '../store/bundle';

const CLASSIFICATIONS = Array.from(
    new Set(
        variants
            .map(variant => variant.revisedVariantClassification)
            .filter((value): value is string => !!value)
    )
).sort();

const observedOptions = cancerTypeSummaries
    .filter(entry => entry.observedCount > 0)
    .slice(0, 40);

export const VariantsPage: React.FC = () => {
    const [text, setText] = useState('');
    const [gene, setGene] = useState('');
    const [classification, setClassification] = useState('');
    const [cancerType, setCancerType] = useState('');
    const [origin, setOrigin] = useState('');

    const rows = useMemo(() => {
        const needle = text.trim().toLowerCase();
        return variants.filter(variant => {
            if (gene && variant.gene !== gene) {
                return false;
            }
            if (
                classification &&
                variant.revisedVariantClassification !== classification
            ) {
                return false;
            }
            if (origin && variant.mutationOrigin !== origin) {
                return false;
            }
            if (
                cancerType &&
                !variant.observedCancerTypes.some(row => row.code === cancerType)
            ) {
                return false;
            }
            if (!needle) {
                return true;
            }
            return `${variant.id} ${variant.grch37} ${variant.hgvsc} ${
                variant.revisedProteinEffect || ''
            } ${variant.vepPredictedProteinEffect || ''} ${variant.eventId}`
                .toLowerCase()
                .includes(needle);
        });
    }, [text, gene, classification, cancerType, origin]);

    const columns: Column<Variant>[] = [
        {
            id: 'id',
            header: 'Variant',
            value: variant => variant.id,
            render: variant => (
                <>
                    <Link className="mono" to={variantUrl(variant.id)}>
                        {variant.id}
                    </Link>
                    <div className="tiny muted mono">{variant.grch37}</div>
                </>
            ),
        },
        {
            id: 'gene',
            header: 'Gene',
            value: variant => variant.gene,
            render: variant => (
                <Link className="mono" to={geneUrl(variant.gene)}>
                    {variant.gene}
                </Link>
            ),
            width: 80,
        },
        {
            id: 'vep',
            header: 'VEP predicts',
            value: variant => variant.vepPredictedProteinEffect || '',
            render: variant => (
                <>
                    <div className="mono small">
                        {variant.vepPredictedProteinEffect || '—'}
                    </div>
                    <div className="tiny faint">
                        {variant.vepPredictedVariantClassification}
                    </div>
                </>
            ),
        },
        {
            id: 'revised',
            header: 'reVUE revises to',
            value: variant => variant.revisedProteinEffect || '',
            render: variant => (
                <>
                    <div className="mono small" style={{ fontWeight: 600 }}>
                        {variant.revisedProteinEffect || '—'}
                    </div>
                    <div className="tiny faint">
                        {variant.revisedVariantClassification || '—'}
                    </div>
                </>
            ),
        },
        {
            id: 'event',
            header: 'Event',
            value: variant => variant.eventId,
            render: variant => (
                <Link className="small" to={eventUrl(variant.eventId)}>
                    {getEvent(variant.eventId)?.name || variant.eventId}
                </Link>
            ),
        },
        {
            id: 'observed',
            header: 'Observed in',
            value: variant => variant.observedCancerTypes[0]?.name || '',
            render: variant =>
                variant.observedCancerTypes.length ? (
                    <span className="row" style={{ gap: 4 }}>
                        {variant.observedCancerTypes.slice(0, 2).map(row => (
                            <ObservedChip key={row.code} row={row} />
                        ))}
                        {variant.observedCancerTypes.length > 2 && (
                            <span className="faint tiny">
                                +{variant.observedCancerTypes.length - 2}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="faint">not seen in cohorts</span>
                ),
        },
        {
            id: 'origin',
            header: 'Origin',
            value: variant => variant.mutationOrigin,
            render: variant =>
                variant.mutationOrigin === 'unknown' ? (
                    <span className="faint small">unknown</span>
                ) : (
                    <Chip>{variant.mutationOrigin}</Chip>
                ),
            width: 96,
        },
        {
            id: 'level',
            header: 'OncoKB',
            value: variant => variant.oncokb.highestLevel || '',
            render: variant => <LevelPill level={variant.oncokb.highestLevel} />,
            width: 96,
        },
        {
            id: 'count',
            header: 'Occurrences',
            value: variant => variantTotal(variant),
            align: 'right',
            render: variant => (
                <span className="mono">{variantTotal(variant).toLocaleString()}</span>
            ),
            width: 110,
        },
    ];

    return (
        <div className="page stack">
            <div>
                <h1>Variants</h1>
                <p className="muted" style={{ marginTop: 6 }}>
                    Every curated variant, what VEP predicts for it, and what reVUE revises
                    it to.
                </p>
            </div>

            <Card
                title={`${rows.length} of ${variants.length} variants`}
                pad={false}
                actions={
                    <div className="filters">
                        <input
                            className="filter-input"
                            placeholder="Filter by variant, position, effect…"
                            value={text}
                            onChange={event => setText(event.target.value)}
                        />
                        <select
                            className="filter-select"
                            value={gene}
                            onChange={event => setGene(event.target.value)}
                        >
                            <option value="">All genes</option>
                            {genes.map(entry => (
                                <option key={entry.gene} value={entry.gene}>
                                    {entry.gene}
                                </option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={classification}
                            onChange={event => setClassification(event.target.value)}
                        >
                            <option value="">All revised classifications</option>
                            {CLASSIFICATIONS.map(value => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={cancerType}
                            onChange={event => setCancerType(event.target.value)}
                        >
                            <option value="">Observed in any cancer type</option>
                            {observedOptions.map(entry => (
                                <option key={entry.code} value={entry.code}>
                                    {entry.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={origin}
                            onChange={event => setOrigin(event.target.value)}
                        >
                            <option value="">Any origin</option>
                            <option value="somatic">Somatic</option>
                            <option value="germline">Germline</option>
                            <option value="unknown">Unknown</option>
                        </select>
                        {(text || gene || classification || cancerType || origin) && (
                            <button
                                className="ghost-button"
                                onClick={() => {
                                    setText('');
                                    setGene('');
                                    setClassification('');
                                    setCancerType('');
                                    setOrigin('');
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                }
            >
                <DataTable
                    rows={rows}
                    columns={columns}
                    rowKey={variant => variant.id}
                    initialSort={{ id: 'count', desc: true }}
                    sortLast={variant => variant.gene === 'TERT'}
                />
            </Card>
        </div>
    );
};

export default VariantsPage;
