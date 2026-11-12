// Usage: node scripts/compare-baseline.mjs <before-dir> <after-dir> [--diff-dir <dir>]
// Compares same-named PNGs with pixelmatch and prints axe serious/critical counts per page.
// Full-page heights may differ; when they do the images are compared over the overlapping
// area and the mismatch is called out (the extra rows count as differing).
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const diffIdx = args.indexOf('--diff-dir');
const diffDir = diffIdx === -1 ? undefined : args[diffIdx + 1];
const [beforeDir, afterDir] = args.filter(
  (a, i) => !a.startsWith('--') && (diffIdx === -1 || i !== diffIdx + 1),
);
if (!beforeDir || !afterDir) {
  console.error('Usage: compare-baseline.mjs <before-dir> <after-dir> [--diff-dir <dir>]');
  process.exit(2);
}

const HEADER_PX = { desktop: 120, mobile: 90 };
const FOOTER_PX = 450;

const readPng = async (file) => PNG.sync.read(await readFile(file));

function crop(img, y0, y1) {
  const h = Math.max(0, y1 - y0);
  const out = new PNG({ width: img.width, height: h });
  PNG.bitblt(img, out, 0, y0, img.width, h, 0, 0);
  return out;
}

// Returns { diff, total } over the padded union of both images; unmatched area counts as diff.
function diffPixels(a, b, diffPng) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const pad = (img) => {
    const out = new PNG({ width, height });
    out.data.fill(255);
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
    return out;
  };
  const pa = pad(a);
  const pb = pad(b);
  const out = diffPng ? new PNG({ width, height }) : undefined;
  const diff = pixelmatch(pa.data, pb.data, out?.data, width, height, { threshold: 0.1 });
  if (diffPng) diffPng.png = out;
  return { diff, total: width * height };
}

const pct = ({ diff, total }) => (total ? ((diff / total) * 100).toFixed(2) : '0.00') + '%';

const files = (await readdir(beforeDir)).filter((f) => f.endsWith('.png')).sort();
if (diffDir) await mkdir(diffDir, { recursive: true });
console.log(
  'image'.padEnd(46),
  'size before -> after'.padEnd(26),
  'full'.padStart(8),
  'header'.padStart(8),
  'footer'.padStart(8),
);
for (const f of files) {
  let a;
  let b;
  try {
    [a, b] = [await readPng(join(beforeDir, f)), await readPng(join(afterDir, f))];
  } catch {
    console.log(f.padEnd(46), 'MISSING in', afterDir);
    continue;
  }
  const vp = f.includes('-mobile') ? 'mobile' : 'desktop';
  const sizeNote = `${a.width}x${a.height} -> ${b.width}x${b.height}`;
  const mismatch = a.width !== b.width || a.height !== b.height;
  const holder = {};
  const full = diffPixels(a, b, diffDir ? holder : undefined);
  const header = diffPixels(crop(a, 0, HEADER_PX[vp]), crop(b, 0, HEADER_PX[vp]));
  const footer = diffPixels(
    crop(a, a.height - FOOTER_PX, a.height),
    crop(b, b.height - FOOTER_PX, b.height),
  );
  console.log(
    f.padEnd(46),
    sizeNote.padEnd(26),
    pct(full).padStart(8),
    pct(header).padStart(8),
    pct(footer).padStart(8),
  );
  if (mismatch) {
    console.log(
      `  note: image size differs (${sizeNote}); full-page diff is over the padded union and counts extra rows as differing; header/footer regions are aligned to each image's own top/bottom.`,
    );
  }
  if (diffDir && holder.png) await writeFile(join(diffDir, f), PNG.sync.write(holder.png));
}

// axe serious + critical counts
try {
  const [ab, aa] = await Promise.all(
    [beforeDir, afterDir].map(async (d) => JSON.parse(await readFile(join(d, 'axe.json'), 'utf8'))),
  );
  const count = (r) => ({
    serious: r.violations.filter((v) => v.impact === 'serious').length,
    critical: r.violations.filter((v) => v.impact === 'critical').length,
  });
  console.log('\naxe serious/critical (before -> after)');
  for (const page of Object.keys(ab)) {
    for (const vp of Object.keys(ab[page])) {
      const x = count(ab[page][vp]);
      const y = aa[page]?.[vp] ? count(aa[page][vp]) : undefined;
      console.log(
        `${page} ${vp}`.padEnd(46),
        `serious ${x.serious} -> ${y?.serious ?? 'n/a'}, critical ${x.critical} -> ${y?.critical ?? 'n/a'}`,
      );
    }
  }
} catch {
  console.log('\n(no axe.json in both directories; axe comparison skipped)');
}
