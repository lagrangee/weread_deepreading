const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// 确保目录存在
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 创建渐变背景
const createGradientBackground = (ctx, width, height) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a73e8');
  gradient.addColorStop(1, '#174ea6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

// 添加文本
const addText = (ctx, text, x, y, fontSize, color = '#ffffff') => {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px "PingFang SC"`;
  ctx.fillText(text, x, y);
};

// 生成宣传图
async function generatePromoImage(width, height, outputPath) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 创建背景
  createGradientBackground(ctx, width, height);

  // 添加标题
  const titleSize = width * 0.05;
  addText(ctx, '微信读书深度阅读助手', width * 0.1, height * 0.3, titleSize);

  // 添加特性列表
  const featureSize = width * 0.03;
  const features = [
    '✓ 智能文本解释',
    '✓ AI 内容消化',
    '✓ 兼听功能',
    '✓ 自定义 AI 模型'
  ];
  
  features.forEach((feature, index) => {
    addText(ctx, feature, width * 0.15, height * 0.45 + (index * featureSize * 1.5), featureSize);
  });

  // 保存图片
  ensureDirectoryExists(path.dirname(outputPath));
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// 生成两种尺寸的宣传图
async function generateAllPromos() {
  await generatePromoImage(440, 280, 'store/assets/promotional/small_promo.png');
  await generatePromoImage(920, 680, 'store/assets/promotional/large_promo.png');
}

generateAllPromos().catch(console.error); 