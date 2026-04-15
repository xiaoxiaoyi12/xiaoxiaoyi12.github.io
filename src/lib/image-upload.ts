const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1920;
const COMPRESS_QUALITY = 0.85;

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

/**
 * 压缩图片：超过 MAX_WIDTH 时等比缩放，输出 base64 data URL。
 * SVG 和 GIF 不压缩，直接转 base64。
 */
export async function compressImage(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大支持 10MB`);
  }

  // SVG 和 GIF 不做压缩
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return fileToBase64DataUrl(file);
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= MAX_WIDTH) {
        // 无需压缩，直接返回 data URL
        resolve(fileToBase64DataUrl(file));
        URL.revokeObjectURL(img.src);
        return;
      }
      height = Math.round(height * (MAX_WIDTH / width));
      width = MAX_WIDTH;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL(file.type || 'image/png', COMPRESS_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new ImageUploadError('无法读取图片'));
    };
    img.src = URL.createObjectURL(file);
  });
}

function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 生成规范化的图片文件名：{timestamp}-{sanitized-name}.{ext}
 */
export function generateImageFilename(originalName: string): string {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop()?.toLowerCase() || 'png';
  const name = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
  return `${timestamp}-${name || 'image'}.${ext}`;
}

/**
 * 生成图片在仓库中的存储路径
 */
export function getImageStoragePath(type: string, filename: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `public/images/${type}/${month}/${filename}`;
}

/**
 * 生成图片在网站上的访问路径（保存到 Markdown 中的路径）
 */
export function getImagePublicPath(type: string, filename: string): string {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `/images/${type}/${month}/${filename}`;
}

/**
 * 从 data URL 中提取 raw base64（去掉 data:image/...;base64, 前缀）
 */
export function dataUrlToRawBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
}

/**
 * 判断 src 是否为 base64 data URL（即未上传的新图片）
 */
export function isDataUrl(src: string): boolean {
  return src.startsWith('data:');
}
