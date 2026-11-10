import React from 'react';
import { Link, useParams } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import {
    BarRow,
    Breadcrumbs,
    Card,
    Chip,
    Empty,
    ExternalLink,
    LevelPill,
    Notice,
    PlaceholderTag,
} from '../components/ui';
import { Variant } from '../model/v2';
import {
    cancerTypeUrl,
    getEvent,
    getReference,
    geneUrl,
    variantTotal,
    variantUrl,
} from '../store/bundle';

export const EventDetail: React.FC = () => {
    const id = decodeURIComponent(useParams().id || '');
    const event = getEvent(id);

    if (!event) {
        return (
            <div className="page">
                <Empty>No event with id “{id}”.</Empty>
            </div>
        );
    }

    const maxObserved = event.observedCancerTypes[0]?.count || 0;

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
            header: 'Revised to',
            value: variant => variant.revisedProteinEffect || '',
            render: variant => (
                <>
                    <div className="mono small" style={{ fontWeight: 600 }}>
                        {variant.revisedProteinEffect || '—'}
                    </div>
                    <div className="tiny faint">
                        {variant.revisedStandardVariantClassification || '—'}
                    </div>
                </>
            ),
        },
        {
            id: 'evidence',
            header: 'Evidence',
            value: variant => variant.evidence.length,
            render: variant => (
                <span className="small">
                    {variant.evidence.length} item
                    {variant.evidence.length === 1 ? '' : 's'}
                </span>
            ),
            width: 150,
        },
        {
            id: 'origin',
            header: 'Origin',
            value: variant => variant.mutationOrigin,
            render: variant => (
                <span className="small">{variant.mutationOrigin}</span>
            ),
            width: 90,
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
            <div className="detail-header">
                <Breadcrumbs
                    items={[
                        { label: 'Events', to: '/events' },
                        { label: event.gene, to: geneUrl(event.gene) },
                        { label: event.name },
                    ]}
                />
                <div className="detail-title">
                    <h1>{event.name}</h1>
                    <span className="chip chip-neutral mono">{event.id}</span>
                    <Chip>{event.variantCount} variants</Chip>
                    <LevelPill level={event.highestLevel} />
                    {event.placeholders.includes('id') && (
                        <PlaceholderTag
                            label="exon unknown"
                            title="The v1 data does not say which exon this event affects, so neither the name nor the id carries an exon number. A curator fills it in before release; the id changes with it, which is why it is provisional."
                        />
                    )}
                </div>
                <p className="muted" style={{ maxWidth: 860, margin: 0 }}>
                    {event.mechanism}
                </p>
                <div className="small faint">{event.location}</div>
            </div>

            {event.outcomes.length > 1 && (
                <Card
                    title={`This event produces ${event.outcomes.length} different protein effects`}
                >
                    <p className="small muted" style={{ marginTop: 0 }}>
                        The same abnormal transcript on{' '}
                        <span className="mono">{event.transcriptId}</span> can resolve
                        to more than one protein change, depending on where each
                        variant sits. Each variant below carries its own.
                    </p>
                    <div className="outcome-grid">
                        {event.outcomes.map(([protein, revueClass, mafClass]) => (
                            <div className="outcome" key={String(protein)}>
                                <div className="mono" style={{ fontWeight: 600 }}>
                                    {protein || '—'}
                                </div>
                                <div className="tiny muted">{revueClass || '—'}</div>
                                <div className="tiny faint">{mafClass || '—'} in MAF</div>
                                <div className="tiny faint">
                                    {
                                        event.variants.filter(
                                            v => v.revisedProteinEffect === protein
                                        ).length
                                    }{' '}
                                    variant
                                    {event.variants.filter(
                                        v => v.revisedProteinEffect === protein
                                    ).length === 1
                                        ? ''
                                        : 's'}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {event.warnings.length > 0 && (
                <Notice tone="warn">
                    {event.warnings.map(warning => (
                        <div key={warning}>{warning}</div>
                    ))}
                </Notice>
            )}

            <div className="two-col">
                <div className="stack">
                    <Card title="Cancer types">
                        <div className="stack" style={{ gap: 16 }}>
                            <div>
                                <div className="section-label">
                                    Curated cancer types
                                </div>
                                {event.cancerTypes.length ? (
                                    <div className="stack" style={{ gap: 8 }}>
                                        {event.cancerTypes.map(entry => (
                                            <div key={entry.code} className="row">
                                                <Link
                                                    className="chip chip-link"
                                                    to={cancerTypeUrl(entry.code)}
                                                    style={{ fontWeight: 600 }}
                                                >
                                                    {entry.name}
                                                </Link>
                                                <Chip>{entry.origin}</Chip>
                                                {entry.note && (
                                                    <span className="small muted">
                                                        {entry.note}
                                                    </span>
                                                )}
                                                {entry.sources.length > 0 && (
                                                    <span className="tiny faint">
                                                        {entry.sources.join(', ')}
                                                    </span>
                                                )}
                                                {entry.placeholder && (
                                                    <PlaceholderTag label="needs curator" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="small faint">
                                        None curated for this event.
                                        {event.legacyContext &&
                                            ` v1 context: “${event.legacyContext}”`}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="section-label">
                                    Cancer types observed in cohorts
                                </div>
                                {event.observedCancerTypes.length ? (
                                    event.observedCancerTypes.map(row => (
                                        <BarRow
                                            key={row.code}
                                            label={
                                                <Link to={cancerTypeUrl(row.code)}>
                                                    {row.name}
                                                </Link>
                                            }
                                            value={row.count}
                                            max={maxObserved}
                                        />
                                    ))
                                ) : (
                                    <div className="small faint">
                                        Not observed in the cohorts.
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card title={`Variants (${event.variantCount})`} pad={false}>
                        <DataTable
                            rows={event.variants}
                            columns={columns}
                            rowKey={variant => variant.id}
                            initialSort={{ id: 'count', desc: true }}
                        />
                    </Card>
                </div>

                <div className="stack">
                    <Card title="Event record">
                        <dl className="kv" style={{ gridTemplateColumns: '118px 1fr' }}>
                            <dt>Gene</dt>
                            <dd>
                                <Link className="mono" to={geneUrl(event.gene)}>
                                    {event.gene}
                                </Link>
                            </dd>
                            <dt>Transcript</dt>
                            <dd className="mono small">{event.transcriptId}</dd>
                            <dt>Event type</dt>
                            <dd>{event.eventType}</dd>
                            <dt>Outcome</dt>
                            <dd>{event.outcome}</dd>
                            {event.exon && (
                                <>
                                    <dt>Exon</dt>
                                    <dd>
                                        {event.exon}
                                        {event.exonSource === 'computed' && (
                                            <span className="tiny faint">
                                                {' '}
                                                · from the variants' positions on{' '}
                                                {event.transcriptId}
                                            </span>
                                        )}
                                    </dd>
                                </>
                            )}
                            <dt>Location</dt>
                            <dd className="small">{event.location}</dd>
                            <dt>Mechanism</dt>
                            <dd className="small">
                                {event.mechanism}
                                {event.mechanismSource && (
                                    <div className="tiny faint">
                                        as stated in {event.mechanismSource}
                                    </div>
                                )}
                            </dd>
                            {event.context && (
                                <>
                                    <dt>Context</dt>
                                    <dd className="small">{event.context}</dd>
                                </>
                            )}
                            {event.legacyContext && (
                                <>
                                    <dt>v1 context</dt>
                                    <dd className="small faint">
                                        “{event.legacyContext}” — converted to the cancer
                                        types above
                                    </dd>
                                </>
                            )}
                            <dt>Version</dt>
                            <dd className="mono small">v{event.version}</dd>
                        </dl>
                    </Card>

                    <Card title="References">
                        <div className="stack" style={{ gap: 10 }}>
                            {event.references.map(sourceId => {
                                const reference = getReference(sourceId);
                                if (!reference) {
                                    return (
                                        <div key={sourceId} className="mono small">
                                            {sourceId}
                                        </div>
                                    );
                                }
                                return (
                                    <div key={sourceId}>
                                        <div className="small">
                                            {reference.pubmedId ? (
                                                <ExternalLink
                                                    href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pubmedId}/`}
                                                >
                                                    {reference.citation}
                                                </ExternalLink>
                                            ) : (
                                                reference.citation
                                            )}
                                        </div>
                                        {reference.title && (
                                            <div className="tiny muted">
                                                {reference.title}{' '}
                                                {reference.journal && (
                                                    <em>
                                                        {reference.journal}
                                                        {reference.year
                                                            ? `, ${reference.year}`
                                                            : ''}
                                                    </em>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card title="History">
                        <div className="timeline">
                            {event.history.map((entry, index) => (
                                <div className="timeline-item" key={index}>
                                    <span className="mono tiny faint">
                                        {entry.release}
                                    </span>
                                    <span>
                                        <strong>{entry.change}</strong>{' '}
                                        <span className="muted">{entry.summary}</span>
                                        <div className="tiny faint">
                                            v{entry.version} ·{' '}
                                            {entry.material ? 'material' : 'editorial'} ·{' '}
                                            {entry.method}
                                        </div>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default EventDetail;
