import { notFound } from 'next/navigation';
import JointLevelClient from './JointLevelClient';
import type { DifficultyLevel } from '@/lib/types';

export function generateStaticParams() {
  return [1, 2, 3, 4, 5].map((level) => ({ level: String(level) }));
}

export default async function JointLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const lvl = Number(level) as DifficultyLevel;
  if (![1, 2, 3, 4, 5].includes(lvl)) notFound();
  return <JointLevelClient level={lvl} />;
}
