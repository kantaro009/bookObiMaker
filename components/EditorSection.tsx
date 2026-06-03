import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Download, Type, Palette, Layout, Settings2, Sparkles, BoxSelect, ShoppingCart, Share2 } from 'lucide-react';
import { Button } from './Button';
import { Book, ObiStyle, ObiContent, TextConfig } from '../types';
import { toIsbn10 } from '../utils/isbnUtils';
import { expandImageCandidates } from '../services/imageUtils';

interface EditorSectionProps {
  book: Book;
  onBack: () => void;
}

const DEFAULT_STYLE: ObiStyle = {
  backgroundColor: '#FFD700', // Classic Yellow
  heightPercent: 30,
  opacity: 1,
  texture: true, 
  bulgePosition: 'right', // Default to right wrapping
  mainConfig: { size: 100, angle: 0, color: '#000000', fontFamily: 'serif' },
  subConfig: { size: 100, angle: 0, color: '#000000', fontFamily: 'serif' },
  catchphraseConfig: { size: 100, angle: 0, color: '#000000', fontFamily: 'sans' },
};

const DEFAULT_CONTENT: ObiContent = {
  mainText: 'ここにメインコピーが入ります\n改行も可能です',
  subText: 'ここに補足説明や推薦文が入ります。',
  catchphrase: '大絶賛発売中！',
};

const PALETTES = [
  { bg: '#FFD700', text: '#000000', name: '定番イエロー' },
  { bg: '#E60033', text: '#FFFFFF', name: '衝撃レッド' },
  { bg: '#1A1A1A', text: '#FFFFFF', name: '重厚ブラック' },
  { bg: '#FFFFFF', text: '#000000', name: '純白シンプル' },
  { bg: '#0067C0', text: '#FFFFFF', name: '知性ブルー' },
  { bg: '#8FBC8F', text: '#1A1A1A', name: '自然グリーン' },
  { bg: '#F5F5F5', text: '#333333', name: 'クラフト紙風' },
];

// Generate a subtle noise pattern for paper texture
const createPaperPattern = (ctx: CanvasRenderingContext2D) => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const pCtx = canvas.getContext('2d');
  if (!pCtx) return null;

  const imageData = pCtx.createImageData(size, size);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Generate grayscale noise
    const val = Math.floor(Math.random() * 255);
    data[i] = val;     // R
    data[i + 1] = val; // G
    data[i + 2] = val; // B
    data[i + 3] = 20;  // Alpha (Low opacity)
  }

  pCtx.putImageData(imageData, 0, 0);
  return ctx.createPattern(canvas, 'repeat');
};

// Reusable component for text settings
const TextControl = ({ 
  label, 
  value, 
  onChangeValue, 
  config, 
  onChangeConfig,
  isTextArea = false 
}: { 
  label: string, 
  value: string, 
  onChangeValue: (val: string) => void,
  config: TextConfig,
  onChangeConfig: (cfg: TextConfig) => void,
  isTextArea?: boolean
}) => (
  <div className="bg-brand-50 p-4 rounded-lg border border-brand-100">
    <div className="flex justify-between items-center mb-2">
      <label className="text-sm font-bold text-brand-800">{label}</label>
      <div className="flex items-center gap-2">
         <div className="flex rounded-md bg-white border border-brand-200 p-0.5">
            <button 
                onClick={() => onChangeConfig({...config, fontFamily: 'serif'})}
                className={`px-2 py-0.5 text-[10px] rounded-sm transition-all ${config.fontFamily === 'serif' ? 'bg-brand-100 text-brand-900 font-bold' : 'text-brand-400'}`}
            >
                明朝
            </button>
            <button 
                onClick={() => onChangeConfig({...config, fontFamily: 'sans'})}
                className={`px-2 py-0.5 text-[10px] rounded-sm transition-all ${config.fontFamily === 'sans' ? 'bg-brand-100 text-brand-900 font-bold' : 'text-brand-400'}`}
            >
                ゴシック
            </button>
         </div>
         <input 
            type="color" 
            value={config.color}
            onChange={(e) => onChangeConfig({...config, color: e.target.value})}
            className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
            title="文字色"
        />
      </div>
    </div>
    {isTextArea ? (
      <textarea 
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        rows={3}
        className="w-full p-2 border border-brand-200 rounded focus:border-brand-500 outline-none resize-y bg-white text-brand-900 text-sm mb-3"
      />
    ) : (
      <input 
        type="text" 
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full p-2 border border-brand-200 rounded focus:border-brand-500 outline-none bg-white text-brand-900 text-sm mb-3"
      />
    )}
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-brand-500 block mb-1">サイズ ({config.size}%)</label>
        <input 
          type="range" 
          min="50" 
          max="200" 
          value={config.size} 
          onChange={(e) => onChangeConfig({...config, size: Number(e.target.value)})}
          className="w-full accent-brand-600 h-1 bg-brand-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div>
        <label className="text-xs text-brand-500 block mb-1">角度 ({config.angle}°)</label>
        <input 
          type="range" 
          min="-45" 
          max="45" 
          value={config.angle} 
          onChange={(e) => onChangeConfig({...config, angle: Number(e.target.value)})}
          className="w-full accent-brand-600 h-1 bg-brand-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  </div>
);

export const EditorSection: React.FC<EditorSectionProps> = ({ book, onBack }) => {
  const [content, setContent] = useState<ObiContent>(DEFAULT_CONTENT);
  const [style, setStyle] = useState<ObiStyle>(DEFAULT_STYLE);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setUploadUrl(null);
    setUploadName(null);
    setLoadError(false);
  }, [book.isbn, book.title]);

  useEffect(() => {
    return () => {
      if (uploadUrl) {
        URL.revokeObjectURL(uploadUrl);
      }
    };
  }, [uploadUrl]);

  useEffect(() => {
    const candidates = uploadUrl
      ? [uploadUrl]
      : expandImageCandidates([book.imageUrl, ...(book.coverCandidates || [])]);

    if (candidates.length === 0) {
      setImgElement(null);
      setLoadError(true);
      return;
    }

    let isCancelled = false;
    const tryLoad = (index: number) => {
      if (isCancelled) return;
      const sourceUrl = candidates[index];
      if (!sourceUrl) {
        setImgElement(null);
        setLoadError(true);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceUrl;
      img.onload = () => {
        if (isCancelled) return;
        setLoadError(false);
        setImgElement(img);
      };
      img.onerror = () => {
        if (isCancelled) return;
        if (index + 1 < candidates.length) {
          tryLoad(index + 1);
          return;
        }
        setImgElement(null);
        setLoadError(true);
      };
    };

    tryLoad(0);
    return () => {
      isCancelled = true;
    };
  }, [book.imageUrl, book.coverCandidates, uploadUrl]);

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadUrl(url);
    setUploadName(file.name);
    setLoadError(false);
  };

  // Helper to draw rotated multiline text
  const drawText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    centerY: number,
    config: TextConfig,
    baseSize: number,
    maxWidth: number,
    isBold: boolean = false
  ) => {
    if (!text) return;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((config.angle * Math.PI) / 180);

    const fontSize = baseSize * (config.size / 100);
    const fontFamily = config.fontFamily === 'serif' ? '"Shippori Mincho", serif' : '"Noto Sans JP", sans-serif';
    ctx.font = `${isBold ? 'bold' : ''} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = config.color;
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.15; 
    const totalHeight = lines.length * lineHeight;
    
    const startY = -(totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + (i * lineHeight), maxWidth);
    });

    ctx.restore();
  };

  // Draw Canvas
  useEffect(() => {
    if (!canvasRef.current || !imgElement) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600; 
    const aspectRatio = imgElement.naturalHeight / imgElement.naturalWidth || 1.5;
    const height = width * aspectRatio;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw Book Cover
    ctx.drawImage(imgElement, 0, 0, width, height);

    // Calculate Obi Metrics
    const obiHeight = height * (style.heightPercent / 100);
    const drawY = height - obiHeight;

    // 2. Draw Shadow (Depth behind the obi)
    if (style.texture) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = -4;
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(-10, drawY, width + 20, obiHeight);
        ctx.restore();
    }

    // 3. Draw Obi Background
    ctx.globalAlpha = style.opacity;
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, drawY, width, obiHeight);
    
    // 4. Draw Paper Texture
    if (style.texture) {
        const pattern = createPaperPattern(ctx);
        if (pattern) {
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = pattern;
            ctx.fillRect(0, drawY, width, obiHeight);
            ctx.restore();
        }
    }

    // 5. Draw Bulge/Wrap Effect (Gradient)
    if (style.bulgePosition !== 'none') {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over'; // Ensure it draws normally on top
        
        const gradientWidth = width * 0.12; // Width of the gradient effect
        const isLeft = style.bulgePosition === 'left';
        
        // Define Gradient: Edge (Dark) -> Curve (Light) -> Flat (Transparent)
        const xStart = isLeft ? 0 : width;
        const xEnd = isLeft ? gradientWidth : width - gradientWidth;
        
        const gradient = ctx.createLinearGradient(xStart, 0, xEnd, 0);
        
        // 0.0 is the edge of the book
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)'); // Shadow where it wraps
        gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.15)'); // Specular highlight on the curve
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade to normal

        ctx.fillStyle = gradient;
        // Draw only on the selected side
        if (isLeft) {
            ctx.fillRect(0, drawY, gradientWidth, obiHeight);
        } else {
            ctx.fillRect(width - gradientWidth, drawY, gradientWidth, obiHeight);
        }
        
        ctx.restore();
    }
    
    ctx.globalAlpha = 1.0;

    // 6. Draw Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const padding = 20;
    const contentAreaHeight = obiHeight - (padding * 2);
    
    const catchphraseY = drawY + padding + (contentAreaHeight * 0.15);
    const mainY = drawY + (obiHeight / 2);
    const subY = drawY + obiHeight - padding - (contentAreaHeight * 0.1);

    const safeWidth = width * 0.9;

    const baseCatchSize = width * 0.038;
    drawText(ctx, content.catchphrase, width / 2, catchphraseY, style.catchphraseConfig, baseCatchSize, safeWidth, true);

    const baseMainSize = width * 0.075;
    drawText(ctx, content.mainText, width / 2, mainY, style.mainConfig, baseMainSize, safeWidth, true);

    const baseSubSize = width * 0.032;
    drawText(ctx, content.subText, width / 2, subY, style.subConfig, baseSubSize, safeWidth, false);

    try {
        setCanvasUrl(canvas.toDataURL('image/png'));
    } catch (e) {
        console.error("Canvas export failed", e);
        setCanvasUrl(null);
    }

  }, [content, style, imgElement]);

  const applyPalette = (palette: typeof PALETTES[0]) => {
      setStyle({
          ...style,
          backgroundColor: palette.bg,
          mainConfig: { ...style.mainConfig, color: palette.text },
          subConfig: { ...style.subConfig, color: palette.text },
          catchphraseConfig: { ...style.catchphraseConfig, color: palette.text },
      });
  };

  const handleDownload = () => {
    if (canvasUrl) {
      const link = document.createElement('a');
      link.download = book.isbn ? `book-obi-${book.isbn}.png` : 'book-obi.png';
      link.href = canvasUrl;
      link.click();
    } else {
      alert("画像の生成に失敗しました。");
    }
  };

  const getAmazonUrl = (isbn: string) => {
      if (!isbn) return null;
      const isbn10 = toIsbn10(isbn);
      if (isbn10) {
          return `https://www.amazon.co.jp/dp/${isbn10}`;
      }
      return `https://www.amazon.co.jp/s?k=${isbn}`;
  };

  const handleShareX = async () => {
    const amazonUrl = getAmazonUrl(book.isbn);
    const appUrl = "https://kantaro009.github.io/bookObiMaker/";
      const text = `「${book.title}」の帯を作ってみました！\n\n${appUrl}\n\n${amazonUrl}\n\n#bookObiMaker #${book.title}`;
      
      try {
        // Try Web Share API (Mobile Support for Images)
        if (canvasUrl && navigator.share) {
             const blob = await (await fetch(canvasUrl)).blob();
             const file = new File([blob], "book-obi.png", { type: "image/png" });
             
             if (navigator.canShare({ files: [file] })) {
                 await navigator.share({
                     text: text,
                     files: [file],
                 });
                 return; // Shared successfully with image
             }
        }
      } catch (error) {
        console.warn("Share API not supported or cancelled", error);
        // Continue to fallback
      }

      // Fallback: Text only intent (Desktop)
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      alert("PCなどのブラウザからは画像を直接シェアできません。\n「保存」した画像を、開いた投稿画面に貼り付けてください。");
  };

  const amazonUrl = book.isbn ? getAmazonUrl(book.isbn) : null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-8">
      {/* Left: Preview */}
      <div className="lg:w-1/2 flex flex-col items-center">
        <div className="bg-white/50 p-6 rounded-xl shadow-inner w-full flex justify-center border border-brand-100 mb-4 backdrop-blur-sm sticky top-24">
          <canvas 
            ref={canvasRef} 
            className="max-w-full h-auto shadow-2xl rounded-sm"
            style={{ maxHeight: '75vh' }}
          />
          {!imgElement && !loadError && (book.imageUrl || uploadUrl) && (
            <div className="text-brand-400 animate-pulse">読み込み中...</div>
          )}
          {!imgElement && loadError && (
            <div className="text-brand-400">書影がありません</div>
          )}
        </div>

        {!imgElement && (
          <div className="w-full max-w-md bg-white rounded-lg border border-brand-100 p-3 text-xs text-brand-600 mb-3">
            <p className="font-bold text-brand-800 text-sm mb-1">画像アップロード</p>
            <p className="mb-2">書影が取得できない場合は画像をアップロードできます。</p>
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-brand-600 text-white text-xs font-bold rounded-md cursor-pointer hover:bg-brand-700 transition-colors">
              ファイルを選択
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
            </label>
            <p className="mt-2 text-[10px] text-brand-500">
              {uploadName ? `選択中: ${uploadName}` : '未選択'}
            </p>
          </div>
        )}

        <div className="w-full max-w-md bg-white rounded-lg border border-brand-100 p-3 text-xs text-brand-600 mb-3">
          <p className="font-bold text-brand-800 text-sm mb-1">{book.title}</p>
          <p className="mb-1">{book.author}</p>
          {book.isbn && <p>ISBN: {book.isbn}</p>}
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-md">
            <div className="flex gap-4 w-full justify-center">
                <Button variant="outline" onClick={onBack} className="flex-1">
                    <ArrowLeft size={16} />
                    戻る
                </Button>
                <Button variant="primary" onClick={handleDownload} disabled={!canvasUrl} className="flex-1">
                    <Download size={16} />
                    保存
                </Button>
            </div>
            
            <div className="flex gap-3 w-full justify-center">
                {amazonUrl && (
                    <a 
                        href={amazonUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <ShoppingCart size={16} />
                        Amazon
                    </a>
                )}
                <button 
                    onClick={handleShareX}
                    className="flex-1 bg-black hover:bg-gray-800 text-white text-sm font-bold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    <Share2 size={16} />
                    Xでシェア
                </button>
            </div>
        </div>

        {!canvasUrl && imgElement && (
            <p className="text-xs text-red-400 mt-2 text-center">
               画像生成エラー：ブラウザの制限により保存できません。
            </p>
        )}
      </div>

      {/* Right: Controls */}
      <div className="lg:w-1/2 flex flex-col gap-6 h-fit">
        
        {/* Global Style Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
             <div className="p-4 bg-brand-50/50 border-b border-brand-100">
                <h3 className="font-bold text-brand-800 flex items-center gap-2">
                    <Palette size={18} />
                    全体デザイン
                </h3>
             </div>
             <div className="p-4 space-y-5">
                {/* Colors */}
                <div>
                    <label className="text-xs font-bold text-brand-500 mb-2 block">カラーテーマ</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {PALETTES.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => applyPalette(p)}
                                className={`w-8 h-8 rounded-full border-2 shadow-sm transition-transform ${style.backgroundColor === p.bg ? 'border-brand-800 scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: p.bg }}
                                title={p.name}
                            />
                        ))}
                    </div>
                    <div className="flex gap-4 items-center">
                         <div className="flex items-center gap-2">
                             <span className="text-xs text-brand-400">背景</span>
                             <input 
                                type="color" 
                                value={style.backgroundColor}
                                onChange={(e) => setStyle({...style, backgroundColor: e.target.value})}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                            />
                         </div>
                    </div>
                </div>

                {/* Texture & Bulge Control */}
                <div className="space-y-3 bg-brand-50 p-3 rounded-lg border border-brand-100">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-brand-800 flex items-center gap-2">
                            <Sparkles size={14} className="text-brand-500" />
                            紙の質感
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={style.texture}
                                onChange={(e) => setStyle({...style, texture: e.target.checked})}
                            />
                            <div className="w-9 h-5 bg-brand-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                        </label>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold text-brand-800 flex items-center gap-2 mb-1.5">
                            <BoxSelect size={14} className="text-brand-500" />
                            巻きつけ立体感（膨らみ）
                        </label>
                        <div className="flex rounded-md bg-white border border-brand-200 p-0.5">
                            {(['none', 'left', 'right'] as const).map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => setStyle({...style, bulgePosition: pos})}
                                    className={`flex-1 text-[10px] py-1 rounded transition-all ${style.bulgePosition === pos ? 'bg-brand-100 text-brand-900 font-bold shadow-sm' : 'text-brand-400 hover:text-brand-600'}`}
                                >
                                    {pos === 'none' ? 'なし' : pos === 'left' ? '左側' : '右側'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Height */}
                <div>
                        <label className="block text-xs font-bold text-brand-500 mb-2">帯の高さ ({style.heightPercent}%)</label>
                        <input 
                        type="range" 
                        min="15" 
                        max="60" 
                        value={style.heightPercent}
                        onChange={(e) => setStyle({...style, heightPercent: Number(e.target.value)})}
                        className="w-full accent-brand-600 h-1 bg-brand-200 rounded-lg appearance-none cursor-pointer"
                        />
                </div>
             </div>
        </div>

        {/* Text Elements */}
        <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
             <div className="p-4 bg-brand-50/50 border-b border-brand-100">
                <h3 className="font-bold text-brand-800 flex items-center gap-2">
                    <Type size={18} />
                    文字の編集
                </h3>
             </div>
             <div className="p-4 space-y-4">
                <TextControl 
                    label="メインコピー"
                    value={content.mainText}
                    onChangeValue={(v) => setContent({...content, mainText: v})}
                    config={style.mainConfig}
                    onChangeConfig={(cfg) => setStyle({...style, mainConfig: cfg})}
                    isTextArea={true}
                />
                
                <TextControl 
                    label="あおり文・実績"
                    value={content.catchphrase}
                    onChangeValue={(v) => setContent({...content, catchphrase: v})}
                    config={style.catchphraseConfig}
                    onChangeConfig={(cfg) => setStyle({...style, catchphraseConfig: cfg})}
                />

                <TextControl 
                    label="サブテキスト・推薦文"
                    value={content.subText}
                    onChangeValue={(v) => setContent({...content, subText: v})}
                    config={style.subConfig}
                    onChangeConfig={(cfg) => setStyle({...style, subConfig: cfg})}
                    isTextArea={true}
                />
             </div>
        </div>

      </div>
    </div>
  );
};