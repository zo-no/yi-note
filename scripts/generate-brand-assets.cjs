#!/usr/bin/env node
'use strict';

// No package installation is needed. Use the existing sharp if it loads;
// otherwise macOS Swift/AppKit renders the same checked-in SVG sources.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const absolute = relative => path.join(root, relative);
const checkOnly = process.argv.includes('--check');
assert(
  process.argv.slice(2).every(arg => arg === '--check'),
  'Usage: node scripts/generate-brand-assets.cjs [--check]'
);
const sentinel = 'packages/extension/installed.png';
const sentinelHash =
  '8a8fadfdebcc65982f3ec100c3ef0c3e23f0ebe1c2475b075875afd9f44e352e';
const hash = data =>
  crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
const outputs = [
  ['assets/logo.png', 'assets/wildframe-icon.svg', 512, 512],
  [
    'packages/extension/icons/icon-16.png',
    'assets/wildframe-icon-small.svg',
    16,
    16
  ],
  [
    'packages/extension/icons/icon-48.png',
    'assets/wildframe-icon-small.svg',
    48,
    48
  ],
  [
    'packages/extension/icons/icon-128.png',
    'assets/wildframe-icon.svg',
    128,
    128
  ],
  [
    'packages/landing/static/images/logo.png',
    'assets/wildframe-icon.svg',
    128,
    128
  ],
  // Gatsby's manifest plugin needs a large square input, not the old 16px PNG.
  [
    'packages/landing/static/images/favicon.png',
    'assets/wildframe-icon.svg',
    512,
    512
  ],
  ['assets/hero.png', 'assets/wildframe-hero.svg', 1200, 640],
  [
    'packages/landing/static/images/hero.png',
    'assets/wildframe-hero.svg',
    1200,
    640
  ]
];
const icoPath = 'packages/playground/favicon.ico';
const icoSizes = [16, 32, 48, 256];
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer)
    value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

// Decode and checksum the actual pixels, rather than checking only a PNG header.
// Both supported renderers emit non-interlaced 8-bit RGB/RGBA PNGs.
function decodePNG(buffer) {
  assert(buffer.subarray(0, 8).equals(pngSignature), 'Invalid PNG signature');
  let width,
    height,
    channels,
    ended = false;
  let offset = 8;
  const idat = [];
  while (offset < buffer.length) {
    assert(offset + 12 <= buffer.length, 'Truncated PNG chunk');
    const length = buffer.readUInt32BE(offset);
    const end = offset + 12 + length;
    assert(end <= buffer.length, 'Truncated PNG data');
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, end - 4);
    assert.strictEqual(
      crc32(buffer.subarray(offset + 4, end - 4)),
      buffer.readUInt32BE(end - 4),
      `Bad ${type} CRC`
    );
    if (offset === 8) assert.strictEqual(type, 'IHDR');
    if (type === 'IHDR') {
      assert.strictEqual(length, 13);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert(
        width > 0 && height > 0 && width * height <= 20000000,
        'Unexpected PNG dimensions'
      );
      assert.strictEqual(data[8], 8, 'Expected 8-bit PNG');
      channels = { 2: 3, 6: 4 }[data[9]];
      assert(channels, 'Expected RGB or RGBA PNG');
      assert(
        data[10] === 0 && data[11] === 0 && data[12] === 0,
        'Unsupported PNG encoding'
      );
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      assert.strictEqual(length, 0);
      ended = true;
      offset = end;
      break;
    }
    offset = end;
  }
  assert(ended && offset === buffer.length && idat.length, 'Incomplete PNG');
  const stride = width * channels;
  const scanlines = zlib.inflateSync(Buffer.concat(idat), {
    maxOutputLength: (stride + 1) * height
  });
  assert.strictEqual(scanlines.length, (stride + 1) * height);
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = scanlines[y * (stride + 1)];
    assert(filter <= 4, 'Invalid PNG row filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= channels ? pixels[index - channels] : 0;
      const up = y ? pixels[index - stride] : 0;
      const corner = y && x >= channels ? pixels[index - stride - channels] : 0;
      const prediction = [
        0,
        left,
        up,
        Math.floor((left + up) / 2),
        paeth(left, up, corner)
      ][filter];
      pixels[index] = (scanlines[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = pixels[i * channels];
    rgba[i * 4 + 1] = pixels[i * channels + 1];
    rgba[i * 4 + 2] = pixels[i * channels + 2];
    rgba[i * 4 + 3] = channels === 4 ? pixels[i * channels + 3] : 255;
  }
  return { width, height, rgba };
}

function pngAt(file, width, height) {
  const image = decodePNG(fs.readFileSync(file));
  assert.strictEqual(image.width, width, `${file}: width`);
  assert.strictEqual(image.height, height, `${file}: height`);
  assert(
    image.rgba.some((value, index) => index % 4 === 3 && value > 0),
    `${file}: blank image`
  );
  return image;
}

// Small frames use conventional 32-bit DIBs + AND masks; 256px uses PNG.
// This is a real ICO directory, not a PNG renamed to .ico.
function dibFromPNG(png) {
  const { width, height, rgba } = decodePNG(png);
  const maskStride = Math.ceil(width / 32) * 4;
  const pixelBytes = width * height * 4;
  const dib = Buffer.alloc(40 + pixelBytes + maskStride * height);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(width, 4);
  dib.writeInt32LE(height * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(pixelBytes + maskStride * height, 20);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4;
      const bottomRow = height - 1 - y;
      const target = 40 + (bottomRow * width + x) * 4;
      dib[target] = rgba[source + 2];
      dib[target + 1] = rgba[source + 1];
      dib[target + 2] = rgba[source];
      dib[target + 3] = rgba[source + 3];
      if (rgba[source + 3] === 0)
        dib[40 + pixelBytes + bottomRow * maskStride + (x >> 3)] |=
          0x80 >> (x & 7);
    }
  }
  return dib;
}

function makeICO(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  const payloads = frames.map(({ size, png }, index) => {
    const entry = 6 + index * 16;
    const payload = size === 256 ? png : dibFromPNG(png);
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(payload.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += payload.length;
    return payload;
  });
  return Buffer.concat([header, ...payloads]);
}

function validateICO(buffer) {
  assert.strictEqual(buffer.readUInt16LE(0), 0);
  assert.strictEqual(buffer.readUInt16LE(2), 1, 'Not an ICO');
  assert.strictEqual(buffer.readUInt16LE(4), icoSizes.length);
  let expectedOffset = 6 + icoSizes.length * 16;
  for (let index = 0; index < icoSizes.length; index++) {
    const entry = 6 + index * 16;
    const width = buffer[entry] || 256;
    const height = buffer[entry + 1] || 256;
    assert(
      width === icoSizes[index] && height === width,
      'Wrong ICO dimensions'
    );
    assert(buffer[entry + 2] === 0 && buffer[entry + 3] === 0);
    assert.strictEqual(buffer.readUInt16LE(entry + 4), 1);
    assert.strictEqual(buffer.readUInt16LE(entry + 6), 32);
    const length = buffer.readUInt32LE(entry + 8);
    const offset = buffer.readUInt32LE(entry + 12);
    assert.strictEqual(
      offset,
      expectedOffset,
      'ICO frames overlap or have gaps'
    );
    assert(offset + length <= buffer.length, 'Truncated ICO frame');
    const payload = buffer.subarray(offset, offset + length);
    if (width === 256) {
      const image = decodePNG(payload);
      assert(image.width === width && image.height === height);
    } else {
      assert.strictEqual(payload.readUInt32LE(0), 40);
      assert.strictEqual(payload.readInt32LE(4), width);
      assert.strictEqual(payload.readInt32LE(8), height * 2);
      assert.strictEqual(payload.readUInt16LE(12), 1);
      assert.strictEqual(payload.readUInt16LE(14), 32);
      assert.strictEqual(payload.readUInt32LE(16), 0);
      assert.strictEqual(
        payload.length,
        40 + width * height * 4 + Math.ceil(width / 32) * 4 * height
      );
      assert.strictEqual(payload.readUInt32LE(20), payload.length - 40);
    }
    expectedOffset += length;
  }
  assert.strictEqual(expectedOffset, buffer.length, 'Trailing ICO bytes');
}

const swiftSource = String.raw`
import AppKit
import CoreText
import ImageIO

struct RenderJob: Decodable { let source: String; let output: String; let width: Int; let height: Int }
struct Label: Decodable { let id: String; let text: String; let font: String; let size: Double; let tracking: Double }
func number(_ value: CGFloat) -> String {
    let s = String(format: "%.3f", locale: Locale(identifier: "en_US_POSIX"), Double(value))
        .replacingOccurrences(of: "\\.?0+$", with: "", options: .regularExpression)
    return s == "-0" ? "0" : s
}
func svgPath(_ path: CGPath) -> String {
    var output = ""
    path.applyWithBlock { pointer in
        let element = pointer.pointee
        let p = element.points
        func point(_ index: Int) -> String { number(p[index].x) + " " + number(p[index].y) }
        switch element.type {
        case .moveToPoint: output += "M" + point(0)
        case .addLineToPoint: output += "L" + point(0)
        case .addQuadCurveToPoint: output += "Q" + point(0) + " " + point(1)
        case .addCurveToPoint: output += "C" + point(0) + " " + point(1) + " " + point(2)
        case .closeSubpath: output += "Z"
        @unknown default: fatalError("Unsupported glyph path element")
        }
    }
    return output
}
func render(_ job: RenderJob) throws {
    guard let image = NSImage(contentsOfFile: job.source),
          let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: job.width, pixelsHigh: job.height,
              bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
              colorSpaceName: .deviceRGB, bytesPerRow: job.width * 4, bitsPerPixel: 32),
          let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot render " + job.source) }
    bitmap.size = NSSize(width: job.width, height: job.height)
    NSGraphicsContext.saveGraphicsState()
    defer { NSGraphicsContext.restoreGraphicsState() }
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    image.draw(in: NSRect(x: 0, y: 0, width: job.width, height: job.height),
               from: .zero, operation: .copy, fraction: 1)
    context.flushGraphics()
    guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
    try data.write(to: URL(fileURLWithPath: job.output))
}
let mode = CommandLine.arguments[1]
let input = CommandLine.arguments[2]
if mode == "render" {
    let jobs = try JSONDecoder().decode([RenderJob].self, from: Data(contentsOf: URL(fileURLWithPath: input)))
    for job in jobs { try autoreleasepool { try render(job) } }
} else if mode == "outline" {
    let labels = try JSONDecoder().decode([Label].self, from: Data(contentsOf: URL(fileURLWithPath: input)))
    var result: [String: String] = [:]
    for label in labels {
        let font = CTFontCreateWithName(label.font as CFString, CGFloat(label.size), nil)
        guard CTFontCopyPostScriptName(font) as String == label.font else { fatalError("Missing font: " + label.font) }
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: label.text,
            attributes: [.font: font, .kern: CGFloat(label.tracking)]))
        let outline = CGMutablePath()
        for run in CTLineGetGlyphRuns(line) as! [CTRun] {
            let count = CTRunGetGlyphCount(run)
            var glyphs = [CGGlyph](repeating: 0, count: count)
            var positions = [CGPoint](repeating: .zero, count: count)
            CTRunGetGlyphs(run, CFRange(location: 0, length: 0), &glyphs)
            CTRunGetPositions(run, CFRange(location: 0, length: 0), &positions)
            let runFont = (CTRunGetAttributes(run) as NSDictionary)[kCTFontAttributeName] as! CTFont
            for index in 0..<count {
                if let glyph = CTFontCreatePathForGlyph(runFont, glyphs[index], nil) {
                    outline.addPath(glyph, transform: CGAffineTransform(a: 1, b: 0, c: 0, d: -1,
                        tx: positions[index].x, ty: -positions[index].y))
                }
            }
        }
        result[label.id] = svgPath(outline)
    }
    print(String(data: try JSONEncoder().encode(result), encoding: .utf8)!)
} else if mode == "verify-ico" {
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: input) as CFURL, nil) else { fatalError("ICO cannot be opened") }
    let expected = [16, 32, 48, 256]
    guard CGImageSourceGetCount(source) == expected.count else { fatalError("Wrong ICO frame count") }
    var decoded: [Int] = []
    for index in 0..<expected.count {
        guard let image = CGImageSourceCreateImageAtIndex(source, index, nil), image.width == image.height else { fatalError("ICO frame cannot be decoded") }
        decoded.append(image.width)
    }
    guard decoded.sorted() == expected else { fatalError("Wrong native ICO sizes") }
    print("ImageIO independently decoded ICO frames: " + decoded.map(String.init).joined(separator: ", "))
} else { fatalError("Unknown renderer mode") }
`;

let temporary;
function runSwift(mode, input) {
  assert.strictEqual(
    process.platform,
    'darwin',
    'Swift/AppKit requires macOS. Install a compatible sharp elsewhere.'
  );
  const helper = path.join(temporary, 'render.swift');
  if (!fs.existsSync(helper)) fs.writeFileSync(helper, swiftSource);
  const result = spawnSync(
    '/usr/bin/xcrun',
    [
      'swift',
      '-module-cache-path',
      path.join(temporary, 'module-cache'),
      helper,
      mode,
      input
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024
    }
  );
  if (result.error || result.status !== 0)
    throw new Error(
      result.error ? result.error.message : result.stderr || result.stdout
    );
  return result.stdout.trim();
}

function prepareHero() {
  const file = absolute('assets/wildframe-hero.svg');
  const before = fs.readFileSync(file, 'utf8');
  const icon = fs
    .readFileSync(absolute('assets/wildframe-icon.svg'), 'utf8')
    .replace(/^[\s\S]*?<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g, '')
    .trim();
  assert(
    before.includes('<!-- brand-icon:start -->') &&
      before.includes('<!-- brand-icon:end -->'),
    'Missing hero icon markers'
  );
  let svg = before.replace(
    /<!-- brand-icon:start -->[\s\S]*?<!-- brand-icon:end -->/,
    `<!-- brand-icon:start -->\n${icon}\n    <!-- brand-icon:end -->`
  );
  const labels = [];
  const replacements = [];
  svg.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (whole, attributes, text) => {
    const values = Object.fromEntries(
      [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [
        match[1],
        match[2]
      ])
    );
    const id = String(labels.length);
    labels.push({
      id,
      text,
      font: values['font-family'],
      size: Number(values['font-size']),
      tracking: Number(values['letter-spacing'] || 0)
    });
    replacements.push({ whole, values, id, text });
    return whole;
  });
  // Checked-in hero lettering is already outlined. Swift/CoreText is needed
  // only when a designer adds new <text> elements to the SVG source.
  if (labels.length) {
    const input = path.join(temporary, 'labels.json');
    fs.writeFileSync(input, JSON.stringify(labels));
    const outlines = JSON.parse(runSwift('outline', input));
    for (const { whole, values, id, text } of replacements) {
      svg = svg.replace(
        whole,
        `<path aria-label="${text}" transform="translate(${values.x} ${values.y})" fill="${values.fill}" d="${outlines[id]}"/>`
      );
    }
  }
  if (svg !== before) fs.writeFileSync(file, svg);
}

function checkSentinel() {
  const data = fs.readFileSync(absolute(sentinel));
  assert.strictEqual(
    hash(data),
    sentinelHash,
    'The installation probe must remain byte-identical'
  );
  assert(data.subarray(0, 8).equals(pngSignature));
  assert(data.readUInt32BE(16) === 3 && data.readUInt32BE(20) === 2);
}

function validate() {
  for (const [target, , width, height] of outputs) {
    pngAt(absolute(target), width, height);
    console.log(
      `PNG OK  ${String(width).padStart(4)} x ${String(height).padEnd(
        4
      )}  ${target}`
    );
  }
  assert(
    fs
      .readFileSync(absolute('assets/hero.png'))
      .equals(
        fs.readFileSync(absolute('packages/landing/static/images/hero.png'))
      )
  );
  assert(
    !/<text\b|<image\b|<filter\b/.test(
      fs.readFileSync(absolute('assets/wildframe-hero.svg'), 'utf8')
    ),
    'Hero must be self-contained outlined vectors without raster images or shadows'
  );
  validateICO(fs.readFileSync(absolute(icoPath)));
  console.log(`ICO OK  ${icoSizes.join('/')} px  ${icoPath}`);
  if (process.platform === 'darwin')
    console.log(runSwift('verify-ico', absolute(icoPath)));
  checkSentinel();
  console.log(
    'PROBE OK  3 x 2, original transparent pixels and SHA-256 preserved'
  );
}

async function main() {
  for (const directory of [
    'assets',
    'packages/extension/icons',
    'packages/landing/static/images',
    'packages/playground'
  ]) {
    assert(
      fs.statSync(absolute(directory)).isDirectory(),
      `Missing output directory: ${directory}`
    );
  }
  checkSentinel();
  // Keep all generated helper files and compiler caches inside the allowed tree.
  temporary = fs.mkdtempSync(absolute('assets/.brand-render-'));
  try {
    if (checkOnly) return validate();
    let sharp;
    try {
      const resolved = require.resolve('sharp', {
        paths: [root, absolute('packages/landing')]
      });
      sharp = require(resolved);
      assert(sharp.format.svg.input.buffer, 'sharp has no SVG input support');
      console.log(`Renderer: sharp (${resolved})`);
    } catch (error) {
      sharp = null;
      if (process.platform !== 'darwin')
        throw new Error(
          `No working sharp and no macOS AppKit: ${error.message}`
        );
      const detail =
        error.message
          .split('\n')
          .find(line => line.startsWith('Cannot find module')) ||
        error.message.trim().split('\n')[0];
      console.log(
        `sharp unavailable (${detail}); renderer: macOS Swift/AppKit`
      );
    }
    prepareHero();
    const jobs = outputs.map(([target, source, width, height], index) => ({
      target,
      source: absolute(source),
      output: path.join(temporary, `image-${index}.png`),
      width,
      height
    }));
    const frames = icoSizes.map(size => {
      let job = jobs.find(
        candidate => candidate.width === size && candidate.height === size
      );
      if (!job) {
        job = {
          source: absolute(
            size <= 48
              ? 'assets/wildframe-icon-small.svg'
              : 'assets/wildframe-icon.svg'
          ),
          output: path.join(temporary, `ico-${size}.png`),
          width: size,
          height: size
        };
        jobs.push(job);
      }
      return { size, job };
    });
    if (sharp) {
      for (const job of jobs) {
        // Rasterize the 16-unit variant at the requested resolution before resizing.
        const density = job.source.endsWith('wildframe-icon-small.svg')
          ? 72 * Math.max(1, job.width / 16)
          : 72;
        await sharp(job.source, { density })
          .resize(job.width, job.height)
          .ensureAlpha()
          .png({ compressionLevel: 9 })
          .toFile(job.output);
      }
    } else {
      const input = path.join(temporary, 'jobs.json');
      fs.writeFileSync(input, JSON.stringify(jobs));
      runSwift('render', input);
    }
    for (const job of jobs) pngAt(job.output, job.width, job.height);
    const ico = makeICO(
      frames.map(({ size, job }) => ({
        size,
        png: fs.readFileSync(job.output)
      }))
    );
    validateICO(ico);
    const stagedICO = path.join(temporary, 'favicon.ico');
    fs.writeFileSync(stagedICO, ico);
    if (process.platform === 'darwin')
      console.log(runSwift('verify-ico', stagedICO));
    // Do not replace existing display assets until all staged images decode.
    for (const job of jobs)
      if (job.target) fs.copyFileSync(job.output, absolute(job.target));
    fs.copyFileSync(stagedICO, absolute(icoPath));
    validate();
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
