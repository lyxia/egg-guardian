import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, 'icon.svg');
const publicDir = join(__dirname, '..', 'public');

// 确保public目录存在
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// 读取SVG文件
const svgBuffer = readFileSync(svgPath);

// 要生成的图标尺寸
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }
];

console.log('开始生成图标...');

// 生成每个尺寸的图标
for (const { size, name } of iconSizes) {
  const outputPath = join(publicDir, name);
  
  try {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ 已生成: ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ 生成失败 ${name}:`, error.message);
    process.exit(1);
  }
}

console.log('所有图标生成完成！');

