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
  // If data is a string, convert to Buffer (ali-oss treats string as file path)
  const content = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const result = await client.put(key, content, {
    mime: options?.mime,
  });
  return result;
}

export async function copyObject(sourceKey: string, targetKey: string) {
  await (client as any).copy(targetKey, sourceKey);
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

export function generatePermanentUrl(key: string) {
  const bucket = process.env.OSS_BUCKET_NAME!;
  const region = process.env.OSS_REGION!;
  return `https://${bucket}.oss-${region}.aliyuncs.com/${key}`;
}

export async function generateThumbnailUrl(key: string, width: number = 200, height: number = 200, expires: number = 3600) {
  const url = client.signatureUrl(key, {
    expires,
    process: `image/resize,m_fill,w_${width},h_${height}`,
  });
  return url.replace('http://', 'https://');
}

export async function getObjectMeta(key: string) {
  const result = await client.head(key);
  return result;
}

export async function listObjectsByPrefix(prefix: string) {
  const result = await client.list({
    prefix,
    'max-keys': 1000,
  });
  return result.objects || [];
}

export async function copyAndDeletePrefix(oldPrefix: string, newPrefix: string) {
  const objects = await listObjectsByPrefix(oldPrefix);
  for (const obj of objects) {
    const relativePath = obj.name.slice(oldPrefix.length);
    const newKey = newPrefix + relativePath;
    await copyObject(obj.name, newKey);
  }
  for (const obj of objects) {
    await deleteObject(obj.name);
  }
}

export async function getObjectContent(key: string): Promise<string> {
  const result = await (client as any).get(key);
  return result.content.toString('utf-8');
}

export { client };