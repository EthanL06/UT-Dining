import { promises as fs } from 'node:fs';
import path from 'node:path';
import { log } from '@/lib/log';

export async function getMarkdownContent(filename: string) {
  const filePath = path.join(process.cwd(), 'content', filename);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    log.error(`Error reading markdown file: ${filename}`, error);
    return '';
  }
}
