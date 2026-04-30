import { v4 as uuidv4 } from 'uuid';
import { insertShare, getShareByCode, deleteShare, incrementViewCount } from './db';
import { generateSignedUrl } from './oss';

export function createShareCode(): string {
  return uuidv4().split('-').slice(0, 2).join('');
}

export async function createShare(options: {
  file_id: string;
  is_password_protected: boolean;
  password: string | null;
  expires_hours: number;
}) {
  const id = uuidv4();
  const shareCode = createShareCode();
  const expiresAt = new Date(Date.now() + options.expires_hours * 3600 * 1000).toISOString();

  await insertShare({
    id,
    file_id: options.file_id,
    share_code: shareCode,
    is_password_protected: options.is_password_protected,
    password: options.password,
    expires_at: expiresAt,
  });

  return { id, shareCode, expiresAt };
}

export async function getShareInfo(code: string) {
  const share = await getShareByCode(code);
  if (!share) return null;

  const now = new Date();
  const expiresAt = new Date(share.expires_at);
  if (now > expiresAt) {
    await deleteShare(share.id);
    return null;
  }

  await incrementViewCount(code);
  return share;
}

export async function getShareDownloadUrl(ossKey: string) {
  return generateSignedUrl(ossKey, 3600);
}
