import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicArticle } from "../../../server/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) return { title: "记录不可用" };
  return { title: article.title, description: article.summary };
}

export default async function RecordPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPublicArticle(slug);
  if (!article) notFound();

  return (
    <main>
      <article>
        <header>
          <p>公开 · 合成样本</p>
          <h1>{article.title}</h1>
          <time dateTime={article.date}>{article.date}</time>
          <p>{article.summary}</p>
        </header>
        <div className="record-body" dangerouslySetInnerHTML={{ __html: article.html }} />
      </article>
    </main>
  );
}
