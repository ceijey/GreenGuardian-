'use client';

import ResourceHub from '@/components/ResourceHub';
import Header from '@/components/Header';

export default function ResourcesIndex() {
  return (
    <>
      <Header logo="fas fa-leaf" title="GREENGUARDIAN" />
      <main className="main-content">
        <ResourceHub />
      </main>
    </>
  );
}
