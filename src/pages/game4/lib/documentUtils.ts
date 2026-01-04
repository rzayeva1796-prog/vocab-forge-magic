import mammoth from 'mammoth';

// Simple PDF page counter using binary parsing (no worker needed)
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder('latin1').decode(bytes);
  
  // Count /Type /Page occurrences (simple method)
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  if (pageMatches) {
    return pageMatches.length;
  }
  
  // Fallback: look for /Count in page tree
  const countMatch = text.match(/\/Count\s+(\d+)/);
  if (countMatch) {
    return parseInt(countMatch[1], 10);
  }
  
  // Default fallback
  return 1;
}

// Generate a simple cover placeholder for PDF
export function generatePdfCover(title: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 200, 280);
  gradient.addColorStop(0, '#8B4513');
  gradient.addColorStop(1, '#5D3A1A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 200, 280);
  
  // PDF icon
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PDF', 100, 100);
  
  // Title
  ctx.font = '14px Arial';
  ctx.fillStyle = '#F5DEB3';
  const words = title.split(' ');
  let y = 150;
  let line = '';
  
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > 180) {
      ctx.fillText(line, 100, y);
      line = word;
      y += 20;
      if (y > 260) break;
    } else {
      line = testLine;
    }
  }
  if (line && y <= 260) {
    ctx.fillText(line, 100, y);
  }
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Word document processing
export async function getWordPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    // Estimate pages: ~3000 characters per page
    const charCount = text.length;
    const estimatedPages = Math.max(1, Math.ceil(charCount / 3000));
    
    return estimatedPages;
  } catch (error) {
    console.error('Word processing error:', error);
    return 1;
  }
}

// Generate cover for Word document
export function generateWordCover(title: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Background gradient (blue for Word)
  const gradient = ctx.createLinearGradient(0, 0, 200, 280);
  gradient.addColorStop(0, '#2B579A');
  gradient.addColorStop(1, '#1A3A6B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 200, 280);
  
  // Word icon
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WORD', 100, 100);
  
  // Title
  ctx.font = '14px Arial';
  ctx.fillStyle = '#B4D4F7';
  const words = title.split(' ');
  let y = 150;
  let line = '';
  
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > 180) {
      ctx.fillText(line, 100, y);
      line = word;
      y += 20;
      if (y > 260) break;
    } else {
      line = testLine;
    }
  }
  if (line && y <= 260) {
    ctx.fillText(line, 100, y);
  }
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileType(file: File): 'pdf' | 'word' | 'unknown' {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return 'word';
  }
  return 'unknown';
}
