# reVUE v2 preview

A redesign of [cancerrevue.org](https://www.cancerrevue.org) over a v2 data
model. **Live site: https://leexgh.github.io/revue-v2-preview**

reVUE curates variants whose real protein effect differs from what annotation
tools predict. This preview reorganises that data and adds what the current
site cannot show.

## What is new

- **Events.** Variants are grouped by the abnormal transcript they produce —
  "MET exon 14 skipping", "KIT exon 11 shortening" — rather than listed per
  gene. 125 variants in 40 events across 26 genes.
- **Cancer types as data.** Curated associations on OncoTree codes, shown next
  to the distribution actually observed in MSK-IMPACT, GENIE and TCGA. The two
  are allowed to disagree.
- **Evidence per source.** Each item records the assay, what it was measured in,
  what the result demonstrates, and a locator a reader can open.
- **No confirmed flag.** Every curated entry's revised effect is applied; how
  well an entry is backed is read from its evidence.
- **IGV** on every variant page, and OncoKB levels refreshed from the API with
  the tumour type they apply to.

## Data

`src/data/revue.v2.json` is built from the curated
[reVUE-data](https://github.com/knowledgesystems/reVUE-data) `generated/VUEs.json`:

```bash
python3 scripts/build_v2_bundle.py            # add ONCOKB_TOKEN to refresh levels
```

It resolves cancer types against OncoTree, exon numbers against Ensembl GRCh37,
reference metadata against PubMed, and therapeutic levels against OncoKB.

Curated values are real reVUE data. Fields the v2 model adds but v1 cannot
supply — GRCh38 coordinates, most evidence detail, some cancer type assignments
— are placeholders and are labelled as such on screen. Evidence for the Yaeger
2018 variants was read out of that paper and is real.

## Running it

```bash
npm install
npm start          # http://localhost:3000
npm run deploy     # build and publish to GitHub Pages
```
