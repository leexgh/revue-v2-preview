import React from 'react';
import { Card, ExternalLink, Notice } from '../components/ui';
import { bundle, totals } from '../store/bundle';

const SNIPPET = `{
  "transcriptConsequenceSummary": {
    "transcriptId": "ENST00000257430",
    "hgvspShort": "p.G279Ffs*10",
    "variantClassification": "Frame_Shift_Ins",
    "vepHgvspShort": "p.*279*",
    "vepVariantClassification": "Splice_Region",
    "isVue": true,
    "vueId": "APC:c.835-8A>G",
    "vueVersion": 1
  },
  "vues": {
    "id": "APC:c.835-8A>G",
    "eventId": "APC-EXT",
    "revisedProteinEffect": "p.G279Ffs*10",
    "cancerTypes": [
      { "code": "COADREAD", "name": "Colorectal Adenocarcinoma",
        "origin": "somatic" }
    ]
  }
}`;

export const DataAccess: React.FC = () => (
    <div className="page page-narrow stack">
        <div>
            <h1>Data &amp; API</h1>
            <p className="muted" style={{ marginTop: 8 }}>
                How to get reVUE data, and what consumers see.
            </p>
        </div>

        <Notice tone="warn">
            <strong>This is a preview build.</strong> {bundle.notice}
        </Notice>

        <Card title="Through an annotator">
            <p>
                Most users never need reVUE directly. VUE annotations are integrated into{' '}
                <ExternalLink href="https://genomenexus.org">Genome Nexus</ExternalLink> and{' '}
                <ExternalLink href="https://www.oncokb.org">OncoKB</ExternalLink>: when a
                variant is in reVUE, Genome Nexus replaces the predicted{' '}
                <span className="mono">hgvspShort</span> and{' '}
                <span className="mono">variantClassification</span> with the curated ones,
                keeps the original VEP values alongside, and adds a{' '}
                <span className="mono">vues</span> block.
            </p>
            <pre
                className="mono tiny"
                style={{
                    background: 'var(--bg-sunken)',
                    padding: 14,
                    borderRadius: 10,
                    overflowX: 'auto',
                }}
            >
                {SNIPPET}
            </pre>
            <p className="small muted" style={{ marginBottom: 0 }}>
                There is no confirmed/unconfirmed flag and no level enum: an entry is
                either curated in reVUE or it is not, and every curated entry's revised
                effect is applied. How strong the backing is, is judged from the
                evidence items on the variant.
            </p>
        </Card>

        <Card title="The dataset">
            <dl className="kv">
                <dt>Release</dt>
                <dd className="mono">{bundle.release}</dd>
                <dt>Schema version</dt>
                <dd className="mono">{bundle.schemaVersion}</dd>
                <dt>Source repository</dt>
                <dd>
                    <ExternalLink
                        href={`https://github.com/${bundle.source.repository}`}
                    >
                        {bundle.source.repository}
                    </ExternalLink>
                </dd>
                <dt>Built from</dt>
                <dd className="mono">{bundle.source.file}</dd>
                <dt>Contents</dt>
                <dd>
                    {totals.genes} genes · {totals.events} events · {totals.variants}{' '}
                    variants · {totals.references} references ·{' '}
                    {totals.observedCancerTypes} cancer types
                </dd>
            </dl>
            <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}>
                Consumers pin a release tag rather than following <span className="mono">main</span>,
                so an annotation can always be traced back to the exact record version that
                produced it. Every event and variant carries its own version and an
                append-only history.
            </p>
        </Card>

        <Card title="Fields a consumer should know about">
            <dl className="kv">
                <dt className="mono">vueId / vueVersion</dt>
                <dd>
                    The record this annotation came from, e.g.{' '}
                    <span className="mono">MET:c.3028+1G&gt;A</span> version 2.
                </dd>
                <dt className="mono">vues.cancerTypes</dt>
                <dd>
                    Curated cancer types only — code, name and origin. The
                    observed cohort distribution is deliberately not sent through the API;
                    it is a cohort snapshot and lives on this site.
                </dd>
                <dt className="mono">vepHgvspShort</dt>
                <dd>
                    The original VEP prediction, kept whenever an override was applied, so
                    nothing is lost.
                </dd>
            </dl>
        </Card>
    </div>
);

export default DataAccess;
