import OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION!,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET_NAME!,
});

export async function listObjects(prefix?: string) {
  const result = await client.list({
    prefix: prefix || '',
    'max-keys': 1000,
  });
  return result.objects || [];
}

export async function uploadFile(key: string, data: Buffer | string, options?: { mime?: string }) {
  const result = await client.put(key, data, {
    mime: options?.mime,
  });
  return result;
}

export async function deleteObject(key: string) {
  await client.delete(key);
}

export async function generateSignedUrl(key: string, expires: number = 3600) {
  const url = client.signatureUrl(key, {
    expires,
    response: {
      'content-disposition': `attachment; filename="${encodeURIComponent(key.split('/').pop() || key)}"`,
    },
  });
  return url.replace('http://', 'https://');
}

export async function generatePreviewUrl(key: string, expires: number = 3600) {
  const url = client.signatureUrl(key, {
    expires,
  });
  return url.replace('http://', 'https://');
}

export async function getObjectMeta(key: string) {
  const result = await client.head(key);
  return result;
}

export { client };