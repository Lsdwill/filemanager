declare module 'ali-oss' {
  interface OSSOptions {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint?: string;
    stsToken?: string;
    refreshSTSToken?: () => Promise<{ accessKeyId: string; accessKeySecret: string; stsToken: string }>;
  }

  interface ListObjectsResult {
    objects?: Array<{
      name: string;
      size: number;
      lastModified: string;
      type: string;
    }>;
    prefixes?: string[];
    nextMarker?: string;
    isTruncated?: boolean;
  }

  interface PutObjectResult {
    name: string;
    url: string;
    res: {
      status: number;
      headers: Record<string, string>;
    };
  }

  interface HeadObjectResult {
    meta: Record<string, string>;
    res: {
      status: number;
      headers: Record<string, string>;
    };
    size: number;
    type: string;
  }

  interface SignatureUrlOptions {
    expires?: number;
    response?: {
      'content-disposition'?: string;
      'content-type'?: string;
    };
    process?: string;
    signHeaders?: Record<string, string>;
    objectKey?: string;
  }

  class OSS {
    constructor(options: OSSOptions);
    list(query: { prefix?: string; 'max-keys'?: number; marker?: string }, options?: any): Promise<ListObjectsResult>;
    put(name: string, data: Buffer | string | Blob, options?: { mime?: string; meta?: Record<string, string> }): Promise<PutObjectResult>;
    delete(name: string, options?: any): Promise<{ res: { status: number } }>;
    head(name: string, options?: any): Promise<HeadObjectResult>;
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
  }

  export default OSS;
}