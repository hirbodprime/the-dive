import Dive from '@/components/Dive';
import { profile } from '@/content/data';

export default function Page() {
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: profile.name, jobTitle: profile.role, email: `mailto:${profile.email}`, url: '/', sameAs: [profile.github, profile.linkedin], address: { '@type': 'PostalAddress', addressLocality: 'Duisburg', addressCountry: 'DE' } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Dive />
    </>
  );
}
