import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface CelebrityEmbeddingRow {
  name: string;
  lastUpdated: string;
  source: string;
}

async function refreshGalleryAction() {
  'use server';

  const apiBase = process.env.CYRANO_CORE_API_URL ?? 'http://localhost:3000';

  try {
    const response = await fetch(`${apiBase}/cyrano/ai-twin/curator/refresh`, {
      method: 'POST',
      cache: 'no-store',
    });

    if (!response.ok) {
      redirect('/admin/curator?refresh=error');
    }

    revalidatePath('/admin/curator');
    redirect('/admin/curator?refresh=ok');
  } catch {
    redirect('/admin/curator?refresh=error');
  }
}

async function getEmbeddings(): Promise<CelebrityEmbeddingRow[]> {
  const apiBase = process.env.CYRANO_CORE_API_URL ?? 'http://localhost:3000';

  try {
    const response = await fetch(`${apiBase}/cyrano/ai-twin/curator/embeddings`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as CelebrityEmbeddingRow[];
  } catch {
    return [];
  }
}

export default async function CuratorAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ refresh?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const embeddings = await getEmbeddings();
  const refreshState = params?.refresh;

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif', maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Curator Admin Gallery</h1>
          <p style={{ color: '#666', marginTop: 0 }}>
            Review the current celebrity embedding gallery and manually trigger the curator task.
          </p>
        </div>
        <form action={refreshGalleryAction}>
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Refresh Gallery
          </button>
        </form>
      </div>

      {refreshState === 'ok' && (
        <p style={{ color: '#176b2c', marginTop: 16 }}>Curator refresh triggered successfully.</p>
      )}
      {refreshState === 'error' && (
        <p style={{ color: '#a02020', marginTop: 16 }}>
          Curator refresh could not be triggered. Verify the core API is running.
        </p>
      )}

      <div
        style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Last Updated</th>
              <th style={tableHeaderStyle}>Source</th>
            </tr>
          </thead>
          <tbody>
            {embeddings.length === 0 ? (
              <tr>
                <td style={tableCellStyle} colSpan={3}>
                  No celebrity embeddings found yet.
                </td>
              </tr>
            ) : (
              embeddings.map((embedding) => (
                <tr key={`${embedding.name}-${embedding.lastUpdated}`}>
                  <td style={tableCellStyle}>{embedding.name}</td>
                  <td style={tableCellStyle}>{new Date(embedding.lastUpdated).toLocaleString()}</td>
                  <td style={tableCellStyle}>{embedding.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const tableHeaderStyle = {
  textAlign: 'left' as const,
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tableCellStyle = {
  padding: 12,
  borderBottom: '1px solid #eee',
};
