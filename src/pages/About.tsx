import React from 'react';
import { Card, ExternalLink } from '../components/ui';
import { totals } from '../store/bundle';

export const About: React.FC = () => (
    <div className="page page-narrow stack">
        <div>
            <h1>About reVUE</h1>
            <p className="muted" style={{ marginTop: 8 }}>
                A repository for Variants with Unexpected Effects in cancer.
            </p>
        </div>

        <Card>
            <p>
                Clinical sequencing of tumor samples has emerged as a component of routine
                cancer care. By identifying genomic alterations that contribute to tumor
                initiation or progression, clinical sequencing may be used to identify
                predictive biomarkers of drug response, refine patient cancer diagnoses,
                assess heritable cancer risk, or inform patient prognosis. Most genomic
                alterations are accurately annotated with tools such as the Variant Effect
                Predictor (VEP) that infer their effects on the mRNA and protein by
                following basic rules of transcription, mRNA post-transcriptional
                processing, and translation.
            </p>
            <p>
                However, some genomic variants are not as easily captured by these rules,
                which can cause inappropriate or unclear annotation of the protein effect.
                A variant that alters an existing splice site or creates a new one can
                inactivate or activate the protein and, similarly, specific mutations in
                the non-coding promoter region of a gene may de-regulate gene expression.
                Collectively, we term these variants{' '}
                <b>variants with unexpected effects (VUE)</b>.
            </p>
            <p>
                <b>
                    Certain VUEs may have therapeutic implications, which, if mis-annotated,
                    may lead to suboptimal treatment decisions for individual patients with
                    cancer.
                </b>{' '}
                For example, in-frame KIT exon 11 deletions are recurrent in patients with
                gastrointestinal stromal tumors (GIST) and are biomarkers for the use of
                imatinib as first-line therapy. About 2–3% of GIST tumors harbor KIT exon 11
                deletions that extend into the non-coding intron between exons 10 and 11.
                Although these events have been shown to cause in-frame deletions, they are
                typically misclassified as inactivating splice site mutations, precluding
                patients carrying these mutations from receiving standard care imatinib.
            </p>
            <p>
                reVUE curates and stores all VUE-relevant information, is freely accessible
                via this website and through an API, and accepts feedback and submission of
                new VUEs from the cancer genomics community. It is intended for clinical
                bioinformatic pipelines that need to annotate DNA mutations accurately, with
                important implications for the subset of patients whose cancers harbor VUEs.
            </p>
            <p className="muted">
                Funding generously provided by{' '}
                <ExternalLink href="https://www.the-ici-fund.org/recipients/details/revue-repository-for-variants-with-unexpected-effects">
                    Innovation in Cancer Informatics (ICI)
                </ExternalLink>
                .
            </p>
        </Card>

        <Card title="How this release is organised">
            <dl className="kv">
                <dt>Event</dt>
                <dd>
                    One abnormal transcript — MET exon 14 skipping, KIT exon 11 shortening —
                    together with every curated variant that produces it. The event holds
                    what those variants share: the mechanism, the location, and the cancer
                    types. There are {totals.events} events in this release.
                </dd>
                <dt>Variant</dt>
                <dd>
                    One curated variant, with its own VEP prediction and its own revised
                    protein effect and classifications. Nothing is inherited except cancer
                    types. There are {totals.variants} variants.
                </dd>
                <dt>Evidence</dt>
                <dd>
                    One item per source and method: the assay type, the sample it was seen
                    in, what was found, where to check it in the paper, and a verbatim
                    quote.
                </dd>
                <dt>Cancer type</dt>
                <dd>
                    A cancer type a curator has tied to an event, as an OncoTree code
                    with its origin (somatic or germline), shown next to the distribution
                    actually observed in MSK-IMPACT, GENIE and TCGA.
                </dd>
                <dt>No confirmed flag</dt>
                <dd>
                    Earlier releases split entries into confirmed and unconfirmed, which
                    acted as an on/off switch for annotation. That flag is gone: every
                    entry curated here is a VUE and its revised effect is applied. The
                    evidence items on each variant are what a reader weighs instead.
                </dd>
            </dl>
        </Card>

        <Card title="Contact and contributions">
            <p>
                Know of a variant whose real effect differs from what annotation tools
                predict?{' '}
                <ExternalLink href="https://docs.google.com/forms/d/e/1FAIpQLSemX-RHhbMhDcrvA5xT44QbK3PiBAiZNP1qhOT72wketzbw_g/viewform">
                    Submit it
                </ExternalLink>
                , or open an issue on{' '}
                <ExternalLink href="https://github.com/knowledgesystems/reVUE-data">
                    reVUE-data
                </ExternalLink>
                . Every submission is reviewed by a curator before it is published.
            </p>
        </Card>
    </div>
);

export default About;
