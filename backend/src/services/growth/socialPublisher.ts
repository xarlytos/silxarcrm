import { PrismaClient, ContentPiece, SocialPlatform } from '@prisma/client';

const prisma = new PrismaClient();

interface PublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}

/**
 * Publica un post en la red social correspondiente
 */
export async function publishPost(content: ContentPiece, accessToken: string): Promise<PublishResult> {
  if (!content.platform) {
    return { success: false, error: 'No se especificó plataforma' };
  }

  switch (content.platform) {
    case 'LINKEDIN':
      return publishLinkedIn(content, accessToken);
    case 'FACEBOOK':
      return publishFacebook(content, accessToken);
    case 'INSTAGRAM':
      return publishInstagram(content, accessToken);
    case 'X':
      return publishX(content, accessToken);
    case 'TIKTOK':
      return publishTikTok(content, accessToken);
    default:
      return { success: false, error: 'Plataforma no soportada' };
  }
}

/**
 * Publicar en LinkedIn
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api
 */
async function publishLinkedIn(content: ContentPiece, token: string): Promise<PublishResult> {
  try {
    // Obtener URN del usuario
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
    });

    if (!profileRes.ok) throw new Error('Token de LinkedIn inválido');

    const profile: any = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.id}`;

    const response = await fetch('https://api.linkedin.com/v2/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: content.body,
        visibility: 'PUBLIC',
        distribution: {
          linkedInDistributionTarget: {},
        },
        lifecycleState: 'PUBLISHED',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result: any = await response.json();
    const postUrn = result.id as string;
    const postId = postUrn.split(':').pop();

    // Actualizar en DB
    await prisma.contentPiece.update({
      where: { id: content.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        externalId: postId,
      },
    });

    return {
      success: true,
      externalId: postId,
      url: `https://www.linkedin.com/feed/update/${postUrn}`,
    };
  } catch (error: any) {
    await prisma.contentPiece.update({
      where: { id: content.id },
      data: { status: 'FAILED' },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Publicar en Facebook (página)
 * Docs: https://developers.facebook.com/docs/graph-api/reference/v18.0/page/feed
 */
async function publishFacebook(content: ContentPiece, token: string): Promise<PublishResult> {
  try {
    // Obtener páginas del usuario
    const pagesRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`
    );

    if (!pagesRes.ok) throw new Error('Token de Facebook inválido');

    const pages: any = await pagesRes.json();
    if (!pages.data?.length) throw new Error('No se encontraron páginas');

    const page = pages.data[0];

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.body,
          access_token: page.access_token,
        }),
      }
    );

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error?.message || 'Error de Facebook');
    }

    const result: any = await response.json();

    await prisma.contentPiece.update({
      where: { id: content.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        externalId: result.id,
      },
    });

    return {
      success: true,
      externalId: result.id,
      url: `https://facebook.com/${result.id}`,
    };
  } catch (error: any) {
    await prisma.contentPiece.update({
      where: { id: content.id },
      data: { status: 'FAILED' },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Publicar en Instagram (Reels/Posts)
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
async function publishInstagram(content: ContentPiece, token: string): Promise<PublishResult> {
  // Instagram requiere media (imagen/video) para publicar
  // Placeholder: se implementaría con media upload
  return {
    success: false,
    error: 'Instagram requiere media upload (implementación pendiente)',
  };
}

/**
 * Publicar en X (Twitter)
 * Docs: https://developer.twitter.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
 */
async function publishX(content: ContentPiece, token: string): Promise<PublishResult> {
  try {
    // X API v2
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content.body.slice(0, 280), // X tiene límite de 280 chars
      }),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.detail || 'Error de X');
    }

    const result: any = await response.json();

    await prisma.contentPiece.update({
      where: { id: content.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        externalId: result.data?.id,
      },
    });

    return {
      success: true,
      externalId: result.data?.id,
      url: `https://twitter.com/i/web/status/${result.data?.id}`,
    };
  } catch (error: any) {
    await prisma.contentPiece.update({
      where: { id: content.id },
      data: { status: 'FAILED' },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Publicar en TikTok
 * Docs: https://developers.tiktok.com/doc/video-kit-web-video-kit-with-login-kit
 */
async function publishTikTok(content: ContentPiece, token: string): Promise<PublishResult> {
  // TikTok requiere video para publicar
  return {
    success: false,
    error: 'TikTok requiere video upload (implementación pendiente)',
  };
}

/**
 * Publica todo el contenido programado para ahora
 */
export async function publishScheduled(): Promise<{ published: number; failed: number }> {
  const now = new Date();

  const scheduled = await prisma.contentPiece.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
    include: {
      software: { include: { growthConfig: true } },
    },
  });

  let published = 0;
  let failed = 0;

  for (const content of scheduled) {
    const config = content.software.growthConfig;
    if (!config) continue;

    const tokenMap: Record<string, string | null | undefined> = {
      LINKEDIN: config.linkedInToken,
      FACEBOOK: config.facebookToken,
      INSTAGRAM: config.instagramToken,
      X: config.xToken,
      TIKTOK: config.tiktokToken,
    };

    const token = content.platform ? tokenMap[content.platform] : null;

    if (!token) {
      failed++;
      continue;
    }

    const result = await publishPost(content, token);

    if (result.success) {
      published++;
    } else {
      failed++;
    }
  }

  return { published, failed };
}

/**
 * Sincroniza métricas de posts publicados desde las APIs de redes sociales
 */
export async function syncMetrics(): Promise<void> {
  const published = await prisma.contentPiece.findMany({
    where: {
      status: 'PUBLISHED',
      externalId: { not: null },
      publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: {
      software: { include: { growthConfig: true } },
    },
  });

  for (const content of published) {
    if (!content.platform || !content.externalId) continue;

    // En producción: llamar a la API de cada plataforma
    // para obtener métricas actualizadas
    // Esto es un placeholder

    console.log(`[SocialPublisher] Sync metrics for ${content.platform} post ${content.externalId}`);
  }
}

export default {
  publishPost,
  publishScheduled,
  syncMetrics,
};
