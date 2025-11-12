'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { useState } from 'react';
import styles from './articles.module.css';

const ARTICLES = [
  {
    id: 1,
    title: 'The Importance of Urban Trees',
    excerpt: 'Urban trees provide shade, reduce heat islands, improve air quality, and support biodiversity in cities.',
    icon: 'fas fa-tree',
    content: `
      Urban trees are vital to creating livable, healthy cities. They provide cooling shade, reduce urban heat island effects (where cities are significantly hotter than surrounding areas), improve air quality by filtering pollutants, and create habitats for local wildlife.
      \n\nSmall actions like planting native species, protecting mature trees, and maintaining green spaces make a substantial difference. Studies show that trees can reduce surrounding temperatures by up to 8°C. Every tree planted contributes to a greener future.
      \n\nPlanting trees locally supports biodiversity, increases property values, and improves mental health. Consider joining or starting a community tree-planting initiative in your area.
    `,
  },
  {
    id: 2,
    title: 'Understanding Climate Change: Causes and Solutions',
    excerpt: 'Climate change is driven by greenhouse gas emissions. Understanding the science helps us take effective action.',
    icon: 'fas fa-globe',
    content: `
      Climate change is one of the most pressing challenges of our time. It's caused primarily by greenhouse gases—CO₂, methane, and nitrous oxide—released from burning fossil fuels, agriculture, and industrial processes.
      \n\nThe consequences include rising global temperatures, extreme weather events, sea-level rise, and threats to ecosystems and food security. However, solutions exist: transitioning to renewable energy, improving energy efficiency, protecting forests, and adopting sustainable agriculture.
      \n\nIndividual actions—reducing consumption, choosing renewable energy, and supporting climate-friendly policies—combined with large-scale systemic change can slow and mitigate climate impacts.
    `,
  },
  {
    id: 3,
    title: 'Sustainable Living: Simple Steps for Big Impact',
    excerpt: 'Small lifestyle changes can significantly reduce your environmental footprint.',
    icon: 'fas fa-home',
    content: `
      Sustainable living isn't about perfection—it's about making conscious choices that reduce your environmental impact.
      \n\nStart with the basics: reduce energy use by improving home insulation and switching to LED bulbs, conserve water by fixing leaks and taking shorter showers, and minimize waste through recycling and composting.
      \n\nChoose sustainable products, support ethical businesses, and consider vegetarian or vegan options more often. Buy local and seasonal when possible. By making these small changes, you reduce your carbon footprint, save money, and inspire others to do the same.
    `,
  },
  {
    id: 4,
    title: 'Ocean Conservation: Protecting Marine Ecosystems',
    excerpt: 'Our oceans are under threat. Here\'s what you need to know and how you can help.',
    icon: 'fas fa-water',
    content: `
      The world's oceans are facing unprecedented challenges: overfishing, pollution, plastic waste, and climate change. Marine ecosystems support over 3 billion people globally and produce half the world's oxygen.
      \n\nProtecting oceans requires reducing plastic use, supporting sustainable fishing, and advocating for marine protected areas. Individual actions include choosing sustainable seafood, reducing single-use plastics, and supporting ocean conservation organizations.
      \n\nClean oceans mean healthier communities, thriving fisheries, and a stable climate. Every action to reduce ocean pollution and support marine life conservation matters.
    `,
  },
  {
    id: 5,
    title: 'The Circular Economy: Rethinking Production and Consumption',
    excerpt: 'A circular economy reduces waste by keeping resources in use longer.',
    icon: 'fas fa-recycle',
    content: `
      The traditional linear economy (take-make-dispose) is unsustainable. The circular economy offers an alternative: keep materials and products in use as long as possible, extract maximum value, and recover resources at end-of-life.
      \n\nThis means designing products for durability and repairability, choosing quality over quantity, and supporting businesses that embrace circular practices. Participate by repairing items instead of replacing them, buying secondhand, and choosing products with minimal or recyclable packaging.
      \n\nTransitioning to a circular economy reduces resource extraction, waste, and emissions while creating jobs and saving money. Support this shift in your consumer choices and advocacy.
    `,
  },
];

export default function ArticlesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId ? ARTICLES.find((a) => a.id === selectedId) : null;

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
            </article>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h1>Environmental Awareness Articles</h1>
              <p>Learn about climate change, sustainable living, and conservation.</p>
            </div>
            <div className={`grid-responsive ${styles.grid}`}>
              {ARTICLES.map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedId(article.id)}
                  className={`card ${styles.articleButton}`}
                >
                  <div className={styles.articleHeader}>
                    <div className={styles.articleIcon}>
                      <i className={article.icon}></i>
                    </div>
                    <h2 className={styles.articleTitle}>{article.title}</h2>
                  </div>
                  <p className={styles.articleExcerpt}>{article.excerpt}</p>
                </button>
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
