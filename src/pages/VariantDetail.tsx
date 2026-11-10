import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    BarRow,
    Breadcrumbs,
    Card,
    Chip,
    Empty,
    ExternalLink,
    LevelPill,
    PlaceholderTag,
    Tabs,
} from '../components/ui';
import IgvPanel from '../components/IgvPanel';
import { EvidenceItem } from '../model/v2';
import {
    cancerTypeUrl,
    assayLabel,
    showsLabel,
    showsTone,
    systemLabel,
    eventUrl,
    getEvent,
    getReference,
    getVariant,
    geneUrl,
    sampleTypeLabel,
} from '../store/bundle';

/** One assay from one paper. The locator stays in the data, not on screen. */
const EvidenceItemRow: React.FC<{ item: EvidenceItem }> = ({ item }) => {
    const isPlaceholder = (field: string) => item.placeholders.includes(field);
    const curated = !!item.assay;
    return (
        <div className="evidence-row">
            <div className="row" style={{ marginBottom: 4 }}>
                {item.direction !== 'SUPPORTS' && (
                    <Chip tone="warn">{item.direction.toLowerCase()}</Chip>
                )}
                {curated ? (
                    <>
                        <strong>
                            {assayLabel[item.assay!] || item.assay}
                            {item.sequenced && ', product sequenced'}
                        </strong>
                        {item.shows && (
                            <Chip
                                tone={showsTone[item.shows] || 'neutral'}
                                title={`What this result demonstrates: ${
                                    showsLabel[item.shows] || item.shows
                                }`}
                            >
                                shows {showsLabel[item.shows] || item.shows}
                            </Chip>
                        )}
                    </>
                ) : (
                    <span className="muted">
                        Assay not curated
                        <PlaceholderTag
                            label="to curate"
                            title="The v1 data stores a citation but not how the abnormal transcript was shown. Reading the paper fills in the assay, what it was measured in, and what it demonstrates."
                        />
                    </span>
                )}
            </div>

            <div className="small muted">
                {item.system && (
                    <>Measured in {systemLabel[item.system] || item.system}</>
                )}
                {item.sample?.type && (
                    <>
                        {item.system ? ' · ' : ''}
                        {sampleTypeLabel[item.sample.type] || item.sample.type}
                        {item.sample.n ? ` (n = ${item.sample.n})` : ''}
                    </>
                )}
                {item.sample?.cancerType && (
                    <>
                        {' · '}
                        <Link to={cancerTypeUrl(item.sample.cancerType)}>
                            {item.sample.cancerType}
                        </Link>
                        {isPlaceholder('sample.cancerType') && (
                            <PlaceholderTag
                                label="inferred"
                                title="Inferred from the cohort distribution; the source's own tumour type is not recorded."
                            />
                        )}
                    </>
                )}
            </div>

            {item.finding && <div style={{ marginTop: 6 }}>{item.finding}</div>}
            {item.quantification && (
                <div className="small muted">{item.quantification}</div>
            )}
            {item.quote && <div className="evidence-quote small">“{item.quote}”</div>}
            {!curated && (
                <div className="small faint" style={{ marginTop: 6 }}>
                    Cited as the source; the paper has not been read into reVUE yet.
                </div>
            )}
        </div>
    );
};

/** Everything one paper contributes, under a single heading. */
const EvidenceSource: React.FC<{ source: string; items: EvidenceItem[] }> = ({
    source,
    items,
}) => {
    const reference = getReference(source);
    return (
        <div className="evidence-item">
            <div className="spread" style={{ marginBottom: 10 }}>
                <div>
                    <div style={{ fontWeight: 600 }}>
                        {reference?.pubmedId ? (
                            <ExternalLink
                                href={`https://pubmed.ncbi.nlm.nih.gov/${reference.pubmedId}/`}
                            >
                                {reference.citation || source}
                            </ExternalLink>
                        ) : (
                            reference?.citation || source
                        )}
                    </div>
                    {reference?.title && (
                        <div className="tiny muted" style={{ maxWidth: 520 }}>
                            {reference.title}
                            {reference.journal && (
                                <em>
                                    {' '}
                                    {reference.journal}
                                    {reference.year ? `, ${reference.year}` : ''}
                                </em>
                            )}
                        </div>
                    )}
                </div>
                <span className="tiny faint nowrap">
                    {items.length} item{items.length === 1 ? '' : 's'}
                </span>
            </div>
            <div className="evidence-rows">
                {items.map((item, index) => (
                    <EvidenceItemRow key={index} item={item} />
                ))}
            </div>
        </div>
    );
};

export const VariantDetail: React.FC = () => {
    const id = decodeURIComponent(useParams().id || '');
    const variant = getVariant(id);
    const [tab, setTab] = useState('evidence');

    if (!variant) {
        return (
            <div className="page">
                <Empty>No variant with id “{id}”.</Empty>
            </div>
        );
    }

    const event = getEvent(variant.eventId);
    const cancerTypes = variant.cancerTypes.length
        ? variant.cancerTypes
        : event?.cancerTypes || [];
    const inheritedFromEvent = !variant.cancerTypes.length;
    const maxObserved = variant.observedCancerTypes[0]?.count || 0;

    // The level is always a level *in* a tumour type. reVUE-data stores it
    // without one, so show the curated cancer type when there is one and fall
    // back to the cancer type this variant is most often observed in.
    // One block per paper: every assay that paper contributed, together.
    const evidenceBySource = Array.from(
        variant.evidence.reduce((map, item) => {
            map.set(item.source, [...(map.get(item.source) || []), item]);
            return map;
        }, new Map<string, EvidenceItem[]>())
    );

    const levelCancerType = cancerTypes.length
        ? { code: cancerTypes[0].code, name: cancerTypes[0].name, from: 'curated' }
        : variant.observedCancerTypes.length
        ? {
              code: variant.observedCancerTypes[0].code,
              name: variant.observedCancerTypes[0].name,
              from: 'most observed',
          }
        : null;

    const linkouts = [
        {
            name: 'cBioPortal',
            detail: 'Patients carrying this variant',
            // reVUE has no patient-level data; this is an example patient page
            // until a per-patient link is available.
            href: 'https://www.cbioportal.org/patient?studyId=msk_impact_2017&caseId=P-0000001',
            placeholder: true,
        },
        {
            name: 'Genome Nexus',
            detail: 'Annotation for this variant, including the reVUE override',
            href: `https://www.genomenexus.org/variant/${variant.grch37}`,
            placeholder: false,
        },
        {
            name: 'OncoKB',
            detail: 'Oncogenicity and therapeutic implications',
            href: `https://www.oncokb.org/hgvsg/${encodeURIComponent(variant.grch37)}`,
            placeholder: false,
        },
    ];

    const apiPreview = {
        transcriptConsequenceSummary: {
            transcriptId: variant.transcriptId,
            hgvspShort: variant.revisedProteinEffect,
            variantClassification: variant.revisedStandardVariantClassification,
            vepHgvspShort: variant.vepPredictedProteinEffect,
            vepVariantClassification: variant.vepPredictedVariantClassification,
            isVue: true,
            vueId: variant.id,
            vueVersion: variant.version,
        },
        vues: {
            id: variant.id,
            eventId: variant.eventId,
            hugoGeneSymbol: variant.gene,
            revisedProteinEffect: variant.revisedProteinEffect,
            revisedVariantClassification: variant.revisedVariantClassification,
            cancerTypes: cancerTypes.map(entry => ({
                code: entry.code,
                name: entry.name,
                origin: entry.origin,
            })),
        },
    };

    return (
        <div className="page stack">
            <div className="detail-header">
                <Breadcrumbs
                    items={[
                        { label: 'Variants', to: '/variants' },
                        { label: variant.gene, to: geneUrl(variant.gene) },
                        {
                            label: event?.name || variant.eventId,
                            to: eventUrl(variant.eventId),
                        },
                        { label: variant.id },
                    ]}
                />
                <div className="detail-title">
                    <h1 className="mono">{variant.id}</h1>
                    <LevelPill level={variant.oncokb.highestLevel} />
                    {variant.oncokb.oncogenic && <Chip>{variant.oncokb.oncogenic}</Chip>}
                    {variant.multipleGenomicRepresentations && (
                        <Chip
                            tone="warn"
                            title={`The source data spells this cDNA change ${variant.genomicRepresentations.length} different ways in genomic coordinates. Ids are HGVSc-based, so they are one record; every spelling is kept because Genome Nexus matches on HGVSg.`}
                        >
                            {variant.genomicRepresentations.length} genomic spellings
                        </Chip>
                    )}
                </div>
                <div className="row small muted">
                    <span className="mono">{variant.grch37}</span>
                    <span>·</span>
                    <span className="mono">{variant.hgvsc}</span>
                </div>
            </div>

            {event && (
                <Card title="Mechanism">
                    <p style={{ margin: 0 }}>{event.mechanism}</p>
                    <div className="small muted" style={{ marginTop: 6 }}>
                        {event.location} ·{' '}
                        <Link to={eventUrl(event.id)}>{event.name}</Link>
                    </div>
                    {variant.note && (
                        <p className="small" style={{ margin: '10px 0 0' }}>
                            <strong>Note:</strong> {variant.note}
                        </p>
                    )}
                </Card>
            )}

            <Card title="What reVUE changes">
                <div className="effect-compare">
                    <div className="effect-box">
                        <div className="label">VEP predicts</div>
                        <div className="effect-field">
                            <span className="effect-field-label">Protein change</span>
                            <span className="value">
                                {variant.vepPredictedProteinEffect || '—'}
                            </span>
                        </div>
                        <div className="effect-field">
                            <span className="effect-field-label">
                                Variant classification
                            </span>
                            <span className="value small-value">
                                {variant.vepPredictedVariantClassification || '—'}
                            </span>
                        </div>
                    </div>
                    <div className="effect-arrow">→</div>
                    <div className="effect-box revised">
                        <div className="label">reVUE revises to</div>
                        <div className="effect-field">
                            <span className="effect-field-label">Protein change</span>
                            <span className="value">
                                {variant.revisedProteinEffect || '—'}
                            </span>
                        </div>
                        <div className="effect-field">
                            <span className="effect-field-label">
                                Variant classification
                            </span>
                            <span className="value small-value">
                                {variant.revisedStandardVariantClassification || '—'}
                            </span>
                            {variant.revisedVariantClassification && (
                                <span className="tiny muted">
                                    reVUE class:{' '}
                                    <span className="mono">
                                        {variant.revisedVariantClassification}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Genomic location">
                <IgvPanel variant={variant} />
            </Card>

            <div className="two-col">
                <div className="stack">
                    <Card title="Cancer types">
                        <div className="section-label">
                            Curated cancer types
                            {inheritedFromEvent && event && (
                                <span className="faint"> · from {event.name}</span>
                            )}
                        </div>
                        {cancerTypes.length ? (
                            <div className="row" style={{ gap: 6, marginBottom: 18 }}>
                                {cancerTypes.map(entry => (
                                    <Chip
                                        key={entry.code}
                                        tone="curated"
                                        to={cancerTypeUrl(entry.code)}
                                        title={`${entry.name} (${entry.code}), ${entry.origin}`}
                                    >
                                        <span className="chip-dot" />
                                        {entry.name}
                                    </Chip>
                                ))}
                            </div>
                        ) : (
                            <div className="small faint" style={{ marginBottom: 18 }}>
                                None curated.
                            </div>
                        )}

                        <div className="section-label">
                            Cancer types observed in cohorts
                        </div>
                        {variant.observedCancerTypes.length ? (
                            variant.observedCancerTypes.map(row => (
                                <BarRow
                                    key={row.code}
                                    label={
                                        <Link to={cancerTypeUrl(row.code)}>{row.name}</Link>
                                    }
                                    value={row.count}
                                    max={maxObserved}
                                    tone={
                                        row.germline && !row.somatic ? 'germline' : 'somatic'
                                    }
                                />
                            ))
                        ) : (
                            <div className="small faint">
                                Not observed in MSK-IMPACT, GENIE or TCGA.
                            </div>
                        )}
                    </Card>

                    <Card
                        title={
                            <>
                                Evidence{' '}
                                <span className="faint small">
                                    ({variant.evidence.length})
                                </span>
                            </>
                        }
                    >
                        <Tabs
                            tabs={[
                                { id: 'evidence', label: 'Items' },
                                { id: 'api', label: 'API preview' },
                            ]}
                            active={tab}
                            onChange={setTab}
                        />
                        {tab === 'evidence' && (
                            <div className="stack" style={{ gap: 12 }}>
                                {evidenceBySource.map(([source, items]) => (
                                    <EvidenceSource
                                        key={source}
                                        source={source}
                                        items={items}
                                    />
                                ))}
                                {!variant.evidence.length && (
                                    <div className="small faint">
                                        No evidence items recorded.
                                    </div>
                                )}
                            </div>
                        )}
                        {tab === 'api' && (
                            <div>
                                <p className="small muted">
                                    What Genome Nexus would return for this variant on{' '}
                                    <span className="mono">{variant.transcriptId}</span>.
                                </p>
                                <pre className="code-block mono tiny">
                                    {JSON.stringify(apiPreview, null, 2)}
                                </pre>
                            </div>
                        )}
                    </Card>

                </div>

                <div className="stack">
                    <Card title="Identity">
                        <dl className="kv" style={{ gridTemplateColumns: '112px 1fr' }}>
                            <dt>Gene</dt>
                            <dd>
                                <Link className="mono" to={geneUrl(variant.gene)}>
                                    {variant.gene}
                                </Link>
                            </dd>
                            <dt>Event</dt>
                            <dd>
                                <Link to={eventUrl(variant.eventId)}>
                                    {event?.name || variant.eventId}
                                </Link>
                            </dd>
                            <dt>GRCh37</dt>
                            <dd className="mono small">
                                {variant.grch37}
                                {variant.multipleGenomicRepresentations && (
                                    <div className="tiny faint" style={{ marginTop: 4 }}>
                                        also written{' '}
                                        {variant.genomicRepresentations
                                            .slice(1)
                                            .map(item => item.grch37)
                                            .join(', ')}
                                    </div>
                                )}
                            </dd>
                            <dt>GRCh38</dt>
                            <dd>
                                {variant.grch38 ? (
                                    <span className="mono small">{variant.grch38}</span>
                                ) : (
                                    <PlaceholderTag
                                        label="not mapped yet"
                                        title="v2 requires both builds; the v1 source is GRCh37 only."
                                    />
                                )}
                            </dd>
                            <dt>HGVSc</dt>
                            <dd className="mono small">{variant.hgvsc}</dd>
                            <dt>Transcript</dt>
                            <dd className="mono small">{variant.transcriptId}</dd>
                            <dt>MAF location</dt>
                            <dd className="mono tiny" style={{ wordBreak: 'break-all' }}>
                                {variant.genomicLocation}
                            </dd>
                            <dt>Origin</dt>
                            <dd>{variant.mutationOrigin}</dd>
                            <dt>RNA change</dt>
                            <dd>
                                {variant.rnaChange || (
                                    <PlaceholderTag label="not recorded" />
                                )}
                            </dd>
                            <dt>Version</dt>
                            <dd className="mono small">v{variant.version}</dd>
                        </dl>
                        {variant.alternativeOutcomes.length > 0 && (
                            <>
                                <div className="section-label" style={{ marginTop: 16 }}>
                                    Alternative outcomes
                                </div>
                                {variant.alternativeOutcomes.map(outcome => (
                                    <div key={outcome.id} className="small">
                                        {outcome.description}
                                    </div>
                                ))}
                            </>
                        )}
                    </Card>

                    <Card title="OncoKB">
                        {variant.oncokb.highestLevel ? (
                            <div className="row" style={{ marginBottom: 8 }}>
                                <LevelPill level={variant.oncokb.highestLevel} />
                                {levelCancerType ? (
                                    <>
                                        <span className="faint">in</span>
                                        <Link to={cancerTypeUrl(levelCancerType.code)}>
                                            {levelCancerType.name}
                                        </Link>
                                        <PlaceholderTag
                                            label={levelCancerType.from}
                                            title={
                                                levelCancerType.from === 'curated'
                                                    ? "reVUE-data stores the level without a tumour type. This is the event's curated cancer type, not OncoKB's own tumour type for this level — refresh with an OncoKB token for that."
                                                    : "reVUE-data stores the level without a tumour type, and this event has no curated cancer type, so this is the cancer type the variant is most often observed in."
                                            }
                                        />
                                    </>
                                ) : (
                                    <span className="faint small">tumour type unknown</span>
                                )}
                            </div>
                        ) : (
                            <div className="small faint">No therapeutic level.</div>
                        )}
                        {variant.oncokb.oncogenic && (
                            <div className="row">
                                <Chip>{variant.oncokb.oncogenic}</Chip>
                            </div>
                        )}
                        {(variant.oncokb.asVepPredicted || variant.oncokb.asRevised) && (
                            <dl
                                className="kv small"
                                style={{ gridTemplateColumns: '150px 1fr', marginTop: 10 }}
                            >
                                <dt>For the VEP change</dt>
                                <dd>
                                    <LevelPill
                                        level={variant.oncokb.asVepPredicted?.highestLevel || null}
                                    />
                                </dd>
                                <dt>For the revised change</dt>
                                <dd>
                                    <LevelPill
                                        level={variant.oncokb.asRevised?.highestLevel || null}
                                    />
                                </dd>
                            </dl>
                        )}
                        <div className="tiny faint" style={{ marginTop: 10 }}>
                            Source: {variant.oncokb.source}
                        </div>
                    </Card>

                    <Card title="Linkouts">
                        <div className="linkouts">
                            {linkouts.map(link => (
                                <ExternalLink key={link.name} href={link.href}>
                                    {link.name}
                                </ExternalLink>
                            ))}
                        </div>
                        {linkouts.some(l => l.placeholder) && (
                            <div className="tiny faint" style={{ marginTop: 8 }}>
                                cBioPortal points at an example patient until
                                per-patient links exist.
                            </div>
                        )}
                    </Card>

                    <Card title="History">
                        <div className="timeline">
                            {variant.history.map((entry, index) => (
                                <div className="timeline-item" key={index}>
                                    <span className="mono tiny faint">{entry.release}</span>
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

export default VariantDetail;
