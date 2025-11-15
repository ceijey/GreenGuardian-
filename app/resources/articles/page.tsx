'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useState } from 'react';
import styles from './articles.module.css';

const ARTICLES = [
  {
    id: 1,
    title: 'How Planting Trees Can Help in the Fight Against Climate Change',
    excerpt: 'A Yale study quantifies how restoring global forests could sequester a massive amount of carbon, but notes it is not a substitute for cutting emissions.',
    icon: 'fas fa-tree',
    content: `
      A study from Yale University, published in the journal Nature, highlights the immense potential of global forest restoration as a natural climate solution. The research estimates that allowing natural regeneration on available land could capture up to 8.9 billion metric tons of carbon dioxide from the atmosphere annually.
      \n\nThis "tree restoration" strategy is one of the most effective large-scale carbon capture solutions available. However, the authors caution that this must be done in conjunction with drastic reductions in greenhouse gas emissions from fossil fuels; it is a complementary strategy, not a replacement. The success of such efforts also depends on protecting existing forests and respecting the land rights of local and Indigenous communities.
    `,
    source: 'Nature - "The global potential for forest restoration is vast"',
    url: 'https://www.nature.com/articles/s43247-024-01737-5'
  },
  {
    id: 2,
    title: 'A Major Report Finds Climate Change Impacts Are Worsening',
    excerpt: 'The UN\'s IPCC report details that the world must take "rapid, deep and immediate" cuts to carbon emissions to avoid the worst impacts.',
    icon: 'fas fa-globe',
    content: `
      The Intergovernmental Panel on Climate Change (IPCC), the United Nations' body for assessing climate science, has released a synthesis report confirming that human activities have unequivocally caused global warming. The report states that impacts like heatwaves, extreme rainfall, and sea-level rise are already occurring more rapidly and with greater intensity than previously anticipated.
      \n\nThe report stresses that while the situation is dire, there is a rapidly closing window of opportunity to secure a livable future. It calls for "rapid, deep and, in most cases, immediate greenhouse gas emissions reductions" across all sectors. This includes a accelerated transition to renewable energy, widespread electrification, and improved energy efficiency. The solutions are available and increasingly cost-effective, but they require unprecedented political and societal will.
    `,
    source: 'IPCC AR6 Synthesis Report: Climate Change 2023',
    url: 'https://www.ipcc.ch/report/ar6/syr/'
  },
  {
    id: 3,
    title: 'How to Reduce Your Carbon Footprint',
    excerpt: 'The Nature Conservancy provides practical strategies for individuals to lower their carbon emissions through daily choices and lifestyle changes.',
    icon: 'fas fa-home',
    content: `
      Reducing your carbon footprint involves making conscious choices in your daily life. According to The Nature Conservancy, some of the most impactful actions include addressing your transportation habits, as the average car produces about 4.6 metric tons of carbon dioxide per year. Consider walking, biking, carpooling, or using public transportation when possible.
      \n\nAt home, focus on energy efficiency: switch to LED light bulbs, use a programmable thermostat, wash clothes in cold water, and unplug electronics when not in use. Your food choices also matter - reducing meat consumption, especially beef, can significantly lower your carbon footprint since livestock production generates substantial greenhouse gases. Additionally, minimize food waste and compost when possible.
      \n\nRemember that small changes add up, and your individual actions contribute to collective impact in addressing climate change.
    `,
    source: 'Reducing Your Transportation Footprint-C2ES',
    url: 'https://www.c2es.org/content/reducing-your-transportation-footprint/'
  },
  {
    id: 4,
    title: 'The World Has a Plastic Pollution Problem – Here\'s What You Can Do',
    excerpt: 'National Geographic outlines the scale of the ocean plastic crisis and provides actionable steps for individuals to be part of the solution.',
    icon: 'fas fa-water',
    content: `
      Plastic pollution has become one of the most pressing environmental issues, with millions of tons of plastic waste entering our oceans every year, harming marine life and ecosystems. National Geographic highlights that the problem starts on land and is driven by single-use plastics.
      \n\nThe article suggests several ways individuals can help: refusing single-use plastics like bags, straws, and cutlery; choosing products with minimal or no packaging; participating in local clean-up events; and properly recycling. More importantly, it encourages a shift in mindset from a "throwaway culture" to one that values reusability and circular systems. Supporting policies that hold producers responsible for plastic waste is also a powerful lever for change.
    `,
    source: 'National Geographic - "The world has a plastic pollution problem"',
    url: 'https://www.nationalgeographic.com/environment/article/plastic-pollution'
  },
  {
    id: 5,
    title: 'What is a Circular Economy?',
    excerpt: 'The Ellen MacArthur Foundation explains the principles of a circular economy, a systemic approach designed to benefit businesses, society, and the environment.',
    icon: 'fas fa-recycle',
    content: `
      A circular economy is a model that tackles global challenges like climate change, biodiversity loss, and pollution by moving away from the traditional "take-make-waste" linear model. It is based on three principles, driven by design: eliminate waste and pollution, circulate products and materials (at their highest value), and regenerate nature.
      \n\nThis means designing products to be durable, repairable, and recyclable from the start. It promotes business models like sharing, leasing, and repairing to keep products and materials in use. By creating a closed-loop system, we reduce the extraction of virgin resources, minimize environmental impact, and build economic resilience. It's not just about recycling better; it's about rethinking the entire system to be restorative and regenerative by design.
    `,
    source: 'Ellen MacArthur Foundation - "What is a circular economy?"',
    url: 'https://www.ellenmacarthurfoundation.org/topics/circular-economy-introduction/overview'
  },
];

export default function ArticlesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId ? ARTICLES.find((a) => a.id === selectedId) : null;

  const handleVisitSource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className={`main-content container ${styles.container}`}>
        {selected ? (
          <div className={`card ${styles.detailView}`}>
            <button
              onClick={() => setSelectedId(null)}
              className={`btn btn-secondary ${styles.backButton}`}
            >
              ← Back to Articles
            </button>
            <div className={styles.detailHeader}>
              <div className={styles.detailIcon}>
                <i className={selected.icon}></i>
              </div>
              <h1 className={styles.detailTitle}>{selected.title}</h1>
            </div>
            <article className={styles.article}>
              {selected.content.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <div className={styles.sourceSection}>
                <p className={styles.sourceText}>
                  <strong>Source:</strong> {selected.source}
                </p>
                <button
                  onClick={() => handleVisitSource(selected.url)}
                  className={`btn btn-primary ${styles.sourceButton}`}
                >
                  <i className="fas fa-external-link-alt"></i> Visit Original Article
                </button>
              </div>
            </article>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h1>Environmental Awareness Articles</h1>
              <p>Learn about climate change, sustainable living, and conservation from credible sources.</p>
            </div>
            <div className={`grid-responsive ${styles.grid}`}>
              {ARTICLES.map((article) => (
                <div key={article.id} className={`card ${styles.articleCard}`}>
                  <div className={styles.articleHeader}>
                    <div className={styles.articleIcon}>
                      <i className={article.icon}></i>
                    </div>
                    <h2 className={styles.articleTitle}>{article.title}</h2>
                  </div>
                  <p className={styles.articleExcerpt}>{article.excerpt}</p>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => setSelectedId(article.id)}
                      className={`btn btn-primary ${styles.readButton}`}
                    >
                      <i className="fas fa-book-open"></i> Read Article
                    </button>
                    <button
                      onClick={() => handleVisitSource(article.url)}
                      className={`btn btn-secondary ${styles.linkButton}`}
                    >
                      <i className="fas fa-external-link-alt"></i> Visit Source
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.footer}>
          <Link href="/resources" className="btn btn-secondary">Back to resources</Link>
        </div>
      </main>
    </>
  );
}